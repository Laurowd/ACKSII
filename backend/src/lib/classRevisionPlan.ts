import { abilityState, classGrants, selectionsFor, completeAutomaticSelections, classChoiceIssues, approvedChoiceSignature } from './classAbilities'
import { classChoicePlan } from './classChoicePlan'
import { rulesFor } from './gameRules'
import { progressionFields } from './classCatalog'
import { initialAdventuring } from './creationRules'
import { readState } from './gameRules'

/** Explicit master review: no changes to XP, HP, coins, spells, or paid choices. */
export function classRevisionPlan(character:any,before:any,after:any,input:any,automatic=true) {
  const changed=before?.id!==after.id, oldState=abilityState(character), rules=rulesFor(after)
  const state={...oldState}
  if(changed)for(const key of ['classChoices','classChoiceApprovals','proficiencyOrigin','totemStatus','retainedClassGrants'])delete state[key]
  if(state.proficiencyOrigin && !rules?.proficiencyOrigins?.some(origin=>origin.key===state.proficiencyOrigin))delete state.proficiencyOrigin
  if(rules?.className!=='Shaman')delete state.totemStatus
  const natural=character.proficiencies.filter((row:any)=>row.category==='natural')
  if(input.keepNaturalIds.some((id:string)=>!natural.some((row:any)=>row.id===id)))throw new Error('A concessão selecionada não pertence a esta ficha.')
  delete state.retainedClassGrants
  if(input.origin) {
    if(!rules?.proficiencyOrigins?.some((origin:any)=>origin.key===input.origin))throw new Error('Origem indisponível na nova classe.')
    state.proficiencyOrigin=input.origin
  }
  state.classChoices=rules ? completeAutomaticSelections(rules,{...character,subclass:changed?'':character.subclass,rulesState:JSON.stringify(state)},input.choices || (changed?{}:selectionsFor(character,rules))) : {}
  const legitimate=rules ? classGrants(rules,{...character,rulesState:JSON.stringify(state),classChoices:state.classChoices,subclass:changed?'':character.subclass}).map(grant=>grant.name.toLowerCase()) : []
  state.retainedClassGrants=natural.filter((row:any)=>input.keepNaturalIds.includes(row.id) && !legitimate.includes(row.name.toLowerCase())).map((row:any)=>({name:row.name,ranks:classGrants(rulesFor(before)||{},character).find(grant=>grant.name===row.name)?.ranks || 1,throwTarget:row.throwTarget,fromClass:character.className}))
  const next={...character,className:after.name,classKey:after.id,subclass:state.classChoices.tradition || state.classChoices['dark-path'] || (changed?'':character.subclass),rulesState:JSON.stringify(state),classChoices:state.classChoices}
  if(rules) {
    const errors=classChoiceIssues(rules,next,state.classChoices,false,true)
    if(errors.length)throw new Error(errors.join(' '))
    state.classChoiceApprovals={}
    for(const definition of rules.classChoices || [])if(state.classChoices[definition.id]==='judge')state.classChoiceApprovals[definition.id]=approvedChoiceSignature(state.classChoices,definition.id)
    if(rules.className==='Shaman' && state.classChoices.totem && !state.totemStatus)state.totemStatus={alive:true,nearby:true}
  }
  const plan=classChoicePlan(character,rules || {},state.classChoices,state,false,character.level,false)
  const oldProfile={...(before?.ruleProfile || readState(before?.creationRules).ruleProfile || {}),proficiencyBonus:Number(oldState.adventuringProficiencyBonus || 0)},newProfile=after.ruleProfile || readState(after.creationRules).ruleProfile || {}
  const oldBase=initialAdventuring(character.str,before?.id?.startsWith('catalog:')?before.name:'',oldProfile),newBase=initialAdventuring(character.str,after.id.startsWith('catalog:')?after.name:'',newProfile)
  const newBonus=Number(newProfile.proficiencyBonus ?? (rules?.className==='Dwarven Craftpriest'?3:0))
  state.adventuringProficiencyBonus=newBonus
  for(const proficiency of character.proficiencies) {
    const key=proficiency.name.toLowerCase(), previous=oldBase.find(row=>row.name.toLowerCase()===key),current=newBase.find(row=>row.name.toLowerCase()===key)
    const delta=proficiency.category==='adventuring' && previous && current ? current.throwTarget-previous.throwTarget : ['class','general'].includes(proficiency.category)?oldProfile.proficiencyBonus-newBonus:0
    if(delta)plan.targets.push({...proficiency,throwTarget:proficiency.throwTarget+delta})
  }
  plan.proficiencies=plan.proficiencies.map((row:any)=>plan.targets.find(target=>target.id===row.id) || row)
  const fields:any={classKey:after.id,className:after.name,subclass:next.subclass,rulesState:JSON.stringify(state)}
  const weaponTargets:any[]=[]
  if(automatic) {
    const previous=before && progressionFields(before,character.level,character.wil), current=progressionFields(after,character.level,character.wil)
    Object.assign(fields,current)
    for(const key of ['saveDeath','saveParalysis','saveBlast','saveImplements','saveSpells'])if(current[key as keyof typeof current]!==undefined)fields[key]=(current as any)[key]+(previous?.[key]!==undefined?character[key]-previous[key]:0)
    const oldAttack=before && JSON.parse(before.attackThrows)[character.level-1], newAttack=JSON.parse(after.attackThrows)[character.level-1]
    if(Number.isFinite(newAttack))for(const weapon of character.weapons || [])weaponTargets.push({id:weapon.id,name:weapon.name,attackThrow:newAttack+(Number.isFinite(oldAttack)?weapon.attackThrow-oldAttack:0)})
  }
  return {...plan,state,fields,weaponTargets,next:{...next,...fields,proficiencies:plan.proficiencies}}
}
