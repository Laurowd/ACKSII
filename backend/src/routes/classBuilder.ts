import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { buildClass, ClassBuild, THIEF_SKILLS } from '../lib/classBuilder'
import { operationError } from './gameRules'

const integer={type:'integer',minimum:0,maximum:4}
const names={type:'array',maxItems:100,items:{type:'string',minLength:1,maxLength:150}}
const properties={name:{type:'string',minLength:1,maxLength:80},race:{type:'string',enum:['human','dwarf','elf','nobiran','zaharan']},
  racial:integer,hd:integer,fighting:integer,thievery:integer,divine:integer,arcane:integer,armorTrade:integer,weaponTrade:integer,styleTrade:integer,
  fightingVariant:{type:'string',enum:['crusader','thief']},damageTrade:{type:'string',enum:['none','melee','missile','both']},
  thiefSkills:{...names,uniqueItems:true,items:{type:'string',enum:THIEF_SKILLS}},powers:names,proficiencies:names,
  keyAttributes:{type:'array',minItems:1,maxItems:6,uniqueItems:true,items:{type:'string',enum:['str','int','dex','wil','con','cha']}},
  startingProficiency:{type:'string',minLength:1,maxLength:150},stronghold:{type:'string',minLength:1,maxLength:80},smoothXp:{type:'boolean'}}
export async function classBuilderRoutes(app:FastifyInstance){
  app.addHook('preHandler',authGuard)
  for(const action of ['preview','create'])app.post(`/:campaignId/${action}`,{schema:{body:{type:'object',additionalProperties:false,required:Object.keys(properties),properties}}},async(req,reply)=>{
    const user=req.user as any,campaignId=(req.params as any).campaignId
    const campaign=await prisma.campaign.findUnique({where:{id:campaignId}})
    if(campaign?.masterId!==user.id)throw operationError('Somente o mestre pode construir classes desta campanha.',403)
    let result
    try{result=buildClass(req.body as ClassBuild)}catch(e){throw operationError((e as Error).message)}
    if(action==='preview')return result
    if(await prisma.customClass.findFirst({where:{campaignId,name:{equals:result.name,mode:'insensitive'}}}))throw operationError('Já existe uma classe com este nome.',409)
    const data={campaignId,name:result.name,hitDie:result.hitDie,conBonus:result.conBonus,creationRules:JSON.stringify(result.creationRules),
      description:`Construída por pontos (Judge’s Journal, pp. 289–306). Salvamentos: ${result.summary.savingClass}.`,
      classFeatures:`Poder inicial: ${result.creationRules.build.startingProficiency}.\nPoderes de trocas: ${result.creationRules.build.powers.join('; ') || 'nenhum'}.\nHabilidades de ladrão: ${result.summary.thiefSkills.join('; ') || 'nenhuma'}.\nArmas: ${result.summary.weapons}; armadura: ${result.summary.armor}; estilos opcionais: ${result.summary.optionalStyles}.\nFortaleza: ${result.creationRules.build.stronghold}. O mestre define as seleções específicas e os benefícios condicionais/raciais.`,
      xpPerLevel:JSON.stringify(result.xpPerLevel),titles:JSON.stringify(result.titles),attackThrows:JSON.stringify(result.attackThrows),savingThrows:JSON.stringify(result.savingThrows)}
    const created=await prisma.customClass.create({data})
    return reply.code(201).send(created)
  })
}
