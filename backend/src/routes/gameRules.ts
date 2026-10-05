import { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { resolveClass, progressionFields } from '../lib/classCatalog'
import { GENERAL_PROFICIENCIES, RULE_CLASSES, SPELL_LIST, rulesFor, proficiencyBudget, proficiencyIssues, spellIssues, magicPools, readState, advancement, allocateAdventure, xpAdjustment, monsterXp } from '../lib/gameRules'
import { initialAdventuring } from '../lib/creationRules'
import { combatConfigurationSchema, validateCombatConfiguration } from '../lib/combatConfiguration'
import { formulaKey, studyPlan } from '../lib/spellLearning'

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
    next:rules.levels[c.level] || null, standardAdventuring:initialAdventuring(c.str,klass.id.startsWith('catalog:')?klass.name:'',readState((klass as any).creationRules).ruleProfile) }
}

export async function gameRulesRoutes(app: FastifyInstance) {
  app.addHook('preHandler',authGuard)
  app.post('/characters/:id/magic/formulas', { schema: { body: body({ version, spell: spellSchema, source: { type: 'string', minLength: 1, maxLength: 300 }, available: { const: true } }, ['version', 'spell', 'source', 'available']) } }, async req => {
    const input = req.body as any
    if (!input.source.trim()) throw operationError('Informe a origem da fórmula.')
    return prisma.$transaction(async tx => {
      const c = await accessibleCharacter((req.params as any).id, req.user, tx)
      const rules = rulesFor(await resolveClass(c.classKey, c.campaignId, c.className))
      if (!rules || !magicPools(rules, c).some(pool => pool.studious && pool.tradition === input.spell.tradition)) throw operationError('Este fluxo é para conjuradores que estudam fórmulas.')
      const spell = SPELL_LIST.find(entry => formulaKey(entry) === formulaKey(input.spell))
      if (!spell) throw operationError('Escolha uma fórmula válida no catálogo.')
      const state = readState(c.rulesState)
      state.formulas ||= []
      if (state.formulas.some((entry: any) => formulaKey(entry) === formulaKey(spell))) throw operationError('Esta fórmula já foi registrada no grimório.', 409)
      if (state.formulas.length >= 100) throw operationError('Limite de 100 fórmulas acompanhadas atingido; use as anotações do grimório para as demais.')
      state.formulas.push({ ...input.spell, source: input.source.trim() })
      let names: string[] = []; try { const value = JSON.parse(c.spellbook); if (Array.isArray(value)) names = value } catch { /* Preserve structured formulas separately. */ }
      if (!names.some(name => typeof name === 'string' && name.toLowerCase() === spell.name.toLowerCase())) names.push(spell.name)
      await updateVersion(tx, c, input.version, { rulesState: JSON.stringify(state), spellbook: JSON.stringify(names) })
      await tx.auditLog.create({ data: { characterId: c.id, campaignId: c.campaignId, userId: (req.user as any).id, action: 'SPELL_FORMULA_ACQUIRED', details: JSON.stringify({ spell: input.spell, source: input.source.trim() }) } })
      return { character: await mutationCharacter(tx, c.id) }
    }, { isolationLevel: 'Serializable' })
  })
  app.post('/characters/:id/magic/study/start', { schema: { body: body({ version, studyId: text, formulaKey: text, day: integer(), replaceSpellId: text, available: { const: true } }, ['version', 'studyId', 'formulaKey', 'day', 'available']) } }, async req => {
    const input = req.body as any
    return prisma.$transaction(async tx => {
      const c = await accessibleCharacter((req.params as any).id, req.user, tx), state = readState(c.rulesState)
      if (state.study) throw operationError('Já existe um estudo em andamento. Confira o registro antes de iniciar outro.', 409)
      const rules = rulesFor(await resolveClass(c.classKey, c.campaignId, c.className))
      if (!rules) throw operationError('Classe sem aprendizado automático.')
      let plan; try { plan = studyPlan(c, rules, input) } catch (error) { throw operationError((error as Error).message) }
      const receipt = createHash('sha256').update(`study:${c.id}:${input.studyId}`).digest('hex')
      if (await tx.auditLog.findUnique({ where: { id: receipt } })) throw operationError('Este estudo já foi registrado; atualize a ficha.', 409)
      if (input.day > 2147483640) throw operationError('O dia de jogo está fora do intervalo permitido.')
      state.study = { ...plan, id: input.studyId, startDay: input.day, earliestDay: input.day + 7 }
      await updateVersion(tx, c, input.version, { rulesState: JSON.stringify(state) })
      await tx.auditLog.create({ data: { id: receipt, characterId: c.id, campaignId: c.campaignId, userId: (req.user as any).id, action: 'SPELL_STUDY_STARTED', details: JSON.stringify(state.study) } })
      return { character: await mutationCharacter(tx, c.id) }
    }, { isolationLevel: 'Serializable' })
  })
  for (const action of ['complete', 'cancel']) app.post(`/characters/:id/magic/study/${action}`, { schema: { body: body({ version, studyId: text, day: integer(), requirementsMet: { const: true } }, action === 'complete' ? ['version', 'studyId', 'day', 'requirementsMet'] : ['version', 'studyId']) } }, async req => {
    const input = req.body as any
    return prisma.$transaction(async tx => {
      const c = await accessibleCharacter((req.params as any).id, req.user, tx), state = readState(c.rulesState), study = state.study
      if (!study || study.id !== input.studyId) throw operationError('O estudo mudou ou já foi concluído/cancelado. Atualize a ficha.', 409)
      if (action === 'complete') {
        if (input.day < study.earliestDay) throw operationError(`Conclua uma semana de estudo dedicado; primeiro dia de conclusão: ${study.earliestDay}.`)
        const rules = rulesFor(await resolveClass(c.classKey, c.campaignId, c.className))
        if (!rules) throw operationError('A classe mudou; confira o estudo com o mestre.')
        try { studyPlan(c, rules, { formulaKey: formulaKey(study.spell), replaceSpellId: study.replaceSpellId }) } catch (error) { throw operationError((error as Error).message) }
        if (study.replaceSpellId) await tx.spell.delete({ where: { id: study.replaceSpellId } })
        await tx.spell.create({ data: { ...study.spell, characterId: c.id } })
      }
      delete state.study
      await updateVersion(tx, c, input.version, { rulesState: JSON.stringify(state) })
      await tx.auditLog.create({ data: { characterId: c.id, campaignId: c.campaignId, userId: (req.user as any).id, action: action === 'complete' ? 'SPELL_STUDY_COMPLETED' : 'SPELL_STUDY_CANCELLED', details: JSON.stringify({ ...study, day: input.day }) } })
      return { character: await mutationCharacter(tx, c.id) }
    }, { isolationLevel: 'Serializable' })
  })
  app.post('/characters/:id/combat/modifiers', { schema: { body: body({ version, configuration: combatConfigurationSchema }, ['version', 'configuration']) } }, async req => {
    const input = req.body as any
    try { validateCombatConfiguration(input.configuration) } catch (error) { throw operationError((error as Error).message) }
    return prisma.$transaction(async tx => {
      const c = await accessibleCharacter((req.params as any).id, req.user, tx)
      for (const modifier of input.configuration.modifiers) if (modifier.itemId) {
        const item = await tx.item.findFirst({ where: { id: modifier.itemId, characterId: c.id } })
        if (!item || (modifier.active && !readState(item.magicDetails).identified)) throw operationError('Escolha um item desta ficha, identificado em jogo, para ativar seu bônus.')
      }
      const state = readState(c.rulesState), before = state.combat
      state.combat = input.configuration
      await updateVersion(tx, c, input.version, { rulesState: JSON.stringify(state) })
      await tx.auditLog.create({ data: { characterId: c.id, campaignId: c.campaignId, userId: (req.user as any).id, action: 'COMBAT_MODIFIERS_UPDATED', details: JSON.stringify({ before, after: state.combat }) } })
      return { character: await mutationCharacter(tx, c.id) }
    }, { isolationLevel: 'Serializable' })
  })
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
      await tx.auditLog.create({data:{characterId:c.id,campaignId:c.campaignId,userId:(req.user as any).id,action:'LEVEL_ADVANCEMENT',details:JSON.stringify({dice:input.dice,preview})}})
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
      await tx.auditLog.create({data:{characterId:c.id,campaignId:c.campaignId,userId:(req.user as any).id,action:'REPERTOIRE_REPLACED',details:JSON.stringify({before:c.spells,after:input.spells})}})
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
      await tx.auditLog.create({data:{characterId:c.id,campaignId:c.campaignId,userId:(req.user as any).id,action:'SPELL_CAST',details:JSON.stringify({name:spell.name,key})}})
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
      await tx.auditLog.create({data:{characterId:c.id,campaignId:c.campaignId,userId:(req.user as any).id,action:'SPELL_REST',details:JSON.stringify(input)}})
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

  const rewardBody = body({
    awardId: text, campaignId: text, reason: { type: 'string', minLength: 1, maxLength: 1000 },
    participants: { type: 'array', minItems: 1, maxItems: 100, items: body({ id: text, version, xp: integer(), gold: integer() }, ['id', 'version', 'xp', 'gold']) },
  }, ['awardId', 'reason', 'participants'])
  for (const action of ['preview', 'apply']) app.post(`/rewards/${action}`, { schema: { body: rewardBody } }, async request => {
    const input = request.body as any, user = request.user as any
    if (user.role !== 'MASTER') throw operationError('Somente o mestre pode distribuir XP e ouro.', 403)
    if (!input.awardId.trim() || !input.reason.trim()) throw operationError('Informe o nome da sessão ou o motivo da recompensa.')
    if (new Set(input.participants.map((p: any) => p.id)).size !== input.participants.length) throw operationError('Cada personagem deve aparecer uma única vez.')
    if (!input.participants.some((p: any) => p.xp || p.gold)) throw operationError('Informe XP ou ouro para pelo menos um personagem.')
    return prisma.$transaction(async tx => {
      if (input.campaignId) {
        const campaign = await tx.campaign.findUnique({ where: { id: input.campaignId } })
        if (!campaign || campaign.masterId !== user.id) throw operationError('Somente o mestre responsável pela campanha pode distribuir recompensas.', 403)
      }
      const characters = await tx.character.findMany({ where: {
        id: { in: input.participants.map((p: any) => p.id) }, campaignId: input.campaignId || null,
        ...(!input.campaignId && { userId: user.id }),
      }, orderBy: { id: 'asc' } })
      if (characters.length !== input.participants.length) throw operationError('Todos os personagens devem pertencer à campanha escolhida e estar sob sua responsabilidade.', 403)
      // The same receipt cannot be credited through both the simple and book workflows.
      const id = createHash('sha256').update(`adventure:${input.campaignId || user.id}:${input.awardId.trim().toLowerCase()}`).digest('hex')
      if (await tx.auditLog.findUnique({ where: { id } })) throw Object.assign(operationError('Esta recompensa já foi registrada. Atualize o grupo para conferir os saldos.', 409), { code: 'REWARD_ALREADY_RECORDED' })
      const awards = characters.map(character => {
        const participant = input.participants.find((p: any) => p.id === character.id)
        if (character.version !== participant.version) throw Object.assign(operationError('Uma ficha mudou. Confira os valores novamente antes de confirmar.', 409), { code: 'CHARACTER_CONFLICT' })
        const xp = character.xp + participant.xp, coinGP = character.coinGP + participant.gold
        if (xp > 2147483647 || coinGP > 2147483647) throw operationError('O saldo resultante excede o limite permitido.')
        return { id: character.id, name: character.characterName, version: character.version, gained: participant.xp, gold: participant.gold, beforeXp: character.xp, xp, beforeGold: character.coinGP, coinGP }
      })
      const preview = { awardId: input.awardId, reason: input.reason.trim(), awards }
      if (action === 'preview') return preview
      for (const award of awards) {
        if (!award.gained && !award.gold) continue
        const character = characters.find(c => c.id === award.id)!
        await updateVersion(tx, character, award.version, { xp: award.xp, coinGP: award.coinGP })
        await tx.auditLog.create({ data: { userId: user.id, campaignId: input.campaignId || null, characterId: award.id, action: 'REWARD_RECEIVED', details: JSON.stringify({ awardId: input.awardId, reason: preview.reason, ...award }) } })
      }
      await tx.auditLog.create({ data: { id, userId: user.id, campaignId: input.campaignId || null, action: 'REWARD_SETTLEMENT', details: JSON.stringify(preview) } })
      return { ...preview, characters: await tx.character.findMany({ where: { id: { in: characters.map(c => c.id) } }, select: { id: true, version: true, xp: true, coinGP: true } }) }
    }, { isolationLevel: 'Serializable', timeout: 15000 })
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
