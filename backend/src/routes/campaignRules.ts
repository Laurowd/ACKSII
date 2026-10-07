import { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { accessibleCharacter, operationError, updateVersion } from './gameRules'
import { settleDomainMonth, researchPlan, researchOutcome } from '../lib/campaignRules'
import { magicPools, readState, rulesFor } from '../lib/gameRules'
import { resolveClass } from '../lib/classCatalog'

const number=(min=0,max=1e9)=>({type:'number',minimum:min,maximum:max})
const int=(min=0,max=2147483647)=>({type:'integer',minimum:min,maximum:max})
const text={type:'string',minLength:1,maxLength:200}
const body=(properties:any,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required})
const signature=(value:any)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const serial={isolationLevel:'Serializable' as const}
const mutationCharacter = (tx: any, id: string) => tx.character.findUniqueOrThrow({where:{id},include:{items:true,domain:true,magicItemResearch:true}})

export async function campaignRuleRoutes(app:FastifyInstance){
  app.addHook('preHandler',authGuard)
  const itemDetails=body({identified:{type:'boolean'},charges:{anyOf:[int(0,1000000),{type:'null'}]},effect:{type:'string',maxLength:4000},apparentValueGp:number(),identifiedValueGp:number()})
  app.post('/characters/:id/items/:itemId/magic',{schema:{body:body({version:int(),details:itemDetails})}},async req=>{
    const input=req.body as any,params=req.params as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter(params.id,req.user,tx)
      const item=await tx.item.findFirst({where:{id:params.itemId,characterId:c.id}})
      if(!item)throw operationError('Item não encontrado.',404)
      if(input.details.charges!=null&&item.quantity!==1)throw operationError('Separe o item carregado em uma entrada com quantidade 1.')
      await updateVersion(tx,c,input.version)
      const details={...readState(item.magicDetails),...input.details,magicItem:true}
      await tx.item.update({where:{id:item.id},data:{magicDetails:JSON.stringify(details)}})
      await tx.auditLog.create({data:{characterId:c.id,campaignId:c.campaignId,userId:(req.user as any).id,action:'MAGIC_ITEM_RECORDED',details:JSON.stringify({itemId:item.id,before:readState(item.magicDetails),after:details})}})
      return {...details, character: await mutationCharacter(tx,c.id)}
    },serial)
  })
  app.post('/characters/:id/items/:itemId/charge',{schema:{body:body({version:int(),charges:int(1,1000000)})}},async req=>{
    const input=req.body as any,params=req.params as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter(params.id,req.user,tx)
      const item=await tx.item.findFirst({where:{id:params.itemId,characterId:c.id}})
      if(!item)throw operationError('Item não encontrado.',404)
      const details=readState(item.magicDetails)
      if(!details.identified||!Number.isInteger(details.charges)||details.charges<input.charges||item.quantity!==1)throw operationError('Item não identificado, sem cargas suficientes ou agrupado com outros itens.')
      await updateVersion(tx,c,input.version)
      details.charges-=input.charges
      await tx.item.update({where:{id:item.id},data:{magicDetails:JSON.stringify(details)}})
      await tx.auditLog.create({data:{characterId:c.id,campaignId:c.campaignId,userId:(req.user as any).id,action:'MAGIC_ITEM_USED',details:JSON.stringify({itemId:item.id,spent:input.charges,remaining:details.charges})}})
      return {...details, character: await mutationCharacter(tx,c.id)}
    },serial)
  })
  const domainBody=body({version:int(),year:int(1,99999),month:int(1,12),baseMorale:int(-4,4),moraleDice:{type:'array',minItems:2,maxItems:2,items:int(1,6)},
    growth:int(0,1000000),losses:int(0,1000000),eventFamilies:int(-1000000,1000000),eventMorale:int(-20,20),administered:{type:'boolean'},repressed:{type:'boolean'},
    classification:{type:'string',enum:['outlands','borderlands','civilized']},hexes:int(1,1000000),tributeGp:number(),fingerprint:{type:'string',maxLength:64}},
    ['version','year','month','baseMorale','moraleDice','growth','losses','eventFamilies','eventMorale','administered','repressed','classification','hexes','tributeGp'])
  for(const action of ['preview','apply'])app.post(`/characters/:id/domain/${action}`,{schema:{body:domainBody}},async req=>{
    const input=req.body as any,user=req.user as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter((req.params as any).id,user,tx)
      if(!c.domain)throw operationError('Cadastre o domínio na aba Domínio & Seguidores.')
      if(c.version!==input.version)throw operationError('A ficha mudou. Atualize a prévia.',409)
      const fingerprint=signature(c.domain)
      if(action==='apply'&&input.fingerprint!==fingerprint)throw operationError('O domínio mudou. Confira novamente.',409)
      let result
      try{result=settleDomainMonth(c.domain,input)}catch(e){throw operationError((e as Error).message)}
      if(action==='preview')return {...result,fingerprint}
      const id=signature(`domain:${c.id}:${input.year}:${input.month}`)
      if(await tx.auditLog.findUnique({where:{id}}))throw operationError('Este mês do domínio já foi fechado.',409)
      await updateVersion(tx,c,input.version)
      await tx.domain.update({where:{id:c.domain.id},data:{peasantFamilies:result.population,peasantMorale:result.morale,treasury:result.treasury,consolidatedBalance:result.balance}})
      await tx.auditLog.create({data:{id,userId:user.id,characterId:c.id,campaignId:c.campaignId,action:'DOMAIN_MONTH_SETTLED',details:JSON.stringify({input,result})}})
      return {...result, character: await mutationCharacter(tx,c.id)}
    },serial)
  })
  const assistant=body({name:text,casterLevel:int(1,14),rateBonusPercent:number(0,100),dedication:{type:'string',enum:['dedicated','ancillary']}})
  const planBody=body({version:int(),casterLevel:int(1,14),tradition:{type:'string',enum:['arcane','divine']},rateBonusPercent:number(0,100),
    dedication:{type:'string',enum:['dedicated','ancillary']},assistants:{type:'array',maxItems:20,items:assistant},duration:{type:'string',enum:['instant','round','turn','hour','day','concentration']},
    affectsUser:{type:'boolean'},esoteric:{type:'boolean'},healing:{type:'boolean'},eligible:{type:'boolean'},itemKind:{type:'string',enum:['wand','rod','staff','other']},fingerprint:{type:'string',maxLength:64}},
    ['version','casterLevel','tradition','rateBonusPercent','dedication','assistants','duration','affectsUser','esoteric','healing','eligible','itemKind'])
  for(const action of ['preview','start'])app.post(`/characters/:id/research/:projectId/${action}`,{schema:{body:planBody}},async req=>{
    const input=req.body as any,params=req.params as any,user=req.user as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter(params.id,user,tx),state=readState(c.rulesState)
      const project=await tx.magicItemResearch.findFirst({where:{id:params.projectId,characterId:c.id}})
      if(!project)throw operationError('Projeto não encontrado.',404)
      if(c.version!==input.version)throw operationError('A ficha mudou. Atualize a prévia.',409)
      const fingerprint=signature(project)
      if(action==='start'&&input.fingerprint!==fingerprint)throw operationError('O projeto mudou. Confira novamente.',409)
      const rules=rulesFor(await resolveClass(c.classKey,c.campaignId,c.className))
      if(!rules||!magicPools(rules,c).some(p=>p.tradition===input.tradition&&p.casterLevel>=input.casterLevel))throw operationError('Nível de conjurador incompatível com a classe.')
      let plan
      try{plan=researchPlan(project,c,input,rules)}catch(e){throw operationError((e as Error).message)}
      if(action==='preview')return {...plan,fingerprint}
      if(state.research?.[project.id])throw operationError('Este projeto já foi iniciado.',409)
      if(c.coinGP<plan.materialsPaidGp)throw operationError('GP insuficientes para os materiais iniciais. Converta outras moedas antes de iniciar.')
      state.research ||= {};state.research[project.id]={input,plan,materialsPaid:true}
      await updateVersion(tx,c,input.version,{coinGP:{decrement:plan.materialsPaidGp},rulesState:JSON.stringify(state)})
      await tx.magicItemResearch.update({where:{id:project.id},data:{status:'IN_PROGRESS',casterLevel:input.casterLevel,researchRateGp:plan.researchRateGp,remainingDays:plan.daysRequired,weeksRequired:plan.weeksRequired}})
      await tx.auditLog.create({data:{characterId:c.id,userId:user.id,action:'RESEARCH_STARTED',details:JSON.stringify({projectId:project.id,plan,input})}})
      return {...plan, character: await mutationCharacter(tx,c.id)}
    },serial)
  })
  app.post('/characters/:id/research/:projectId/work',{schema:{body:body({version:int(),days:int(1,365),period:text})}},async req=>{
    const input=req.body as any,params=req.params as any,user=req.user as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter(params.id,user,tx),state=readState(c.rulesState)
      const project=await tx.magicItemResearch.findFirst({where:{id:params.projectId,characterId:c.id}})
      if(!project||!state.research?.[project.id]||project.status!=='IN_PROGRESS')throw operationError('Projeto sem trabalho pendente.')
      const id=signature(`research-work:${project.id}:${input.period.trim().toLowerCase()}`)
      if(await tx.auditLog.findUnique({where:{id}}))throw operationError('Este período de trabalho já foi registrado.',409)
      const remainingDays=Math.max(0,project.remainingDays-input.days)
      await updateVersion(tx,c,input.version)
      await tx.magicItemResearch.update({where:{id:project.id},data:{remainingDays,status:remainingDays?'IN_PROGRESS':'READY'}})
      await tx.auditLog.create({data:{id,characterId:c.id,userId:user.id,action:'RESEARCH_WORK',details:JSON.stringify(input)}})
      return {remainingDays, character: await mutationCharacter(tx,c.id)}
    },serial)
  })
  const component=body({itemId:text,quantity:int(1,1000000),valueGp:number(0.01),appropriate:{type:'boolean'}})
  app.post('/characters/:id/research/:projectId/cancel',{schema:{body:body({version:int()})}},async req=>{
    const input=req.body as any,params=req.params as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter(params.id,req.user,tx),state=readState(c.rulesState)
      const project=await tx.magicItemResearch.findFirst({where:{id:params.projectId,characterId:c.id}})
      if(!project||!state.research?.[project.id]||!['IN_PROGRESS','READY'].includes(project.status))throw operationError('Projeto sem acompanhamento ativo.')
      await updateVersion(tx,c,input.version)
      await tx.magicItemResearch.update({where:{id:project.id},data:{status:'CANCELLED'}})
      await tx.auditLog.create({data:{characterId:c.id,userId:(req.user as any).id,action:'RESEARCH_CANCELLED',details:JSON.stringify({projectId:project.id,materialsRefunded:false})}})
      return {cancelled:true, character: await mutationCharacter(tx,c.id)}
    },serial)
  })
  const finishBody=body({version:int(),components:{type:'array',minItems:1,maxItems:100,items:component},roll:int(0,20),engineeringRank:int(0,10),otherBonus:int(-30,30),itemWeight:number(0,100000),fingerprint:{type:'string',maxLength:64}},['version','components','roll','engineeringRank','otherBonus','itemWeight'])
  for(const action of ['outcome','finish'])app.post(`/characters/:id/research/:projectId/${action}`,{schema:{body:finishBody}},async req=>{
    const input=req.body as any,params=req.params as any,user=req.user as any
    return prisma.$transaction(async tx=>{
      const c=await accessibleCharacter(params.id,user,tx),state=readState(c.rulesState)
      const project=await tx.magicItemResearch.findFirst({where:{id:params.projectId,characterId:c.id}})
      if(!project||!state.research?.[project.id]||project.status!=='READY'||project.remainingDays!==0)throw operationError('O projeto precisa concluir o trabalho antes do teste final.')
      if(new Set(input.components.map((c:any)=>c.itemId)).size!==input.components.length)throw operationError('Agrupe componentes do mesmo item numa única entrada.')
      const inventory=await tx.item.findMany({where:{characterId:c.id,id:{in:input.components.map((c:any)=>c.itemId)}},orderBy:{id:'asc'}})
      for(const part of input.components)if(!inventory.some(i=>i.id===part.itemId&&i.quantity>=part.quantity))throw operationError('Quantidade de componentes indisponível no inventário.')
      const fingerprint=signature({project,inventory})
      if(action==='finish'&&input.fingerprint!==fingerprint)throw operationError('Projeto ou componentes mudaram. Refaça a prévia.',409)
      let result
      try{result=researchOutcome(project,c,input)}catch(e){throw operationError((e as Error).message)}
      if(action==='outcome')return {...result,fingerprint}
      state.research[project.id].result=result
      await updateVersion(tx,c,input.version,{rulesState:JSON.stringify(state)})
      for(const part of input.components){const item=inventory.find(i=>i.id===part.itemId)!;if(item.quantity===part.quantity)await tx.item.delete({where:{id:item.id}});else await tx.item.update({where:{id:item.id},data:{quantity:{decrement:part.quantity}}})}
      await tx.magicItemResearch.update({where:{id:project.id},data:{status:result.success?'COMPLETED':'FAILED'}})
      if(result.success)await tx.item.create({data:{characterId:c.id,name:project.itemName,quantity:1,weight:input.itemWeight,magicDetails:JSON.stringify({magicItem:true,identified:true,effectType:project.effectType,spellLevel:project.spellLevel,charges:project.effectType==='CHARGED'?project.effectCount:null,researchId:project.id})}})
      await tx.auditLog.create({data:{characterId:c.id,userId:user.id,action:'RESEARCH_FINISHED',details:JSON.stringify({projectId:project.id,result,input})}})
      return {...result, character: await mutationCharacter(tx,c.id)}
    },serial)
  })
}
