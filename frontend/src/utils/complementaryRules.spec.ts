import {describe,it,expect} from 'vitest'
import {ruleProfile} from '../../../backend/src/lib/ruleProfiles'
import {RULE_CLASSES,SPELL_LIST} from '../../../backend/src/lib/gameRules'
import {classEffects} from './classEffects'
import {getWeaponAbilityModifier,calculateAttackThrow} from './mechanics'
import {calculateCharacterMetrics} from './characterMetrics'
import {getClassFeats} from './classFeats'
import {classDefinitionFeats} from './classDefinitionFeats'
import {characterPrintHtml} from './characterExport'
import {proficiencyValidation,choiceMagicPools,spellValidation} from './ruleChoices'
import type {CatalogClass} from './catalog'
const hero={level:1,str:10,dex:16,int:10,wil:10,con:10,cha:10,proficiencies:[] as any[]}
describe('complementary audit rendered rules',()=>{
  it('uses Bladedancer finesse for swords and spears, including large ones, with a voluntary STR choice',()=>{
    const effects=classEffects(hero,ruleProfile('Bladedancer')),weapon={name:'Two-Handed Sword',style:'Two-Handed Weapon',attackThrow:10}
    expect(effects.finesseFor(weapon)).toBe(true)
    expect(calculateAttackThrow(10,0,getWeaponAbilityModifier(weapon,0,2,effects.finesseFor(weapon)))).toBe(8)
    expect(effects.attackAttributeFor({...weapon,attackAbility:'str'})).toBe('str')
    expect(effects.finesseFor({name:'Battle Axe',style:'Single Weapon'})).toBe(false)
    expect(effects.finesseFor({name:'Sword',catalogId:'w-sword',style:'Single Weapon'})).toBe(true)
  })
  it('limits ordinary Weapon Finesse to known tiny, small and medium melee weapons',()=>{
    const effects=classEffects({...hero,proficiencies:[{name:'Weapon Finesse',category:'class'}]},ruleProfile('Fighter'))
    expect(effects.finesseFor({name:'Sword'})).toBe(true);expect(effects.finesseFor({name:'Great Axe'})).toBe(false)
    expect(effects.finesseFor({name:'Staff',style:'Two-Handed Weapon'})).toBe(true)
    expect(effects.finesseFor({name:'Staff Sling',style:'Two-Handed Weapon',rangeShort:75})).toBe(true)
    expect(effects.finesseFor({name:'Unknown homebrew weapon'})).toBe(false)
    expect(effects.attackAttributeFor({name:'Sword',attackAbility:'dex'})).toBe('dex')
    expect(classEffects({...hero,str:18},ruleProfile('Bladedancer')).attackAttributeFor({name:'Sword'})).toBe('str')
  })
  it('classifies empty-style ranged weapons consistently for attack and class damage',()=>{
    const effects=classEffects({...hero,level:6},ruleProfile('Paladin')),bow={name:'Longbow',style:'',rangeShort:120}
    expect(effects.attackAttributeFor(bow)).toBe('dex');expect(effects.weaponDamageBonusFor(bow)).toBe(0)
    expect(effects.weaponDamageBonusFor({name:'Sword',style:'Single Weapon'})).toBe(3)
  })
  it('exports the same finesse attack target as the sheet',()=>{
    const definition={name:'Bladedancer',source:'catalog',rules:RULE_CLASSES.Bladedancer,ruleProfile:ruleProfile('Bladedancer')} as CatalogClass
    expect(characterPrintHtml({...hero,weapons:[{name:'Sword',style:'Single Weapon',attackThrow:10}]},definition)).toContain('DEX · alvo contra CA 0: 8+')
  })
  it('does not apply stale natural Running after a class change',()=>{
    const character={...hero,proficiencies:[{name:'Running',category:'natural'}]}
    expect(calculateCharacterMetrics(character,{ruleProfile:ruleProfile('Fighter')} as CatalogClass).encumbrance.moveExploration).toBe(120)
  })
  it.each([1,3,6,7,11])('shows the printed Nightblade Climbing target at level %i',level=>{
    expect(getClassFeats('Elven Nightblade',level).levelStats.find(section=>section.sectionTitle==='Nightblade Skills')?.stats.find(stat=>stat.label==='Climbing')?.value).toBe(`${7-level}+`)
  })
  it('shows only the Warlock path stored in protected choices, even with a disagreeing legacy field',()=>{
    const definition={name:'Warlock',source:'catalog',rules:RULE_CLASSES.Warlock} as CatalogClass
    const feats=classDefinitionFeats(definition,'Warlock',7,'Transmogrification',[],{...hero,level:7,rulesState:JSON.stringify({classChoices:{'dark-path':'Demonology'}})})
    expect(feats.availableSubclasses).toEqual(['Demonology','Necromancy','Transmogrification'])
    expect(feats.powers.map(power=>power.name)).toContain('Conjure Hellion')
    expect(feats.powers.map(power=>power.name)).not.toContain('Skinchange')
    expect(feats.powers.map(power=>power.name)).not.toContain('Speak with Dead')
    expect(getClassFeats('Warlock',1).powers.some(power=>power.subPath)).toBe(false)
  })
  it('keeps frontend path slot validation consistent with the API',()=>{
    const character={...hero,level:7,subclass:'Demonology'},pools=choiceMagicPools(RULE_CLASSES.Warlock,10,7,character)
    const ordinary=SPELL_LIST.filter(spell=>spell.tradition==='arcane'&&spell.level===1&&!spell.types.includes('sum')).slice(0,4)
    expect(pools[0]!.repertoire[0]).toBe(4)
    expect(spellValidation(pools,ordinary,SPELL_LIST).issues.join(' ')).toContain('vaga extra')
    expect(spellValidation(pools,[],SPELL_LIST).issues).toEqual([])
  })
  it('removes duplicate Bladedancer descriptions and uses the revised prayer time',()=>{
    const powers=getClassFeats('Bladedancer',14).powers
    expect(new Set(powers.map(power=>power.name)).size).toBe(powers.length)
    expect(powers.some(power=>/priestess|p\. XX/i.test(power.description))).toBe(false)
    expect(powers.find(power=>power.name==='Code of Behavior')?.description).toContain('uma hora ao amanhecer OU ao anoitecer')
  })
  it('uses the same single-rank rules for frontend proficiency validation',()=>{
    const choices=[{name:'Diplomacy',category:'general'},{name:'Diplomacy',category:'general'}]
    expect(proficiencyValidation(RULE_CLASSES.Mage,10,choices,['Diplomacy'],5).issues.join(' ')).toContain('não pode ser repetida')
    expect(proficiencyValidation(RULE_CLASSES['Dwarven Craftpriest'],10,[{name:'Craft (brewing)',category:'general'}],['Craft'],1,[{name:'Craft (brewing)',ranks:3}]).issues).toEqual([])
  })
})
