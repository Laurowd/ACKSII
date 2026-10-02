import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { buildClass, ClassBuild, THIEF_SKILLS, HALFLING_SKILLS, raceCosts } from '../lib/classBuilder'
import { POWER_TRADES } from '../lib/classPowerPlan'
import { legacyBaseName } from '../lib/legacyClasses'
import { operationError } from './gameRules'

const integer={type:'integer',minimum:0,maximum:4}
const names={type:'array',maxItems:100,items:{type:'string',minLength:1,maxLength:150}}
const properties={name:{type:'string',minLength:1,maxLength:80},race:{type:'string',enum:['human','dwarf','elf','halfling','nobiran','zaharan']},
  racial:integer,hd:integer,fighting:integer,thievery:integer,divine:integer,arcane:integer,armorTrade:integer,weaponTrade:integer,styleTrade:integer,
  fightingVariant:{type:'string',enum:['crusader','thief']},damageTrade:{type:'string',enum:['none','melee','missile','both']},
  thiefSkills:{...names,uniqueItems:true,items:{type:'string',enum:THIEF_SKILLS}},powers:names,proficiencies:names,
  keyAttributes:{type:'array',minItems:1,maxItems:6,uniqueItems:true,items:{type:'string',enum:['str','int','dex','wil','con','cha']}},
  startingProficiency:{type:'string',minLength:1,maxLength:150},stronghold:{type:'string',minLength:1,maxLength:80},smoothXp:{type:'boolean'}}
const powerChoice={type:'object',additionalProperties:false,properties:{name:{type:'string',maxLength:150},description:{type:'string',maxLength:4000},kind:{type:'string',enum:['power','skill']},trade:{type:'string',enum:POWER_TRADES.map(t=>t.id)},children:{type:'array',maxItems:3,items:{$ref:'#/definitions/powerChoice'}}}}
const extraProperties={divineSpellList:{type:'array',maxItems:75,items:{type:'object',additionalProperties:false,required:['name','level','tradition'],properties:{name:{type:'string',minLength:1,maxLength:150},level:{type:'integer',minimum:1,maximum:5},tradition:{type:'string',const:'divine'}}}},powerSelections:{type:'array',maxItems:30,items:{$ref:'#/definitions/powerChoice'}},thiefSelections:{type:'array',maxItems:16,items:{$ref:'#/definitions/powerChoice'}},
  halflingSkills:{type:'array',maxItems:4,uniqueItems:true,items:{type:'string',enum:HALFLING_SKILLS}},delayedArcane:{type:'boolean'},tradeRebuking:{type:'boolean'},
  codeOfBehavior:{type:'string',maxLength:4000},startingDescription:{type:'string',maxLength:4000},strongholdPower:{type:'string',maxLength:150},strongholdDescription:{type:'string',maxLength:4000},
  fightingStyles:{type:'array',maxItems:3,uniqueItems:true,items:{type:'string',enum:['Dual Weapon','Two-Handed Weapon','Weapon and Shield']}},weaponSelection:{type:'string',maxLength:4000},titles:{type:'array',maxItems:14,items:{type:'string',minLength:1,maxLength:120}}}
export async function classBuilderRoutes(app:FastifyInstance){
  app.addHook('preHandler',authGuard)
  app.get('/metadata',async()=>({powerTrades:POWER_TRADES,thiefSkills:THIEF_SKILLS,halflingSkills:HALFLING_SKILLS,raceCosts}))
  for(const action of ['preview','create'])app.post(`/:campaignId/${action}`,{schema:{body:{type:'object',additionalProperties:false,definitions:{powerChoice},required:Object.keys(properties),properties:{...properties,...extraProperties}}}},async(req,reply)=>{
    const user=req.user as any,campaignId=(req.params as any).campaignId
    const campaign=await prisma.campaign.findUnique({where:{id:campaignId}})
    if(campaign?.masterId!==user.id)throw operationError('Somente o mestre pode construir classes desta campanha.',403)
    let result
    try{result=buildClass(req.body as ClassBuild)}catch(e){throw operationError((e as Error).message)}
    if(action==='preview')return result
    const sameName=await prisma.customClass.findMany({where:{campaignId,name:{equals:result.name,mode:'insensitive'}}})
    if(sameName.some(c=>!legacyBaseName(c)))throw operationError('Já existe uma classe com este nome.',409)
    const data={campaignId,name:result.name,hitDie:result.hitDie,conBonus:result.conBonus,creationRules:JSON.stringify(result.creationRules),
      description:`Construída por pontos (Judge’s Journal, pp. 289–306). Salvamentos: ${result.summary.savingClass}.`,
      classFeatures:`Armas: ${result.summary.weapons}${result.creationRules.build.weaponSelection ? ' — '+result.creationRules.build.weaponSelection : ''}; armadura: ${result.summary.armor}.\nEstilos: Single Weapon, Missile Weapon${result.creationRules.build.fightingStyles?.length ? ', '+result.creationRules.build.fightingStyles.join(', ') : ''}.\nFortaleza: ${result.creationRules.build.stronghold}.${result.creationRules.build.codeOfBehavior ? '\nCódigo de conduta: '+result.creationRules.build.codeOfBehavior : ''}`,
      xpPerLevel:JSON.stringify(result.xpPerLevel),titles:JSON.stringify(result.titles),attackThrows:JSON.stringify(result.attackThrows),savingThrows:JSON.stringify(result.savingThrows),thiefSkills:JSON.stringify(result.thiefSkills),rebukingUndead:JSON.stringify(result.rebukingUndead)}
    const created=await prisma.customClass.create({data})
    return reply.code(201).send(created)
  })
}
