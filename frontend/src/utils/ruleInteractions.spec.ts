import { describe, expect, it } from 'vitest'
import { calculateCharacterMetrics } from './characterMetrics'
import { characterPrintHtml } from './characterExport'
import { shieldProficiency, armorCategory } from '../../../backend/src/lib/combatEquipment'
import type { CatalogClass } from './catalog'
import { creationSettings } from './creation'
const profile=(name:string,extra:any={})=>({name,xpPerLevel:'[0]',ruleProfile:{className:name,...extra}} as CatalogClass)
describe('combat interactions match the revised books',()=>{
  it('adds Graceful Fighting to both initiatives but never adds Animal Reflexes to casting',()=>{
    const character={level:7,dex:16,str:10,armorName:'Leather',armorWeight:2,armorAcBonus:2,rulesState:JSON.stringify({combat:{powersEnabled:true,lightArmor:true,modifiers:[]}})}
    expect(calculateCharacterMetrics(character,profile('Bladedancer',{gracefulFighting:true}))).toMatchObject({initiative:3,castingInitiative:3})
    expect(calculateCharacterMetrics({...character,proficiencies:[{name:'Combat Reflexes'}]},profile('Bladedancer',{gracefulFighting:true,initiative:1,initiativeSource:'Animal Reflexes'}))).toMatchObject({initiative:5,castingInitiative:3})
  })
  it('does not give a Mage a shield benefit, including in printing',()=>{
    const mage={characterName:'Mage',className:'Mage',dex:10,str:10}
    expect(calculateCharacterMetrics(mage,profile('Mage')).armorClass).toMatchObject({noShield:0,withShield:0})
    expect(characterPrintHtml(mage,profile('Mage'))).toContain('CA com escudo</dt><dd>0</dd>')
    expect(calculateCharacterMetrics({...mage,className:'Fighter'},profile('Fighter')).armorClass.withShield).toBe(1)
    expect(shieldProficiency({...mage,proficiencies:[{name:'Fighting Style (Weapon and Shield)',category:'class'}]},profile('Mage'))).toBe(true)
    expect(shieldProficiency(mage,{creationRules:JSON.stringify({build:{fighting:1,styleTrade:0,fightingStyles:['Dual Weapon','Weapon and Shield']}})})).toBe(true)
    expect(shieldProficiency(mage,{creationRules:JSON.stringify({build:{fighting:1,styleTrade:0,fightingStyles:['Dual Weapon','Two-Handed Weapon']}})})).toBe(false)
    expect(shieldProficiency(mage,{creationRules:JSON.stringify({build:{fighting:2,armorTrade:4,styleTrade:0}})})).toBe(false)
  })
  it('never treats a lightweight plate armor as light or medium for Running',()=>{
    const halfling={level:1,str:10,dex:10,armorName:'Plate Armor',armorWeight:3.6,armorAcBonus:6,proficiencies:[{name:'Running'}]}
    expect(calculateCharacterMetrics(halfling,profile('Custom',{race:'halfling'})).encumbrance).toMatchObject({moveExploration:60,moveCombat:20})
    expect(armorCategory({...halfling,armorName:'Arena Armor, Heavy'})).toBe('medium')
    expect(calculateCharacterMetrics({...halfling,armorName:'Leather Armor',armorAcBonus:2},profile('Custom',{race:'halfling'})).encumbrance).toMatchObject({moveExploration:90,moveCombat:30})
  })
  it('requires a known or selected category for custom armor instead of guessing from weight',()=>{
    const character={str:10,dex:10,armorName:'Campaign armor',armorWeight:1,proficiencies:[{name:'Running'}]}
    expect(calculateCharacterMetrics(character).movementSources).toEqual([])
    expect(calculateCharacterMetrics({...character,rulesState:JSON.stringify({combat:{powersEnabled:false,lightArmor:false,armorCategory:'medium',modifiers:[]}})}).movementSources).toEqual([{source:'Running',value:30}])
    expect(calculateCharacterMetrics({...character,armorName:'Plate Armor',armorWeight:3.6,rulesState:JSON.stringify({combat:{powersEnabled:false,lightArmor:false,armorCategory:'medium',armorCategoryFor:character.armorName,modifiers:[]}})}).movementSources).toEqual([])
  })
  it('retains racial bonuses when the frontend reads an older constructed class',()=>{
    const definition={source:'campaign',creationRules:JSON.stringify({rules:{magic:'none'},ruleProfile:{race:'dwarf',racialValue:2}})} as CatalogClass
    expect(creationSettings(definition).rules).toMatchObject({race:'dwarf',racialValue:2,proficiencyBonus:2})
  })
})
