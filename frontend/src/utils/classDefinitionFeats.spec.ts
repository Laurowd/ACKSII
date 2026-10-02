import {describe,it,expect} from 'vitest'
import {classDefinitionFeats} from './classDefinitionFeats'
import {classEffects} from './classEffects'
import {selectedClass,type CatalogClass} from './catalog'
import {calculateCharacterMetrics} from './characterMetrics'
import {characterExport,characterPrintHtml} from './characterExport'
import {choiceMagicPools,spellValidation} from './ruleChoices'

const base={id:'catalog:fighter',name:'Fighter',source:'catalog',legacyIds:['old-fighter']} as CatalogClass
const custom={id:'custom-fighter',name:'Fighter',source:'campaign',powers:[{name:'Animal Reflexes',description:'Reflexos',minimumLevel:3}]} as CatalogClass

describe('campaign class definitions on sheets',()=>{
  it('resolves seeded aliases to the canonical class and preserves true variants',()=>{
    expect(selectedClass([base,custom],{classKey:'old-fighter',className:'Fighter'})).toBe(base)
    expect(selectedClass([base,custom],{classKey:custom.id,className:'Fighter'})).toBe(custom)
  })
  it('does not inherit builtin powers by name and unlocks custom powers at the defined level',()=>{
    const first=classDefinitionFeats(custom,'Fighter',1)
    expect(first.powers).toEqual([])
    expect(first.futurePowers.map(p=>p.name)).toEqual(['Animal Reflexes'])
    expect(classDefinitionFeats(custom,'Fighter',3).powers.map(p=>p.name)).toEqual(['Animal Reflexes'])
    expect(classDefinitionFeats(base,'Fighter',1).powers.some(p=>p.name==='Manual of Arms')).toBe(true)
  })
  it('inherits powers only through an explicit catalog base',()=>{
    const copy={...custom,powers:undefined,baseClassKey:base.id}
    expect(classDefinitionFeats(copy,'Fighter',1,'',[base]).powers.some(p=>p.name==='Manual of Arms')).toBe(true)
  })
  it('prints descriptions of acquired powers with escaped text and preserves class restrictions',()=>{
    const definition={...custom,classFeatures:'Armadura: Medium',powers:[{name:'<Vigília>',description:'Protege & observa',minimumLevel:3},{name:'Poder futuro',description:'Futuro',minimumLevel:10}]}
    const html=characterPrintHtml({characterName:'Guarda',className:'Fighter',level:3},definition)
    expect(html).toContain('&lt;Vigília&gt;')
    expect(html).toContain('Protege &amp; observa')
    expect(html).toContain('Armadura: Medium')
    expect(html).not.toContain('<strong>Poder futuro</strong>')
  })
  it('applies power effects only once and only after acquisition',()=>{
    const profile={powers:[...custom.powers!,{name:'Combat Reflexes',minimumLevel:5}]}
    expect(classEffects({dex:10,level:1},profile).initiative).toBe(0)
    expect(classEffects({dex:10,level:3},profile).initiative).toBe(1)
    expect(classEffects({dex:10,level:5,proficiencies:[{name:'Combat Reflexes'}]},profile).initiative).toBe(2)
    expect(classEffects({dex:10,level:5},profile).castingInitiative).toBe(0)
  })
  it('uses halfling carrying capacity and movement in both the sheet and export',()=>{
    const definition={...custom,ruleProfile:{race:'halfling'}}
    const character={str:10,dex:10,items:[{weight:4,quantity:1}]}
    expect(calculateCharacterMetrics(character,definition).encumbrance).toMatchObject({maxCapacity:12,moveExploration:60,moveCombat:20})
    expect(calculateCharacterMetrics({...character,items:[]},definition).encumbrance.moveExploration).toBe(90)
    expect((characterExport(character,definition).character as any).moveCombat).toBe(20)
    expect(classEffects({str:10},definition.ruleProfile).adventuringTarget('Dungeonbashing')).toBe(22)
  })
  it('restricts divine suggestions and validation to the religious class repertoire',()=>{
    const allowed={name:'Cure Light Wounds',level:1,tradition:'divine'}
    const excluded={name:'Light',level:1,tradition:'divine'}
    const rules={magic:'divine',levels:[{spellSlots:[1,0,0,0,0,0]}],divineSpellList:[allowed]}
    const pools=choiceMagicPools(rules,10)
    expect(pools[0]?.spellList).toEqual([allowed])
    expect(spellValidation(pools,[excluded],[allowed,excluded]).issues).toEqual(['Light: não pertence ao repertório religioso desta classe.'])
    expect(spellValidation(pools,[allowed],[allowed,excluded]).issues).toEqual([])
  })
})
