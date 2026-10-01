import {describe,it,expect} from 'vitest'
import {classEffects} from './classEffects'
import {getClassFeats} from './classFeats'
describe('class effects',()=>{
  it('shows sources and excludes combat-only bonuses when casting',()=>{
    const c={dex:16,level:3,proficiencies:[{name:'Combat Reflexes'},{name:'Combat Ferocity'}]}
    expect(classEffects(c,{initiative:1,initiativeSource:'Animal Reflexes',alertness:true,damageProgression:'fighter',cleaveProgression:'full'})).toMatchObject({initiative:4,castingInitiative:2,avoidSurprise:3,damageBonus:2,cleaves:4})
  })
  it('keeps situational AC bonuses conditional and floors half cleaves',()=>{
    const e=classEffects({dex:10,level:7,proficiencies:[{name:'Swashbuckling'}]},{gracefulFighting:true,cleaveProgression:'half'})
    expect(e.initiative).toBe(0);expect(e.cleaves).toBe(3);expect(e.conditional).toHaveLength(2)
    expect(e.conditional[0]).toContain('+2 CA')
  })
  it('separates powers unlocked at future levels',()=>{
    const one=getClassFeats('Fighter',1),nine=getClassFeats('Fighter',9)
    expect(one.powers.every(p=>(p.minimumLevel||1)<=1)).toBe(true)
    expect(nine.powers.every(p=>(p.minimumLevel||1)<=9)).toBe(true)
    expect(one.futurePowers.every(p=>(p.minimumLevel||1)>1)).toBe(true)
  })
})
