import { describe, it, expect } from 'vitest'
import { RULE_CLASSES, proficiencyBudget, proficiencyIssues, magicPools, spellIssues } from './gameRules'
import { DEFAULT_CLASSES, PREVIOUS_DEFAULT_CLASSES } from '../utils/seedClasses'
import { legacyBaseName } from './legacyClasses'
import { initialAdventuring } from './creationRules'
import { classGrants, grantRows, classChoiceIssues, relevantChoices, choiceOptions, abilityProficiencies, completeAutomaticSelections, approvedChoiceSignature, TOTEM_ANIMALS } from './classAbilities'
import { classChoicePlan } from './classChoicePlan'
import { prepareCharacterImport } from './characterImport'

const hero = { level:1,str:10,int:10,dex:10,wil:10,con:10,cha:10,proficiencies:[] as any[] }
describe('revised class concessions and book progression', () => {
  it('uses book XP for both catalog and advancement for all 21 classes', () => {
    expect(DEFAULT_CLASSES).toHaveLength(21)
    for (const klass of DEFAULT_CLASSES) expect(klass.xpPerLevel).toEqual(RULE_CLASSES[klass.name]!.levels.map(row => row.xp))
    for (const [name,level,xp] of [['Bard',7,55000],['Paladin',2,2750],['Dwarven Vaultguard',5,17600],['Nobiran Wonderworker',11,770000],['Zaharan Ruinguard',9,410000]] as const) expect(DEFAULT_CLASSES.find(klass => klass.name === name)!.xpPerLevel[level-1]).toBe(xp)
  })
  it('still recognizes older campaign copies without hiding genuine modifications', () => {
    const original = PREVIOUS_DEFAULT_CLASSES.find(klass => klass.name === 'Dwarven Vaultguard')!
    const copy = {...original,...Object.fromEntries(['xpPerLevel','titles','attackThrows','savingThrows'].map(key => [key,JSON.stringify((original as any)[key])]))}
    expect(legacyBaseName(copy)).toBe('Dwarven Vaultguard')
    expect(legacyBaseName({...copy,description:'Decisão da campanha'})).toBeNull()
    expect(legacyBaseName({...copy,xpPerLevel:'[0,1234]'})).toBeNull()
  })
  it('grants three Craft ranks without increasing the general budget', () => {
    const rules = RULE_CLASSES['Dwarven Craftpriest']!, character = {...hero,classChoices:{craft:'Craft (weapon-smithing)'}}
    expect(classGrants(rules,character)).toEqual([{name:'Craft (weapon-smithing)',category:'natural',throwTarget:2,ranks:3,source:expect.any(String)}])
    expect(proficiencyBudget(rules,1,10)).toEqual({class:1,general:1})
    expect(proficiencyIssues(rules,character,[{name:'Alchemy',category:'class'},{name:'Caving',category:'general'},...grantRows(classGrants(rules,character))])).toEqual([])
    expect(proficiencyIssues(rules,character,['Caving','Riding','Seafaring','Gambling'].map(name=>({name,category:'general'}))).join(' ')).toContain('limite 1')
    expect(proficiencyIssues(rules,character,[{name:'Craft (weapon-smithing)',category:'general'}]).join(' ')).toContain('três graduações')
  })
  it('requires a named Craft and applies Attention to Detail to initial throws', () => {
    const rules = RULE_CLASSES['Dwarven Craftpriest']!
    expect(classChoiceIssues(rules,hero,{},true)).toHaveLength(1)
    expect(classChoiceIssues(rules,hero,{craft:'Craft'},true)).toHaveLength(1)
    expect(classChoiceIssues(rules,hero,{craft:'Craft (glassmaking)'},true)).toEqual([])
    expect(initialAdventuring(16,'Dwarven Craftpriest').map(p=>p.throwTarget)).toEqual([7,5,11,15,11])
  })
  it('adds Expert Traveling outside the normal choices', () => {
    const rules = RULE_CLASSES.Venturer!, character = {...hero,classChoices:{'expert-traveling':'Driving'}}
    expect(classChoiceIssues(rules,character,character.classChoices,true)).toEqual([])
    expect(proficiencyIssues(rules,character,[{name:'Bargaining',category:'class'},{name:'Caving',category:'general'},...grantRows(classGrants(rules,character))])).toEqual([])
    expect(classGrants(rules,character).map(p=>p.name)).toEqual(['Driving'])
  })
  it('allows a Bard class proficiency from another class without consuming the paid slot', () => {
    const rules = RULE_CLASSES.Bard!, character = {...hero,classChoices:{'jack-1':'Combat Ferocity'}}
    expect(classChoiceIssues(rules,character,character.classChoices,true)).toEqual([])
    expect(proficiencyIssues(rules,character,[{name:'Performance',category:'class'},{name:'Caving',category:'general'},...grantRows(classGrants(rules,character))])).toEqual([])
    expect(relevantChoices(rules,{...hero,level:11}).map(choice=>choice.minimumLevel)).toEqual([1,3,6,8,11])
  })
  it('enforces the acquisition level of thief skills and Venturer powers', () => {
    const rules = RULE_CLASSES.Bard!
    expect(classChoiceIssues(rules,hero,{'jack-1':'skill:Scrollreading'}).join(' ')).toContain('indisponível')
    expect(classChoiceIssues(rules,hero,{'jack-1':'skill:Backstabbing'}).join(' ')).toContain('inválida')
    expect(classChoiceIssues(rules,hero,{'jack-1':'power:Rumormongering'}).join(' ')).toContain('indisponível')
    expect(classChoiceIssues(rules,{...hero,level:4},{'jack-1':'power:Rumormongering'})).toEqual([])
  })
  it('requires responsible-master approval for exceptional Bard powers', () => {
    const choices = {'jack-1':'judge','jack-1-name':'Poder da campanha','jack-1-description':'Condições acordadas','jack-1-level':'1'}, rules=RULE_CLASSES.Bard!
    expect(classChoiceIssues(rules,hero,choices).join(' ')).toContain('aprovado pelo mestre')
    expect(classChoiceIssues(rules,hero,choices,true,true)).toEqual([])
    const approved={...hero,rulesState:JSON.stringify({classChoiceApprovals:{'jack-1':approvedChoiceSignature(choices,'jack-1')}})}
    expect(classChoiceIssues(rules,approved,choices)).toEqual([])
    expect(classChoiceIssues(rules,approved,{...choices,'jack-1-name':'Poder alterado'}).join(' ')).toContain('aprovado pelo mestre')
  })
  it('requires the totem attribute and retains only active conditional benefits', () => {
    const rules=RULE_CLASSES.Shaman!, character={...hero,classChoices:{totem:'Viper'},totemStatus:{alive:true,nearby:true},proficiencies:[{name:'Combat Reflexes',category:'natural'}]}
    expect(classChoiceIssues(rules,{...character,dex:8},character.classChoices,true).join(' ')).toContain('DEX ≥ 9')
    expect(abilityProficiencies(character,rules).map(p=>p.name)).toEqual(['Combat Reflexes'])
    expect(abilityProficiencies({...character,totemStatus:{alive:true,nearby:false}},rules)).toEqual([])
    expect(abilityProficiencies({...character,totemStatus:{alive:false,nearby:true}},rules)).toEqual([])
    expect(abilityProficiencies({...character,totemStatus:{alive:false,nearby:false},proficiencies:[...character.proficiencies,{name:'Combat Reflexes',category:'class'}]},rules).map(p=>p.category)).toEqual(['class'])
    expect(TOTEM_ANIMALS.find(animal=>animal.name==='Owl')!.characteristics).toContain('300′ fly, AC 3, HD 1/2')
    expect(TOTEM_ANIMALS.find(animal=>animal.name==='Crow/Raven')!.characteristics).toContain('1d2-1')
  })
  it('gives the correct Witch art and alternatives when earlier ranks already exist', () => {
    const rules=RULE_CLASSES.Witch!, character={...hero,level:3,classChoices:{tradition:'Antiquarian'}}
    expect(completeAutomaticSelections(rules,character,character.classChoices)).toEqual({tradition:'Antiquarian','traditional-arts':'Healing'})
    expect(classGrants(rules,character).map(p=>p.name)).toEqual(['Healing'])
    const definition=relevantChoices(rules,character).find(choice=>choice.id==='traditional-arts')!
    expect(choiceOptions(definition,{...character,proficiencies:Array.from({length:3},()=>({name:'Healing',category:'class'}))}).map(option=>option.key)).toEqual(['Alchemy','Naturalism'])
    expect(classGrants(rules,{...character,classChoices:{tradition:'Chthonic'}}).map(p=>p.name)).toEqual(['Seduction'])
    expect(classGrants(rules,{...character,classChoices:{tradition:'Sylvan'}}).map(p=>p.name)).toEqual(['Naturalism'])
  })
  it('adds the new Witch rank on advancement instead of converting an earlier paid rank', () => {
    const character={...hero,level:2,proficiencies:[{id:'paid',name:'Healing',category:'class',throwTarget:9}],rulesState:JSON.stringify({classChoices:{tradition:'Antiquarian'}})}
    const choices=completeAutomaticSelections(RULE_CLASSES.Witch!,character,{tradition:'Antiquarian'},3), state={classChoices:choices}
    const plan=classChoicePlan(character,RULE_CLASSES.Witch!,choices,state,false,3,false)
    expect(plan.converted).toEqual([]);expect(plan.added.map(p=>p.name)).toEqual(['Healing'])
    expect(plan.proficiencies.find(p=>p.id==='paid')?.category).toBe('class')
  })
  it('preserves IDs and manual targets during legacy reconciliation and applies the old Craftpriest bonus once', () => {
    const character={...hero,proficiencies:[{id:'craft',name:'Craft (brewing)',category:'general',throwTarget:6},{id:'listen',name:'Listening',category:'adventuring',throwTarget:16}],rulesState:'{}'}
    const state:any={classChoices:{craft:'Craft (brewing)'}},plan=classChoicePlan(character,RULE_CLASSES['Dwarven Craftpriest']!,state.classChoices,state,true)
    expect(plan.converted[0]).toMatchObject({id:'craft',throwTarget:6,category:'natural'})
    expect(plan.targets[0]).toMatchObject({id:'listen',throwTarget:13})
    expect(classChoicePlan({...character,proficiencies:plan.proficiencies,rulesState:JSON.stringify(state)},RULE_CLASSES['Dwarven Craftpriest']!,state.classChoices,state,true).targets).toEqual([])
  })
  it('extends repertoire without granting an extra daily cast', () => {
    const character={...hero,proficiencies:[{name:'Expanded Repertoire',category:'class'}]},spells=[{name:'Arcane Armor',level:1,tradition:'arcane'},{name:'Auditory Illusion',level:1,tradition:'arcane'}]
    expect(magicPools(RULE_CLASSES.Mage!,character)[0]).toMatchObject({slots:[1,0,0,0,0,0],repertoire:[2,0,0,0,0,0]})
    expect(spellIssues(RULE_CLASSES.Mage!,character,spells)).toEqual([])
    expect(spellIssues(RULE_CLASSES.Mage!,hero,spells).join(' ')).toContain('limite 1')
  })
  it('preserves portable choices and totem state without importing master approval', () => {
    const choices={'jack-1':'judge','jack-1-name':'Poder','jack-1-description':'Decisão','jack-1-level':'1'}
    const prepared=prepareCharacterImport({characterName:'Importado',rulesState:JSON.stringify({classChoices:choices,classChoiceApprovals:{'jack-1':approvedChoiceSignature(choices,'jack-1')},totemStatus:{alive:false,nearby:false,lostAtLevel:2}})})
    const state=JSON.parse(prepared.fields.rulesState)
    expect(state.classChoices).toEqual(choices);expect(state.totemStatus).toEqual({alive:false,nearby:false,lostAtLevel:2});expect(state.classChoiceApprovals).toBeUndefined()
    expect(prepared.warnings.join(' ')).toContain('nova aprovação')
  })
  it('applies repertoire expansion granted as a constructed-class power only when unlocked', () => {
    const rules={...RULE_CLASSES.Mage!,abilityPowers:[{name:'Expanded Repertoire',minimumLevel:3}]}
    expect(magicPools(rules,hero)[0]!.repertoire[0]).toBe(1)
    expect(magicPools(rules,{...hero,level:3})[0]!.repertoire[0]).toBe(3)
    expect(proficiencyIssues(rules,{...hero,level:3},[{name:'Expanded Repertoire',category:'class'}]).join(' ')).toContain('não pode ser repetida')
  })
})
