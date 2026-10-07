import {describe,it,expect,vi} from 'vitest'
vi.mock('./prisma',()=>({default:{}}))
import {RULE_CLASSES,magicPools,proficiencyIssues,spellIssues,SPELL_LIST} from './gameRules'
import {classChoiceIssues,classGrants,abilityProficiencies} from './classAbilities'
import {proficiencyRankIssues,newProficiencyTarget} from './proficiencyRanks'
import {levelReconciliation,learnedProficiencyRows} from './levelReconciliation'
import {classRevisionPlan} from './classRevisionPlan'
import {CLASS_CATALOG} from './classCatalog'
import {prepareCharacterImport} from './characterImport'
const hero={level:1,str:10,int:10,dex:10,wil:10,con:10,cha:10,proficiencies:[] as any[]}
describe('complementary audit regressions',()=>{
  it('defaults proficiencies to single-rank and rejects decorative specialization bypasses',()=>{
    expect(proficiencyRankIssues([{name:'Diplomacy',category:'general'},{name:'Diplomacy (court)',category:'general'}]).join(' ')).toContain('não pode ser repetida')
    expect(proficiencyRankIssues([{name:'Seduction',category:'class'},{name:'Seduction',category:'general'}])).toHaveLength(1)
    expect(proficiencyRankIssues([{name:'Weapon Focus (swords)',category:'class'},{name:'Weapon Focus (spears)',category:'class'}])).toEqual([])
    expect(proficiencyRankIssues([{name:'Weapon Focus (swords)',category:'class'},{name:'Weapon Focus (swords)',category:'class'}])).toHaveLength(1)
  })
  it('allows explicitly repeatable ranks and respects the stated Military Strategy limit',()=>{
    expect(proficiencyRankIssues(Array.from({length:3},()=>({name:'Military Strategy',category:'class'})))).toEqual([])
    expect(proficiencyRankIssues(Array.from({length:4},()=>({name:'Military Strategy',category:'class'}))).join(' ')).toContain('máximo três')
    expect(proficiencyRankIssues([{name:'Alchemy',category:'class'},{name:'Alchemy',category:'general'}])).toEqual([])
  })
  it('counts three free Craft ranks and initializes the fourth without altering their explicit class target',()=>{
    const character={...hero,classChoices:{craft:'Craft (brewing)'}},rules=RULE_CLASSES['Dwarven Craftpriest']!
    expect(proficiencyIssues(rules,character,[{name:'Craft (brewing)',category:'general'}])).toEqual([])
    expect(classGrants(rules,character)[0]).toMatchObject({ranks:3,throwTarget:2})
    expect(learnedProficiencyRows(character,rules,[{name:'Craft (brewing)',category:'general'}])[0]).toMatchObject({throwTarget:-1})
    expect(newProficiencyTarget('Art (painting)',3)).toBe(3)
  })
  it('requires Warlock Dark Path and recognizes an existing legacy subclass',()=>{
    expect(classChoiceIssues(RULE_CLASSES.Warlock!,hero,undefined,true).join(' ')).toContain('Dark Path')
    expect(classChoiceIssues(RULE_CLASSES.Warlock!,{...hero,subclass:'Necromancy'},undefined,true)).toEqual([])
    expect(classGrants(RULE_CLASSES.Warlock!,{...hero,level:3,subclass:'Necromancy'})[0]).toMatchObject({name:'Healing',ranks:1})
    expect(classGrants(RULE_CLASSES.Warlock!,{...hero,level:3,classChoices:{'dark-path':'Transmogrification'}})[0]).toMatchObject({name:'Alchemy'})
  })
  it('grants the path repertoire slot at seven without granting daily uses',()=>{
    const rules=RULE_CLASSES.Warlock!,character={...hero,level:7,classChoices:{'dark-path':'Demonology'}},pool=magicPools(rules,character)[0]!
    expect(pool).toMatchObject({slots:[3,2,2,1,0,0],repertoire:[4,3,3,2,0,0],restricted:{path:'Demonology',types:['sum']}})
    expect(magicPools(rules,{...character,level:6})[0]!.restricted).toBeUndefined()
    expect(magicPools(rules,{...character,proficiencies:[{name:'Expanded Repertoire',category:'class'}]})[0]!.repertoire[0]).toBe(5)
    expect(spellIssues(rules,character,[])).toEqual([])
  })
  it('reserves the extra slot for authoritative path types, including published homebrew',()=>{
    const rules=RULE_CLASSES.Warlock!,character={...hero,level:7,classChoices:{'dark-path':'Demonology'}}
    const ordinary=SPELL_LIST.filter(spell=>spell.tradition==='arcane' && spell.level===1 && !spell.types.includes('sum')).slice(0,4)
    expect(spellIssues(rules,character,ordinary).join(' ')).toContain('vaga extra')
    const summoning=SPELL_LIST.find(spell=>spell.tradition==='arcane' && spell.level===1 && spell.types.includes('sum'))!
    expect(spellIssues(rules,character,[...ordinary.slice(0,3),summoning])).toEqual([])
    const custom={name:'Custom fiend',level:1,tradition:'arcane',campaignSpellId:'published',types:['sum']}
    expect(spellIssues(rules,character,[...ordinary.slice(0,3),custom],7,[...SPELL_LIST,custom])).toEqual([])
    expect(spellIssues(rules,character,[...ordinary.slice(0,3),{...custom,types:['sum']}],7,[...SPELL_LIST,{...custom,types:[]}]).join(' ')).toContain('vaga extra')
  })
  it('has source types for every catalog spell',()=>{
    expect(SPELL_LIST).toHaveLength(396)
    expect(SPELL_LIST.every(spell=>spell.types.length>0)).toBe(true)
    expect(SPELL_LIST.find(spell=>spell.name==='Arcane Armor')?.types).toContain('pro')
  })
  it('carries manual skill offsets through direct level edits and adds unlocked grants',()=>{
    const character={...hero,className:'Barbarian',rulesState:JSON.stringify({proficiencyOrigin:'jutland',classChoices:{'damage-specialization':'melee'}}),proficiencies:[{id:'climb',name:'Climbing',category:'natural',throwTarget:8}]}
    expect(levelReconciliation(character,RULE_CLASSES.Barbarian!,2).targets[0]).toMatchObject({id:'climb',throwTarget:7})
    expect(levelReconciliation({...character,proficiencies:[{id:'climb',name:'climbing',category:'natural',throwTarget:8}]},RULE_CLASSES.Barbarian!,2).targets[0]).toMatchObject({id:'climb',throwTarget:7})
    expect(levelReconciliation({...hero,level:2,subclass:'Necromancy'},RULE_CLASSES.Warlock!,3).added[0]).toMatchObject({name:'Healing'})
    expect(levelReconciliation({...hero,level:5,proficiencies:[{id:'lore',name:'Loremastery',category:'class',throwTarget:16}]},RULE_CLASSES.Bard!,6).targets[0].throwTarget).toBe(15)
  })
  it('does not activate orphaned natural powers until the master approves their retention',()=>{
    const character={...hero,rulesState:JSON.stringify({proficiencyOrigin:'ivory-kingdoms'}),proficiencies:[{id:'run',name:'Running',category:'natural',throwTarget:11}]}
    expect(abilityProficiencies(character,RULE_CLASSES.Fighter!).map(row=>row.name)).toEqual(['Manual of Arms'])
    expect(abilityProficiencies({...character,rulesState:JSON.stringify({retainedClassGrants:[{name:'Running',ranks:1,throwTarget:11,fromClass:'Barbarian'}]})},RULE_CLASSES.Fighter!).map(row=>row.name)).toEqual(['Running','Manual of Arms'])
  })
  it('reviews a class switch, preserving balances and paid rows while removing old choices',()=>{
    const before=CLASS_CATALOG.find(row=>row.name==='Barbarian')!,after=CLASS_CATALOG.find(row=>row.name==='Fighter')!
    const character={...hero,classKey:before.id,className:before.name,xp:1200,hpMax:8,coinGP:123,rulesState:JSON.stringify({proficiencyOrigin:'ivory-kingdoms',classChoices:{'damage-specialization':'melee'},used:{'arcane:1':1}}),proficiencies:[{id:'run',name:'Running',category:'natural',throwTarget:11},{id:'paid',name:'Caving',category:'general',throwTarget:9}]}
    const plan=classRevisionPlan(character,before,after,{keepNaturalIds:[],choices:{}},false)
    expect(plan.removed.map(row=>row.id)).toEqual(['run']);expect(plan.proficiencies.find(row=>row.id==='paid')).toMatchObject({throwTarget:9})
    expect(plan.state.classChoices).toEqual({});expect(plan.state.proficiencyOrigin).toBeUndefined();expect(plan.state.used).toEqual({'arcane:1':1})
    expect(plan.fields).not.toHaveProperty('xp');expect(plan.fields).not.toHaveProperty('hpMax');expect(plan.fields).not.toHaveProperty('coinGP')
    const retained=classRevisionPlan(character,before,after,{keepNaturalIds:['run'],choices:{}},false)
    expect(retained.removed).toEqual([]);expect(abilityProficiencies(retained.next,RULE_CLASSES.Fighter!).map(row=>row.name)).toContain('Running')
    const reviewed=classRevisionPlan({...retained.next,rulesState:JSON.stringify({...retained.state,proficiencyOrigin:'ivory-kingdoms',totemStatus:{alive:true}})},after,after,{keepNaturalIds:['run'],choices:{}},false)
    expect(reviewed.removed).toEqual([]);expect(reviewed.state.proficiencyOrigin).toBeUndefined();expect(reviewed.state.totemStatus).toBeUndefined()
    expect(()=>classRevisionPlan(character,before,after,{keepNaturalIds:['other-character']},false)).toThrow('não pertence')
  })
  it('does not transfer master approval for retained powers through JSON import',()=>{
    const imported=prepareCharacterImport({characterName:'Copy',rulesState:JSON.stringify({retainedClassGrants:[{name:'Running',ranks:1,throwTarget:11}]})})
    expect(JSON.parse(imported.fields.rulesState).retainedClassGrants).toBeUndefined()
    expect(imported.warnings.join(' ')).toContain('aprovadas novamente')
  })
  it('retains offsets when class revision changes racial Adventuring bases and the Craftpriest bonus',()=>{
    const before=CLASS_CATALOG.find(row=>row.name==='Dwarven Craftpriest')!,after=CLASS_CATALOG.find(row=>row.name==='Fighter')!
    const oldBase={...hero,classKey:before.id,className:before.name,rulesState:JSON.stringify({adventuringProficiencyBonus:3,classChoices:{craft:'Craft (brewing)'}}),proficiencies:[{id:'listen',name:'Listening',category:'adventuring',throwTarget:13},{id:'climb',name:'Climbing',category:'adventuring',throwTarget:5},{id:'paid',name:'Caving',category:'general',throwTarget:9}]}
    const plan=classRevisionPlan(oldBase,before,after,{keepNaturalIds:[],choices:{}},false)
    expect(plan.targets.find(row=>row.id==='listen')?.throwTarget).toBe(17)
    expect(plan.targets.find(row=>row.id==='climb')?.throwTarget).toBe(8)
    expect(plan.targets.find(row=>row.id==='paid')?.throwTarget).toBe(12)
    expect(plan.state.adventuringProficiencyBonus).toBe(0)
  })
})
