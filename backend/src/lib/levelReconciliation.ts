import { abilityState, classGrants, completeAutomaticSelections, selectionsFor } from './classAbilities'
import { classChoicePlan } from './classChoicePlan'
import { proficiencyRankCount, proficiencyRankKey, newProficiencyTarget } from './proficiencyRanks'
import { classProficiencyPowers } from './classProficiencies'
import { proficiencyBonus } from './proficiencyBonus'

/** Same rules for direct level edits and guided advancement; retain manual offsets. */
export function levelReconciliation(character:any,rules:any,level:number) {
  const state={...abilityState(character)}, choices={...selectionsFor(character,rules)}
  for(const definition of rules.classChoices || []) if(definition.minimumLevel>level) {
    for(const key of Object.keys(choices)) if(key===definition.id || key.startsWith(`${definition.id}-`)) delete choices[key]
    if(state.classChoiceApprovals) {state.classChoiceApprovals={...state.classChoiceApprovals};delete state.classChoiceApprovals[definition.id]}
  }
  state.classChoices=completeAutomaticSelections(rules,{...character,level,classChoices:choices},choices,level)
  if(state.totemStatus?.alive===false && level>Number(state.totemStatus.lostAtLevel ?? character.level)) state.totemStatus={alive:true,nearby:true}
  const plan=classChoicePlan(character,rules,state.classChoices,state,false,level,false)
  // Legacy orphans need an explicit master review, not silent deletion on a level edit.
  const previousGrants=classGrants(rules,character).map(grant=>grant.name.toLowerCase())
  plan.removed=plan.removed.filter((row:any)=>row.category==='natural' && previousGrants.includes(row.name.toLowerCase()))
  return {...plan,state}
}
export async function applyProficiencyPlan(tx:any,characterId:string,plan:any) {
  for(const row of plan.converted || []) await tx.proficiency.update({where:{id:row.id},data:{name:row.name,category:row.category}})
  for(const row of plan.targets || []) await tx.proficiency.update({where:{id:row.id},data:{throwTarget:row.throwTarget}})
  if(plan.removed.length)await tx.proficiency.deleteMany({where:{characterId,id:{in:plan.removed.map((row:any)=>row.id)}}})
  if(plan.added.length)await tx.proficiency.createMany({data:plan.added.map((row:any)=>({...row,characterId}))})
}
export function learnedProficiencyRows(character:any,rules:any,additions:any[],level=character.level) {
  const grants=[...classGrants(rules,{...character,level}),...classProficiencyPowers(rules,level)], selected=[...(character.proficiencies || [])]
  return additions.map(proficiency=>{
    proficiency={...proficiency,name:proficiency.name.trim()}
    selected.push(proficiency)
    return {...proficiency,throwTarget:newProficiencyTarget(proficiency.name,proficiencyRankCount(proficiency.name,selected,grants),level,proficiencyBonus(rules))}
  })
}

/** A reference for old edited targets; never rewrites the persisted value. */
export function proficiencyPowerTarget(character:any,rules:any,proficiency:any):number|undefined {
  if(!['class','general','natural'].includes(proficiency.category))return undefined
  const level=character.level || 1,powers=classProficiencyPowers(rules,level),grants=classGrants(rules,character)
  if(![...powers,...grants].some(power=>proficiencyRankKey(power.name)===proficiencyRankKey(proficiency.name)) && !['Acrobatics','Contortionism'].includes(proficiency.name))return undefined
  if(proficiency.category==='natural' && grants.some(g=>g.name===proficiency.name && g.ranks===3 && g.name.startsWith('Craft (')))return 2
  const ranks=proficiencyRankCount(proficiency.name,character.proficiencies || [],[...grants,...powers])
  return newProficiencyTarget(proficiency.name,ranks,level,proficiencyBonus(rules))
}
