import {describe,it,expect} from 'vitest'
import {buildClass,ClassBuild} from './classBuilder'
import {POWER_TRADES,resolvePowerChoice} from './classPowerPlan'
import {legacyBaseName} from './legacyClasses'
import {RAW_DEFAULT_CLASSES,DEFAULT_CLASSES} from '../utils/seedClasses'
import {magicPools,spellIssues,SPELL_LIST} from './gameRules'
import {initialAdventuring} from './creationRules'

const list=(n=28)=>Array.from({length:n},(_,i)=>`Proficiência ${i}`)
const build:ClassBuild={name:'Sentinela',race:'human',racial:0,hd:2,fighting:2,thievery:0,divine:0,arcane:0,fightingVariant:'crusader',armorTrade:0,weaponTrade:0,styleTrade:0,damageTrade:'none',thiefSkills:[],powers:[],startingProficiency:'Manual of Arms',proficiencies:list(),keyAttributes:['str'],stronghold:'Castle',smoothXp:true}
const power=(name='Poder')=>({name,description:'Descrição registrada pelo mestre.',kind:'power' as const})
const religiousList=(count:number)=>[1,2,3,4,5].flatMap(level=>SPELL_LIST.filter(s=>s.tradition==='divine'&&s.level===level).slice(0,count).map(s=>({...s,tradition:'divine' as const})))
const legacy=(base:any)=>({...base,id:'old',creationRules:'{}',description:'',classFeatures:'',baseClassKey:'',thiefSkills:'[]',rebukingUndead:'[]',...Object.fromEntries(['xpPerLevel','titles','attackThrows','savingThrows'].map(key=>[key,JSON.stringify(base[key])]))})

describe('point-built classes from Judges Journal pp. 289–306',()=>{
  it('supports initial and chained advanced power trades at the specified levels',()=>{
    const result=buildClass({...build,armorTrade:1,powerSelections:[{trade:'1-7-7',children:[{trade:'advanced-7-9-13',children:[power('A'),power('B')]},power('C')]}]})
    expect(result.creationRules.powers.filter(p=>['A','B','C'].includes(p.name)).map(p=>p.minimumLevel)).toEqual([9,13,7])
    expect(result.summary.powerBudget).toBe(1)
    expect(result.creationRules.powers.find(p=>p.name==='Battlefield Prowess')?.minimumLevel).toBe(5)
  })
  it('accepts every published trade and rejects invalid child costs and acquisition levels',()=>{
    for(const trade of POWER_TRADES){const resolved=resolvePowerChoice({trade:trade.id,children:trade.levels.map(()=>power())},trade.from,14,[]);expect(resolved.cost).toBe(trade.cost);expect(resolved.powers.map(p=>p.minimumLevel)).toEqual(trade.levels)}
    expect(()=>resolvePowerChoice({trade:'1-4-10',children:[{name:'Backstabbing',kind:'skill'},power()]},1,14,['Backstabbing'])).toThrow('única escolha')
    expect(()=>resolvePowerChoice({trade:'advanced-7-9-13',children:[power(),power()]},1,14,[])).toThrow('incompatível')
    expect(()=>buildClass({...build,race:'elf',racial:3,hd:1,arcane:1,keyAttributes:['str','int'],proficiencies:list(32),armorTrade:1,powerSelections:[{trade:'1-2-12',children:[power(),power()]}]})).toThrow('acima do máximo')
  })
  it('restricts thief skills to Thievery choices and resolves their throws at class level',()=>{
    const base={...build,hd:0,fighting:1,thievery:3,fightingVariant:'thief' as const,keyAttributes:['dex'],stronghold:'Hideout',thiefSkills:['Backstabbing','Climbing','Hiding','Listening','Lockpicking','Pickpocketing','Searching','Shadowy Senses','Sneaking','Trapbreaking']}
    const result=buildClass({...base,thiefSelections:[{trade:'1-4-10',children:[{name:'Deciphering',kind:'skill'},{name:'Scrollreading',kind:'skill'}]}]})
    expect(result.creationRules.powers.find(p=>p.name==='Deciphering')).toMatchObject({minimumLevel:4,kind:'skill'})
    expect(result.thiefSkills[9]).toMatchObject({Climbing:-3,Searching:5})
    expect(()=>buildClass({...build,armorTrade:1,powerSelections:[{name:'Hiding',kind:'skill'}]})).toThrow('só podem usar')
    expect(()=>buildClass({...build,hd:1,thievery:1,thiefSelections:[{trade:'1-7-7',children:[{name:'Hiding',kind:'skill'},{name:'Hiding',kind:'skill'}]}],powers:['A','B','C']})).toThrow('duas vezes')
  })
  it('uses the delayed arcane tables, with independent caster levels and no early spells',()=>{
    const result=buildClass({...build,hd:1,arcane:1,keyAttributes:['str','int'],delayedArcane:true})
    expect(magicPools(result.creationRules.rules,{level:7,int:18})[0]).toMatchObject({casterLevel:0,slots:[0,0,0,0,0,0]})
    expect(magicPools(result.creationRules.rules,{level:8,int:10})[0]).toMatchObject({casterLevel:3,slots:[2,1,0,0,0,0]})
    expect(result.creationRules.rules.levels[13]?.arcaneCasterLevel).toBe(10)
    expect(()=>buildClass({...build,hd:0,fighting:0,arcane:4,keyAttributes:['int'],stronghold:'Sanctum',delayedArcane:true})).toThrow('1 a 3')
  })
  it('exchanges rebuking for Divine-value powers without changing spellcasting',()=>{
    const divine={...build,hd:1,fighting:1,divine:2,keyAttributes:['wil'],stronghold:'Fortified Church',codeOfBehavior:'Votos da ordem',divineSpellList:religiousList(10)}
    const regular=buildClass(divine),traded=buildClass({...divine,tradeRebuking:true,powerSelections:[{trade:'2-3-5-7',children:[power('A'),power('B'),power('C')]}]})
    expect(traded.rebukingUndead).toEqual([])
    expect(traded.creationRules.rules.levels).toEqual(regular.creationRules.rules.levels)
    expect(regular.rebukingUndead[3]).toMatchObject({skeleton:'R',ghoul:'7+'})
    expect(()=>buildClass({...divine,codeOfBehavior:''})).toThrow('código de conduta')
    expect(()=>buildClass({...divine,divineSpellList:undefined})).toThrow('Defina o repertório religioso')
  })
  it('validates and enforces the religious spell list on character choices',()=>{
    const divineSpellList=[1,2,3,4,5].flatMap(level=>SPELL_LIST.filter(s=>s.tradition==='divine'&&s.level===level).slice(0,10).map(s=>({...s,tradition:'divine' as const})))
    const result=buildClass({...build,hd:1,fighting:1,divine:2,keyAttributes:['wil'],codeOfBehavior:'Votos',divineSpellList})
    expect(result.creationRules.rules.divineSpellList).toHaveLength(50)
    const excluded=SPELL_LIST.find(s=>s.tradition==='divine'&&s.level===1&&!divineSpellList.some(p=>p.name===s.name))!
    expect(spellIssues(result.creationRules.rules,{level:1,int:10},[excluded])).toContain(`${excluded.name}: não pertence ao repertório religioso desta classe.`)
    expect(()=>buildClass({...build,hd:1,fighting:1,divine:2,keyAttributes:['wil'],codeOfBehavior:'Votos',divineSpellList:[]})).toThrow('10 magias')
  })
  it('reproduces the halfling Bounder example and applies racial restrictions',()=>{
    const result=buildClass({...build,race:'halfling',racial:4,weaponTrade:1,powers:['Poder'],halflingSkills:['Hiding','Listening','Swashbuckling','Placating'],proficiencies:list(34)})
    expect(result).toMatchObject({hitDie:'1d6',summary:{maxLevel:8,xpSecond:2100,xpAfter8:120000}})
    expect(result.creationRules.minimumAttributes.dex).toBe(9)
    expect(initialAdventuring(10,'',result.creationRules.ruleProfile)[0]?.throwTarget).toBe(22)
    expect(()=>buildClass({...build,race:'halfling',hd:1,arcane:1})).toThrow('não podem comprar Arcane')
  })
  it('preserves all six Nobiran minimum attributes and applies racial skill bonuses',()=>{
    const nobiran=buildClass({...build,race:'nobiran',racial:2,codeOfBehavior:'Votos',divineSpellList:religiousList(10),proficiencies:list(30)})
    expect(Object.values(nobiran.creationRules.minimumAttributes)).toEqual([11,11,11,11,11,11])
    const dwarf=buildClass({...build,race:'dwarf',racial:1,hd:1,thievery:1,thiefSkills:['Climbing','Listening','Searching','Sneaking'],proficiencies:list(30)})
    expect(dwarf.thiefSkills[0]).toMatchObject({Climbing:5,Listening:11,Searching:13,Sneaking:16})
    expect(initialAdventuring(10,'',dwarf.creationRules.ruleProfile).find(p=>p.name==='Searching')?.throwTarget).toBe(14)
  })
})

describe('legacy campaign copies',()=>{
  it('recognizes original 14-level seeds and corrected catalog copies without deleting records',()=>{
    for(const base of [...RAW_DEFAULT_CLASSES,...DEFAULT_CLASSES])expect(legacyBaseName(legacy(base))).toBe(base.name)
    expect(DEFAULT_CLASSES.find(c=>c.name==='Elven Spellsword')?.xpPerLevel).toHaveLength(10)
  })
  it('preserves genuine same-name variants, metadata, features and changed tables',()=>{
    const old=legacy(RAW_DEFAULT_CLASSES[0])
    for(const changed of [{description:'Minha classe'},{classFeatures:'Poder diferente'},{baseClassKey:'catalog:fighter'},{creationRules:'{"keyAttributes":["con"]}'},{xpPerLevel:'[0,2100]'},{thiefSkills:'[{"Searching":12}]'}])expect(legacyBaseName({...old,...changed})).toBeNull()
  })
})
