import { describe,it,expect } from 'vitest'
import { ruleProfile } from '../../../backend/src/lib/ruleProfiles'
import { RULE_CLASSES } from '../../../backend/src/lib/gameRules'
import { calculateCharacterMetrics } from './characterMetrics'
import { classEffects } from './classEffects'
import { choiceMagicPools,spellValidation } from './ruleChoices'
import { getClassFeats } from './classFeats'
import { classDefinitionFeats } from './classDefinitionFeats'
import { characterExport, characterPrintHtml } from './characterExport'
import type { CatalogClass } from './catalog'
const hero={level:6,str:10,dex:10,int:10,con:10,wil:10,cha:10,proficiencies:[] as any[]}
describe('revised class values shown to players',()=>{
  it('limits Paladin, Ruinguard and Barbarian damage to their permitted attacks',()=>{
    const paladin=classEffects(hero,ruleProfile('Paladin'))
    expect(paladin.damageBonusFor(false)).toBe(3);expect(paladin.damageBonusFor(true)).toBe(0)
    const ruin=classEffects(hero,ruleProfile('Zaharan Ruinguard'))
    expect(ruin.damageBonusFor(false,{name:'Sword'})).toBe(3);expect(ruin.damageBonusFor(false,{name:'Dagger'})).toBe(0);expect(ruin.damageBonusFor(true,{name:'Sword'})).toBe(0)
    const barbarian=classEffects({...hero,rulesState:JSON.stringify({classChoices:{'damage-specialization':'missile'}})},ruleProfile('Barbarian'))
    expect(barbarian.damageBonusFor(false)).toBe(0);expect(barbarian.damageBonusFor(true)).toBe(3)
    expect(classEffects(hero,ruleProfile('Barbarian')).damageBonusFor(false)).toBe(0)
  })
  it('applies Running only in suitable armor and load and exposes the source',()=>{
    const character={...hero,proficiencies:[{name:'Running'}]}
    expect(calculateCharacterMetrics(character).encumbrance.moveExploration).toBe(150)
    expect(calculateCharacterMetrics(character).movementSources).toEqual([{source:'Running',value:30}])
    expect(calculateCharacterMetrics({...character,armorWeight:5}).encumbrance.moveExploration).toBe(120)
    expect(calculateCharacterMetrics({...character,items:[{weight:8,quantity:1}]}).encumbrance.moveExploration).toBe(60)
    expect(calculateCharacterMetrics({...character,items:[{weight:100,quantity:1,slot:'stashed'}]}).encumbrance.moveExploration).toBe(150)
  })
  it('disables conditional totem benefits when the animal is dead or distant',()=>{
    const profile=ruleProfile('Shaman'),character={...hero,classChoices:{totem:'Viper'},totemStatus:{alive:true,nearby:true},proficiencies:[{name:'Combat Reflexes',category:'natural'}]}
    expect(classEffects(character,profile).initiative).toBe(1)
    expect(classEffects({...character,totemStatus:{alive:false,nearby:true}},profile).initiative).toBe(0)
    expect(classEffects({...character,totemStatus:{alive:true,nearby:false}},profile).initiative).toBe(0)
  })
  it('offers the Expanded Repertoire spell without increasing the daily uses',()=>{
    const character={...hero,level:1,proficiencies:[{name:'Expanded Repertoire',category:'class'}]},pools=choiceMagicPools(RULE_CLASSES.Mage,10,1,character)
    expect(pools[0]).toMatchObject({slots:[1,0,0,0,0,0],repertoire:[2,0,0,0,0,0]})
    const spells=[{name:'Arcane Armor',level:1,tradition:'arcane'},{name:'Auditory Illusion',level:1,tradition:'arcane'}]
    expect(spellValidation(pools,spells,spells).issues).toEqual([])
  })
  it('shows the selected Witch tradition and separates research by its actual level',()=>{
    const first=getClassFeats('Witch',1,'Antiquarian'),three=getClassFeats('Witch',3,'Antiquarian')
    expect(first.availableSubclasses).toEqual(['Antiquarian','Chthonic','Sylvan'])
    expect(first.powers.map(power=>power.name)).toContain('Studious Divine Magic')
    expect(first.powers.map(power=>power.name)).not.toContain('Arcane Magic');expect(first.powers.map(power=>power.name)).not.toContain('Familiar')
    expect(first.powers.map(power=>power.name)).toContain('Traditional Medicine');expect(first.powers.map(power=>power.name)).not.toContain('Bedazzling Glamour')
    expect(three.powers.map(power=>power.name)).toContain('Brew Potions');expect(three.powers.map(power=>power.name)).toContain('Healing Arts');expect(three.powers.map(power=>power.name)).not.toContain('Scribe Scrolls')
    expect(getClassFeats('Witch',7,'Chthonic').powers.map(power=>power.name)).toContain('Evil Eye')
  })
  it('shows Craftpriest Crafting and studious magic without premature research',()=>{
    const first=getClassFeats('Dwarven Craftpriest',1)
    expect(first.powers.map(power=>power.name)).toContain('Crafting');expect(first.powers.map(power=>power.name)).toContain('Studious Divine Magic')
    expect(first.levelStats.some(section=>section.sectionTitle==='Rebuking Undead')).toBe(true)
    expect(getClassFeats('Dwarven Craftpriest',5).powers.map(power=>power.name)).not.toContain('Major Magical Research')
  })
  it('does not unlock abbreviated future-power labels early',()=>{
    expect(getClassFeats('Bard',1).powers.map(power=>power.name)).not.toContain('Chronicles of Battle (5th)')
    expect(getClassFeats('Thief',1).powers.map(power=>power.name)).not.toContain('Scrollreading (10th)')
    expect(getClassFeats('Thief',10).powers.map(power=>power.name)).toContain('Scrollreading (10th)')
  })
  it('shows the thief skill picked through Jack of All Trades at the current level',()=>{
    const definition={name:'Bard',source:'catalog',rules:RULE_CLASSES.Bard} as CatalogClass
    const feats=classDefinitionFeats(definition,'Bard',3,'',[],{...hero,level:3,classChoices:{'jack-1':'skill:Climbing'}})
    expect(feats.levelStats.find(section=>section.sectionTitle==='Jack of All Trades')?.stats).toEqual([{label:'Climbing',value:'4+'}])
    const html=characterPrintHtml({...hero,level:3,characterName:'Bardo',className:'Bard',rulesState:JSON.stringify({classChoices:{'jack-1':'skill:Climbing'}})},definition)
    expect(html).toContain('<h2>Jack of All Trades</h2>')
    expect(html).toContain('<dt>Climbing</dt><dd>4+</dd>')
  })
  it('uses the recorded Witch tradition in the sheet and export even when the old subclass field disagrees',()=>{
    const definition={name:'Witch',source:'catalog',rules:RULE_CLASSES.Witch} as CatalogClass
    const character={...hero,level:1,className:'Witch',subclass:'Chthonic',rulesState:JSON.stringify({classChoices:{tradition:'Antiquarian'}})}
    const feats=classDefinitionFeats(definition,'Witch',1,'Chthonic',[],character)
    expect(feats.powers.map(power=>power.name)).toContain('Traditional Medicine')
    expect(feats.powers.map(power=>power.name)).not.toContain('Bedazzling Glamour')
    expect(characterExport(character,definition).character).toMatchObject({subclass:'Antiquarian'})
    expect(characterPrintHtml(character,definition)).toContain('Traditional Medicine')
    expect(characterPrintHtml(character,definition)).not.toContain('Bedazzling Glamour')
  })
  it('recognizes repertoire expansion supplied by a constructed class definition',()=>{
    expect(choiceMagicPools({...RULE_CLASSES.Mage,abilityPowers:[{name:'Expanded Repertoire',minimumLevel:1}]},10,1)[0]!.repertoire[0]).toBe(2)
    const delayed={...RULE_CLASSES.Mage,abilityPowers:[{name:'Expanded Repertoire',minimumLevel:3}]}
    expect(choiceMagicPools(delayed,10,1)[0]!.repertoire[0]).toBe(1)
    expect(choiceMagicPools(delayed,10,3)[0]!.repertoire[0]).toBe(3)
  })
})
