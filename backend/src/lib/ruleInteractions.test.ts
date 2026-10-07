import { describe, expect, it } from 'vitest'
import { classChoicePlan } from './classChoicePlan'
import { classGrants, abilityProficiencies } from './classAbilities'
import { RULE_CLASSES, rulesFor } from './gameRules'
import { learnedProficiencyRows, levelReconciliation, proficiencyPowerTarget } from './levelReconciliation'
import { initialAdventuring } from './creationRules'
import { buildClass, type ClassBuild } from './classBuilder'
import { repertoirePlan } from './repertoirePlan'
import { researchPlan, settleDomainMonth } from './campaignRules'
import { domainEconomy } from './domainEconomy'
import { prepareCharacterImport } from './characterImport'

const hero={level:1,str:10,int:10,dex:10,wil:10,con:10,cha:10,spells:[],proficiencies:[] as any[]}
describe('interactions from the 07 October book audit',()=>{
  it('keeps a paid Bard grade when a newly acquired Jack grants the next grade',()=>{
    const character={...hero,level:3,rulesState:JSON.stringify({classChoices:{'jack-1':'Command'}}),proficiencies:[{id:'paid',name:'Alchemy',category:'general',throwTarget:9}]}
    const choices={'jack-1':'Command','jack-2':'Alchemy'},plan=classChoicePlan(character,RULE_CLASSES.Bard!,choices,{classChoices:choices})
    expect(plan.converted).toEqual([])
    expect(plan.proficiencies.find(p=>p.id==='paid')).toMatchObject({category:'general',throwTarget:9})
    expect(plan.added).toContainEqual({name:'Alchemy',category:'natural',throwTarget:7})
  })
  it('counts earlier free Jack grades without double-counting their stored rows',()=>{
    const character={...hero,level:3,classChoices:{'jack-1':'Alchemy','jack-2':'Alchemy'},proficiencies:[{id:'free',name:'Alchemy',category:'natural',throwTarget:11}]}
    expect(classGrants(RULE_CLASSES.Bard!,character).map(g=>g.throwTarget)).toEqual([11,7])
    expect(classChoicePlan(character,RULE_CLASSES.Bard!,character.classChoices,{classChoices:character.classChoices}).added[0]).toMatchObject({throwTarget:7})
    expect(proficiencyPowerTarget(character,RULE_CLASSES.Bard!,character.proficiencies[0])).toBe(7)
    expect(character.proficiencies[0]!.throwTarget).toBe(11)
  })
  it('keeps paid Divine Health active when the new Lion totem is absent',()=>{
    const character={...hero,classChoices:{totem:'Bear'},proficiencies:[{id:'paid',name:'Divine Health',category:'class',throwTarget:11}]}
    const choices={totem:'Lion'},state={classChoices:choices,totemStatus:{alive:true,nearby:false}}
    const plan=classChoicePlan(character,RULE_CLASSES.Shaman!,choices,state)
    expect(plan.converted).toEqual([])
    expect(abilityProficiencies({...character,proficiencies:plan.proficiencies,rulesState:JSON.stringify(state),classChoices:choices},RULE_CLASSES.Shaman!)).toContainEqual(character.proficiencies[0])
  })
  for(const name of ['Acrobatics','Contortionism'])it(`${name} starts at 18+ and improves with level while retaining manual offsets`,()=>{
    expect(learnedProficiencyRows(hero,RULE_CLASSES.Thief!,[{name,category:'class'}])[0].throwTarget).toBe(18)
    const plan=levelReconciliation({...hero,proficiencies:[{id:'p',name,category:'class',throwTarget:20}]},RULE_CLASSES.Thief!,3)
    expect(plan.targets[0]).toMatchObject({throwTarget:18})
  })
  it('passes Dwarf Value 2 to creation and later learning, including racial exceptions',()=>{
    const build:ClassBuild={name:'Dwarf test',race:'dwarf',racial:2,hd:2,fighting:2,thievery:0,divine:0,arcane:0,fightingVariant:'crusader',armorTrade:0,weaponTrade:0,styleTrade:0,damageTrade:'none',thiefSkills:[],powers:[],startingProficiency:'Manual of Arms',proficiencies:Array.from({length:31},(_,i)=>`Proficiency ${i}`),keyAttributes:['str'],stronghold:'Castle',smoothXp:true}
    const built=buildClass(build),klass={creationRules:JSON.stringify(built.creationRules)},rules=rulesFor(klass)!
    expect(built.creationRules.ruleProfile.proficiencyBonus).toBe(2)
    expect(learnedProficiencyRows(hero,rules,[{name:'Theology',category:'general'}])[0].throwTarget).toBe(9)
    expect(initialAdventuring(10,'',built.creationRules.ruleProfile).map(p=>p.throwTarget)).toEqual([16,6,14,16,14])
    // Previous built classes also retain their racial value without needing a rewrite.
    delete (built.creationRules.ruleProfile as any).proficiencyBonus
    expect(learnedProficiencyRows(hero,rulesFor({creationRules:JSON.stringify(built.creationRules)})!,[{name:'Theology',category:'general'}])[0].throwTarget).toBe(9)
    expect(JSON.parse(prepareCharacterImport({characterName:'Copy',rulesState:JSON.stringify({adventuringProficiencyBonus:2,adventuringProficiencyBonuses:{Climbing:2,Searching:0}})}).fields.rulesState)).toMatchObject({adventuringProficiencyBonus:2,adventuringProficiencyBonuses:{Climbing:2,Searching:0}})
  })
  it('retains spell row IDs and distinguishes prayerful changes from study changes',()=>{
    const character={...hero,level:3,spells:[{id:'a',name:'Slumber',tradition:'arcane',level:1}]}
    expect(repertoirePlan(character,RULE_CLASSES.Mage!,[{name:'Slumber',tradition:'arcane',level:1}])).toEqual({added:[],removed:[],changesStudy:false})
    expect(repertoirePlan(character,RULE_CLASSES.Mage!,[{name:'Ogre Strength',tradition:'arcane',level:2}]).changesStudy).toBe(true)
    expect(repertoirePlan({...hero,spells:[]},RULE_CLASSES.Crusader!,[{name:'Discern Gist',tradition:'divine',level:1}]).changesStudy).toBe(false)
  })
  it('uses the same morale-adjusted revenue in the campaign economy and monthly settlement',()=>{
    const domain={peasantFamilies:100,revenuePerFamily:3,servicePerFamily:4,taxPerFamily:2,peasantMorale:-3,garrisonCost:200,liturgiesCost:100,titheCost:100,maintenanceCost:100,treasury:5000}
    expect(domainEconomy(domain)).toMatchObject({gross:900,revenue:450,expenses:500,balance:-50})
    expect(settleDomainMonth(domain,{moraleDice:[3,4],administered:false,eventMorale:0,baseMorale:0,repressed:false,classification:'civilized',hexes:1,growth:0,losses:0,eventFamilies:0,tributeGp:0})).toMatchObject({revenue:450,balance:-50,treasury:4950})
  })
  it('permits known esoteric charged effects while still blocking activated esoteric effects',()=>{
    const project={status:'QUEUED',effectType:'CHARGED',effectCount:10,spellLevel:1,knowsEffect:true},character={...hero,className:'Mage',level:9,workshopValue:4000}
    const input={casterLevel:9,tradition:'arcane',rateBonusPercent:0,dedication:'dedicated',assistants:[],duration:'turn',affectsUser:false,esoteric:true,healing:false,eligible:true,itemKind:'wand'}
    expect(researchPlan(project,character,input)).toMatchObject({materialsPaidGp:5000,daysRequired:9})
    expect(()=>researchPlan({...project,effectType:'DAILY'},character,input)).toThrow('experimentação')
  })
})
