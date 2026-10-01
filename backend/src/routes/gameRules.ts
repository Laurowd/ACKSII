import { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { resolveClass, progressionFields } from '../lib/classCatalog'
import { GENERAL_PROFICIENCIES, RULE_CLASSES, SPELL_LIST, rulesFor, proficiencyBudget, proficiencyIssues, spellIssues, magicPools, readState, advancement, allocateAdventure, xpAdjustment, monsterXp } from '../lib/gameRules'
import { initialAdventuring } from '../lib/creationRules'

const integer = (max = 2147483647) => ({ type: 'integer', minimum: 0, maximum: max })
const text = { type: 'string', minLength: 1, maxLength: 160 }
const body = (properties: any, required: string[] = []) => ({ type: 'object', additionalProperties: false, properties, required })
const version = integer()
const spellSchema = body({ name: text, level: { type: 'integer', minimum: 1, maximum: 6 }, tradition: { type: 'string', enum: ['arcane','divine'] } }, ['name','level','tradition'])
const choiceSchema = body({ name:text, category:{type:'string',enum:['class','general']} },['name','category'])
export const operationError = (message: string, statusCode = 400) => Object.assign(new Error(message), { statusCode })

export async function accessibleCharacter(id: string, user: any, db: any = prisma) {
  const c = await db.character.findUnique({where:{id},include:{spells:true,proficiencies:true,domain:true}})
  if (!c) throw operationError('Ficha não encontrada.',404)
  if (c.userId !== user.id) {
    const campaign = c.campaignId && await db.campaign.findUnique({where:{id:c.campaignId}})
    if (!campaign || campaign.masterId !== user.id) throw operationError('Sem acesso a esta ficha.',403)
  }
  return c
}
export async function updateVersion(tx: any, c: any, expected: number, data: any = {}) {
  if (expected !== c.version) throw Object.assign(operationError('A ficha mudou. Atualize a prévia antes de confirmar.',409), { code: 'CHARACTER_CONFLICT' })
  const changed = await tx.character.updateMany({where:{id:c.id,version:expected},data:{...data,version:{increment:1}}})
  if (!changed.count) throw Object.assign(operationError('A ficha mudou. Atualize a prévia antes de confirmar.',409), { code: 'CHARACTER_CONFLICT' })
}
const mutationCharacter = (tx: any, id: string) => tx.character.findUniqueOrThrow({ where: { id }, include: { spells: true, proficiencies: true, weapons: true } })
const overview = (c: any, klass: any) => {
  const rules = rulesFor(klass)
  if (!rules) return { supported:false, version:c.version, reason:'Classe livre: configure a construção por pontos ou use os campos manuais.' }
  const state = readState(c.rulesState)
  return {supported:true,version:c.version, rules, budget:proficiencyBudget(rules,c.level,c.int),
    issues:[...proficiencyIssues(rules,c,c.proficiencies),...spellIssues(rules,c,c.spells)],
    magic:magicPools(rules,c), used:state.used || {}, lastRestDay:state.lastRestDay ?? null,
    next:rules.levels[c.level] || null, standardAdventuring:initialAdventuring(c.str,klass.name) }
}

export async function gameRulesRoutes(app: FastifyInstance) {
  app.addHook('preHandler',authGuard)
  app.get('/metadata', async () => ({ classes:RULE_CLASSES, generalProficiencies:GENERAL_PROFICIENCIES, spells:SPELL_LIST }))
  app.get('/characters/:id', async req => {
    const c=await accessibleCharacter((req.params as any).id,req.user)
    return overview(c,await resolveClass(c.classKey,c.campaignId,c.className))
  })

  const advancementBody=body({version,dice:{type:'array',maxItems:9,items:{type:'integer',minimum:1,maximum:12}},
    proficiencies:{type:'array',maxItems:30,items:choiceSchema}},['version','dice'])
  for(const action of ['preview','apply']) app.post(`/characters/:id/advance/${action}`,{schema:{body:advancementBody}},async req=>{
    const input=req.body as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter((req.params as any).id,req.user,tx)
      const klass=await resolveClass(c.classKey,c.campaignId,c.className)
      const rules=rulesFor(klass)
      if(!rules||!klass)throw operationError('Progressão não configurada para esta classe.')
      if(c.version!==input.version)throw operationError('A ficha mudou. Atualize a prévia.',409)
      let result
      try{result=advancement(rules,c,input.dice)}catch(e){throw operationError((e as Error).message)}
      const additions=input.proficiencies || []
      const issues=proficiencyIssues(rules,c,[...c.proficiencies,...additions],result.level)
      if(issues.length)throw operationError(issues.join(' '))
      const before=progressionFields(klass,c.level,c.wil),after=progressionFields(klass,result.level,c.wil)
      const saves:Record<string,number>={}
      for(const key of ['saveDeath','saveParalysis','saveBlast','saveImplements','saveSpells']) saves[key]=(c as any)[key]+(after as any)[key]-(before as any)[key]
      const preview={...result,title:after.title,saves,attack:JSON.parse(klass.attackThrows)[result.level-1], additions,version:c.version}
      if(action==='preview')return preview
      await updateVersion(tx,c,input.version,{level:result.level,hpMax:result.hpMax,hpCurr:result.hpCurr,hitDice:result.hitDice,xpNext:result.xpNext,title:after.title,...saves})
      await tx.weapon.updateMany({where:{characterId:c.id},data:{attackThrow:preview.attack}})
      if(additions.length)await tx.proficiency.createMany({data:additions.map((p:any)=>({...p,characterId:c.id}))})
      await tx.auditLog.create({data:{characterId:c.id,userId:(req.user as any).id,action:'LEVEL_ADVANCEMENT',details:JSON.stringify({dice:input.dice,preview})}})
      return {...preview, character: await mutationCharacter(tx,c.id)}
    }, {isolationLevel:'Serializable'})
  })

  app.post('/characters/:id/proficiencies',{schema:{body:body({version,choices:{type:'array',maxItems:30,items:choiceSchema}},['version','choices'])}},async req=>{
    const input=req.body as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter((req.params as any).id,req.user,tx)
      const rules=rulesFor(await resolveClass(c.classKey,c.campaignId,c.className))
      if(!rules)throw operationError('Use o editor manual para esta classe.')
      const issues=proficiencyIssues(rules,c,[...c.proficiencies,...input.choices])
      if(issues.length)throw operationError(issues.join(' '))
      await updateVersion(tx,c,input.version)
      await tx.proficiency.createMany({data:input.choices.map((p:any)=>({...p,characterId:c.id}))})
      return {ok:true, character: await mutationCharacter(tx, c.id), proficiencies: await tx.proficiency.findMany({ where: { characterId: c.id } })}
    }, {isolationLevel:'Serializable'})
  })

  app.post('/characters/:id/magic/repertoire',{schema:{body:body({version,spells:{type:'array',maxItems:500,items:spellSchema},orderApproved:{type:'boolean'}},['version','spells'])}},async req=>{
    const input=req.body as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter((req.params as any).id,req.user,tx)
      const rules=rulesFor(await resolveClass(c.classKey,c.campaignId,c.className))
      if(!rules)throw operationError('Magia não configurada para esta classe.')
      const issues=spellIssues(rules,c,input.spells)
      if(magicPools(rules,c).some(p=>!p.studious)&&!input.orderApproved)issues.push('Confirme com o mestre o repertório da ordem religiosa.')
      if(issues.length)throw operationError(issues.join(' '))
      await updateVersion(tx,c,input.version)
      await tx.spell.deleteMany({where:{characterId:c.id}})
      await tx.spell.createMany({data:input.spells.map((s:any)=>({...s,characterId:c.id}))})
      await tx.auditLog.create({data:{characterId:c.id,userId:(req.user as any).id,action:'REPERTOIRE_REPLACED',details:JSON.stringify({before:c.spells,after:input.spells})}})
      return {ok:true, character: await mutationCharacter(tx, c.id), spells: await tx.spell.findMany({ where: { characterId: c.id } })}
    }, {isolationLevel:'Serializable'})
  })
  app.post('/characters/:id/magic/cast',{schema:{body:body({version,spellId:text},['version','spellId'])}},async req=>{
    const input=req.body as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter((req.params as any).id,req.user,tx)
      const rules=rulesFor(await resolveClass(c.classKey,c.campaignId,c.className))
      const spell=c.spells.find((s:any)=>s.id===input.spellId)
      if(!rules||!spell)throw operationError('Escolha uma magia do repertório.')
      const issues=spellIssues(rules,c,c.spells)
      if(issues.length)throw operationError(issues.join(' '))
      const pools=magicPools(rules,c),pool=pools.find(p=>p.tradition===spell.tradition)||(pools.length===1?pools[0]:undefined)
      if(!pool)throw operationError('Defina o tipo da magia no repertório.')
      const state=readState(c.rulesState),key=`${pool.tradition}:${spell.level}`
      state.used ||= {}
      if((state.used[key]||0)>=pool.slots[spell.level-1]!)throw operationError('Não restam usos deste nível hoje.')
      state.used[key]=(state.used[key]||0)+1
      await updateVersion(tx,c,input.version,{rulesState:JSON.stringify(state)})
      await tx.auditLog.create({data:{characterId:c.id,userId:(req.user as any).id,action:'SPELL_CAST',details:JSON.stringify({name:spell.name,key})}})
      return {used:state.used, character: await mutationCharacter(tx, c.id)}
    }, {isolationLevel:'Serializable'})
  })
  app.post('/characters/:id/magic/rest',{schema:{body:body({version,day:integer(),hours:{type:'number',minimum:8,maximum:24},requirementsMet:{const:true}},['version','day','hours','requirementsMet'])}},async req=>{
    const input=req.body as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter((req.params as any).id,req.user,tx),state=readState(c.rulesState)
      if(state.lastRestDay!=null&&input.day<=state.lastRestDay)throw operationError('Já houve recuperação neste dia; avance o dia de jogo (mínimo 24 horas).')
      state.used={};state.lastRestDay=input.day
      await updateVersion(tx,c,input.version,{rulesState:JSON.stringify(state)})
      await tx.auditLog.create({data:{characterId:c.id,userId:(req.user as any).id,action:'SPELL_REST',details:JSON.stringify(input)}})
      return {ok:true, character: await mutationCharacter(tx, c.id)}
    }, {isolationLevel:'Serializable'})
  })

  app.post('/characters/:id/xp/adjust', { schema: { body: body({ version, delta: { type: 'integer', minimum: -2147483647, maximum: 2147483647 }, reason: { type: 'string', minLength: 3, maxLength: 1000 } }, ['version', 'delta', 'reason']) } }, async request => {
    const user = request.user as any, input = request.body as any
    if (user.role !== 'MASTER') throw operationError('Somente o mestre pode ajustar XP.', 403)
    if (input.reason.trim().length < 3 || input.delta === 0) throw operationError('Informe um ajuste diferente de zero e a justificativa.')
    return prisma.$transaction(async tx => {
      const character = await accessibleCharacter((request.params as any).id, user, tx)
      if (character.campaignId && (await tx.campaign.findUnique({ where: { id: character.campaignId } }))?.masterId !== user.id) throw operationError('Somente o mestre responsável pela campanha pode ajustar XP.', 403)
      const xp = character.xp + input.delta
      if (xp < 0 || xp > 2147483647) throw operationError('O XP resultante precisa estar entre zero e 2147483647.')
      await updateVersion(tx, character, input.version, { xp })
      await tx.auditLog.create({ data: { characterId: character.id, campaignId: character.campaignId, userId: user.id, action: 'XP_ADJUSTMENT', details: JSON.stringify({ reason: input.reason.trim(), delta: input.delta, before: character.xp, after: xp }) } })
      return { character: await mutationCharacter(tx, character.id) }
    }, { isolationLevel: 'Serializable' })
  })

  const adventureBody=body({awardId:text,campaignId:{type:'string',maxLength:100},treasureGp:{type:'number',minimum:0,maximum:1e9},
    monsters:{type:'array',maxItems:100,items:body({hd:integer(100),bonusHd:{type:'boolean'},abilities:integer(100),count:{type:'integer',minimum:1,maximum:10000}},['hd','abilities','count'])},
    participants:{type:'array',minItems:1,maxItems:100,items:body({id:text,version,share:{type:'number',enum:[0.5,1]}},['id','version','share'])}},['awardId','treasureGp','participants'])
  for(const action of ['preview','apply'])app.post(`/adventures/${action}`,{schema:{body:adventureBody}},async req=>{
    const input=req.body as any,user=req.user as any
    if (!input.awardId.trim()) throw operationError('Informe o identificador da aventura.')
    if (new Set(input.participants.map((p: any) => p.id)).size !== input.participants.length) throw operationError('Cada participante deve aparecer uma única vez.')
    if (user.role !== 'MASTER') throw operationError('Somente o mestre pode fechar uma aventura.', 403)
    return prisma.$transaction(async tx=>{
      const chars:any[]=[]
      if(input.campaignId){const campaign=await tx.campaign.findUnique({where:{id:input.campaignId}});if(!campaign||campaign.masterId!==user.id)throw operationError('Somente o mestre pode fechar a aventura da campanha.',403)}
      for(const p of input.participants){const c=await accessibleCharacter(p.id,user,tx);if((input.campaignId||null)!==c.campaignId)throw operationError('Todos devem pertencer à campanha escolhida.');if(c.version!==p.version)throw operationError('Uma ficha mudou; gere outra prévia.',409);chars.push(c)}
      const monsterTotal=(input.monsters||[]).reduce((sum:number,m:any)=>sum+monsterXp(m.hd,m.bonusHd||false,m.abilities)*m.count,0)
      const participants=await Promise.all(chars.map(async(c,i)=>{const k=await resolveClass(c.classKey,c.campaignId,c.className);if(!k)throw operationError('Classe não encontrada.');return {id:c.id,share:input.participants[i].share,xp:c.xp,level:c.level,thresholds:JSON.parse(k.xpPerLevel),adjustment:xpAdjustment(c,k)}}))
      let awards
      try{awards=allocateAdventure(input.treasureGp+monsterTotal,participants)}catch(e){throw operationError((e as Error).message)}
      const preview={treasureGp:input.treasureGp,monsterXp:monsterTotal,awards:awards.map(a=>({...a,name:chars.find(c=>c.id===a.id)!.characterName}))}
      if(action==='preview')return preview
      const scope=input.campaignId||user.id
      const id=createHash('sha256').update(`adventure:${scope}:${input.awardId.trim().toLowerCase()}`).digest('hex')
      if(await tx.auditLog.findUnique({where:{id}}))throw operationError('Esta aventura já foi registrada.',409)
      for(const a of awards){const c=chars.find(c=>c.id===a.id)!;await updateVersion(tx,c,c.version,{xp:a.xp})}
      await tx.auditLog.create({data:{id,userId:user.id,campaignId:input.campaignId||null,action:'ADVENTURE_SETTLEMENT',details:JSON.stringify({awardId:input.awardId,preview})}})
      return {...preview, characters: await tx.character.findMany({where:{id:{in:chars.map(c=>c.id)}},select:{id:true,version:true,xp:true}})}
    }, {isolationLevel:'Serializable'})
  })
}
