import {describe,it,expect} from 'vitest'
import {RULE_CLASSES,magicPools,advancement,allocateAdventure,monsterXp,proficiencyIssues,spellIssues,spellCastIssues,proficiencyBudget,SPELL_LIST} from './gameRules'
import {defaultWeaponStyle,weaponCatalogValues} from './equipment'
import {settleDomainMonth,researchPlan,researchOutcome} from './campaignRules'
import {buildClass,ClassBuild} from './classBuilder'
import {initialAdventuring,naturalProficiencies,BARBARIAN_ORIGINS} from './creationRules'

const character={level:1,int:10,con:10,hpMax:6,hpCurr:3,xp:2000}
const build:ClassBuild={name:'Test fighter',race:'human',racial:0,hd:2,fighting:2,thievery:0,divine:0,arcane:0,fightingVariant:'crusader',armorTrade:0,weaponTrade:0,styleTrade:0,damageTrade:'none',thiefSkills:[],powers:[],startingProficiency:'Manual of Arms',keyAttributes:['str'],stronghold:'Castle',smoothXp:true,proficiencies:Array.from({length:28},(_,i)=>`Campaign proficiency ${i}`)}
describe('rulebook character workflows',()=>{
  it('grants each barbarian origin in addition to normal proficiency choices', () => {
    const paid = [{ name: 'Ambushing', category: 'class' }, { name: 'Tracking', category: 'general' }]
    for (const [origin, names] of [['jutland', ['Climbing', 'Seafaring']], ['skysostan', ['Precise Shooting', 'Riding']], ['ivory-kingdoms', ['Running', 'Endurance']]] as const) {
      const grants = naturalProficiencies(BARBARIAN_ORIGINS, origin)
      expect(grants.map(grant => grant.name)).toEqual(names)
      const hero = { ...character, rulesState: JSON.stringify({ proficiencyOrigin: origin }) }
      expect(proficiencyIssues(RULE_CLASSES.Barbarian!, hero, [...initialAdventuring(10), ...grants, ...paid])).toEqual([])
      expect(proficiencyBudget(RULE_CLASSES.Barbarian!, 1, 10)).toEqual({ class: 1, general: 1 })
    }
    expect(naturalProficiencies(BARBARIAN_ORIGINS, 'jutland', 2)[0]?.throwTarget).toBe(5)
    expect(proficiencyIssues(RULE_CLASSES.Barbarian!, character, [{ name: 'Running', category: 'natural' }]).join(' ')).toContain('origem registrada')
    expect(proficiencyIssues(RULE_CLASSES.Barbarian!, character, [{ name: 'Adventuring', category: 'general' }]).join(' ')).toContain('automaticamente')
    const precise = { ...character, proficiencyOrigin: 'skysostan' }
    expect(proficiencyIssues(RULE_CLASSES.Barbarian!, precise, [{ name: 'Precise Shooting', category: 'class' }])).toEqual([])
  })
  it('has ordered progression for all 21 catalog classes',()=>{
    expect(Object.keys(RULE_CLASSES)).toHaveLength(21)
    for(const r of Object.values(RULE_CLASSES)){expect(r.levels.length).toBeGreaterThanOrEqual(10);r.levels.forEach((l,i)=>{expect(l.level).toBe(i+1);expect(l.hitDice).toMatch(/^\d+d\d+(\+\d+)?$/);if(i)expect(l.xp).toBeGreaterThan(r.levels[i-1]!.xp)})}
  })
  it('uses two handed damage only for weapons that support it',()=>{
    expect(weaponCatalogValues('w-sword','Single Weapon')).toMatchObject({damage:'1d6',encumbrance:1/6})
    expect(weaponCatalogValues('w-sword','Two-Handed Weapon').damage).toBe('1d8')
    expect(weaponCatalogValues('w-short-sword','Two-Handed Weapon').damage).toBe('1d6')
    expect(defaultWeaponStyle('w-dagger')).toBe('Single Weapon')
    expect(defaultWeaponStyle('w-longbow')).toBe('Missile Weapon')
    expect(defaultWeaponStyle('w-great-axe')).toBe('Two-Handed Weapon')
  })
  it('gives racial and explorer perceptive starting throws',()=>{
    for(const name of ['Explorer','Elven Spellsword','Dwarven Vaultguard'])expect(initialAdventuring(10,name).find(p=>p.name==='Listening')!.throwTarget).toBe(14)
    expect(initialAdventuring(18,'Fighter')[0]!.throwTarget).toBe(6)
  })
  it('separates spell slots, repertoire limits and traditions',()=>{
    expect(magicPools(RULE_CLASSES.Mage!,{...character,level:3,int:16})[0]).toMatchObject({slots:[2,1,0,0,0,0],repertoire:[4,3,0,0,0,0]})
    expect(magicPools(RULE_CLASSES.Crusader!,character)[0]!.repertoire[0]).toBeNull()
    expect(magicPools(RULE_CLASSES['Elven Nightblade']!,character)[0]!.slots).toEqual([0,0,0,0,0,0])
    expect(magicPools(RULE_CLASSES['Nobiran Wonderworker']!,character).map(p=>p.tradition)).toEqual(['arcane','divine'])
    expect(magicPools(RULE_CLASSES.Witch!,character)[0]!.studious).toBe(true)
  })
  it('rejects illegal repertoire and duplicate proficiencies',()=>{
    expect(proficiencyBudget(RULE_CLASSES['Dwarven Craftpriest']!,1,10).general).toBe(4)
    expect(proficiencyIssues(RULE_CLASSES.Fighter!,character,[{name:'Combat Trickery (disarm, force back, knock down, overrun, sunder, wrestling)',category:'class'}]).length).toBeGreaterThan(0)
    expect(spellIssues(RULE_CLASSES.Mage!,character,[{name:'Fireball',level:3,tradition:'arcane'}]).length).toBeGreaterThan(0)
    expect(proficiencyIssues(RULE_CLASSES.Fighter!,{...character,level:3},[{name:'Combat Reflexes',category:'class'},{name:'Combat Reflexes',category:'class'}]).join(' ')).toContain('repetida')
  })
  it('casts a valid divine spell without accepting a legacy placeholder',()=>{
    const spell={name:'Discern Gist',level:1,tradition:'divine'}
    const c={...character,level:8,spells:[spell,{name:'Magia',level:1,tradition:'divine'}]}
    expect(spellCastIssues(RULE_CLASSES.Priestess!,c,spell)).toEqual([])
    expect(spellCastIssues(RULE_CLASSES.Priestess!,c,c.spells[1]).join(' ')).toContain('não consta')
  })
  it('counts only valid distinct choices of the selected pool and level without exceeding its limit',()=>{
    const spell={name:'Slumber',level:1,tradition:'arcane'}
    const c={...character,spells:[spell,{...spell},{name:'Magia',level:1,tradition:'arcane'},{name:'Fireball',level:3,tradition:'arcane'}]}
    expect(spellCastIssues(RULE_CLASSES.Mage!,c,spell)).toEqual([])
    c.spells.push({name:'Arcane Armor',level:1,tradition:'arcane'})
    expect(spellCastIssues(RULE_CLASSES.Mage!,c,spell).join(' ')).toContain('limite 1')
    expect(spellCastIssues(RULE_CLASSES.Mage!,c,{...spell,tradition:'divine'}).length).toBeGreaterThan(0)
    expect(spellCastIssues({...RULE_CLASSES.Priestess!,divineSpellList:[]},{...character,level:8}, {name:'Discern Gist',level:1,tradition:'divine'}).join(' ')).toContain('religioso')
  })
  it('uses the revised book lists for Venturer, Fighter and Explorer choices',()=>{
    for (const name of ['Language','Navigation']) expect(proficiencyIssues(RULE_CLASSES.Venturer!, character, [{name,category:'class'}])).toEqual([])
    expect(proficiencyIssues(RULE_CLASSES.Venturer!, character, [{name:'Seduction',category:'class'}]).join(' ')).toContain('não pertence')
    expect(proficiencyIssues(RULE_CLASSES.Venturer!, character, [{name:'Seduction',category:'general'}])).toEqual([])
    expect(proficiencyIssues(RULE_CLASSES.Venturer!, character, [{name:'Elven Bloodline',category:'class'}]).length).toBeGreaterThan(0)
    expect(proficiencyIssues(RULE_CLASSES.Fighter!, character, [{name:'Intimidation',category:'class'}])).toEqual([])
    expect(proficiencyIssues(RULE_CLASSES.Fighter!, character, [{name:'Combat Trickery (wrestling)',category:'class'}]).length).toBeGreaterThan(0)
    expect(proficiencyIssues(RULE_CLASSES.Explorer!, character, [{name:'Trapping',category:'class'}])).toEqual([])
  })
  it('rerolls all HD, applies CON per die and preserves wounds',()=>{
    expect(advancement(RULE_CLASSES.Fighter!,{...character,con:16},[1,8])).toMatchObject({level:2,hpMax:13,hpCurr:10})
    expect(advancement(RULE_CLASSES.Fighter!,{...character,con:3},[1,1])).toMatchObject({hpMax:7,hpCurr:4})
    expect(()=>advancement(RULE_CLASSES.Fighter!,character,[9,1])).toThrow('2 resultados')
    expect(()=>advancement(RULE_CLASSES.Fighter!,{...character,xp:1999},[8,8])).toThrow('2000 XP')
  })
  it('does not apply CON to fixed HP after ninth level',()=>{
    const c={...character,level:9,xp:370000,con:16,hpMax:50,hpCurr:40}
    expect(advancement(RULE_CLASSES.Fighter!,c,Array(9).fill(5))).toMatchObject({rolled:65,hpMax:65,hpCurr:55})
  })
  it('allocates half shares, attribute bonuses and a one advancement ceiling',()=>{
    const base={xp:0,level:1,thresholds:[0,2000,4000],adjustment:0}
    expect(allocateAdventure(900,[{...base,id:'pc',share:1},{...base,id:'pc2',share:1},{...base,id:'h1',share:.5},{...base,id:'h2',share:.5}]).map(a=>a.gained)).toEqual([300,300,150,150])
    expect(allocateAdventure(10000,[{...base,id:'pc',share:1,adjustment:10}])[0]).toMatchObject({gained:3999,capped:7001})
    expect(()=>allocateAdventure(10,[{...base,id:'pc',share:1},{...base,id:'pc',share:1}])).toThrow('participantes')
    expect(monsterXp(9,false,3)).toBe(2500)
    expect(monsterXp(1,true,1)).toBe(21)
  })
})
describe('campaign settlement',()=>{
  const domain={peasantFamilies:100,peasantMorale:0,revenuePerFamily:6,servicePerFamily:4,taxPerFamily:2,garrisonCost:200,liturgiesCost:100,titheCost:100,treasury:1000}
  const input={moraleDice:[3,4],baseMorale:0,eventMorale:0,administered:false,repressed:false,growth:10,losses:5,eventFamilies:0,classification:'outlands',hexes:1,tributeGp:0}
  it('settles revenue, expenses and population without applying next month population',()=>{
    expect(settleDomainMonth(domain,input)).toMatchObject({population:105,morale:0,treasury:1800,balance:800})
    expect(settleDomainMonth(domain,{...input,growth:1000})).toMatchObject({population:185,overflow:910})
  })
  it('uses natural morale results despite modifiers and rejects unfunded expenses',()=>{
    expect(settleDomainMonth(domain,{...input,moraleDice:[1,1],eventMorale:20}).morale).toBe(-2)
    expect(settleDomainMonth(domain,{...input,moraleDice:[6,6],eventMorale:-20}).morale).toBe(2)
    expect(()=>settleDomainMonth({...domain,treasury:0}, {...input,tributeGp:9999})).toThrow('tesouro')
  })
  const project={status:'QUEUED',effectType:'ONE_USE',effectCount:1,spellLevel:1,casterLevel:5,hasFormula:true,componentCostGp:500}
  const plan={casterLevel:5,tradition:'arcane',rateBonusPercent:0,dedication:'dedicated',assistants:[],duration:'instant',affectsUser:false,esoteric:false,healing:false,eligible:true,itemKind:'other'}
  it('prices research, sums assistants and accounts for ancillary dedication',()=>{
    expect(researchPlan(project,{...character,level:5,workshopValue:4000},plan)).toMatchObject({materialsPaidGp:500,daysRequired:10})
    expect(researchPlan(project,{...character,level:5,workshopValue:4000},{...plan,assistants:[{casterLevel:5,rateBonusPercent:0,dedication:'dedicated'}]}).daysRequired).toBe(5)
    expect(researchPlan(project,{...character,level:5,workshopValue:4000},{...plan,dedication:'ancillary'}).daysRequired).toBe(80)
    expect(()=>researchPlan(project,{...character,level:5,workshopValue:4000},{...plan,healing:true})).toThrow('cura')
  })
  it('formula needs appropriate components; natural 1–3 fail and bonus items use effect level',()=>{
    const input={components:[{quantity:1,valueGp:500,appropriate:true}],engineeringRank:0,otherBonus:0,roll:0}
    expect(researchOutcome(project,character,input)).toMatchObject({success:true,formula:true})
    expect(researchOutcome(project,character,{...input,components:[{quantity:1,valueGp:500,appropriate:false}],roll:3,otherBonus:30})).toMatchObject({success:false,formula:false,penalty:1})
    expect(researchOutcome({...project,effectType:'BONUS',effectCount:3,hasFormula:false},character,{...input,roll:20}).target).toBe(18)
    expect(()=>researchOutcome(project,character,{...input,components:[]})).toThrow('insuficientes')
  })
})
describe('custom point construction',()=>{
  it('reproduces Fighter costs, attack and HP progression',()=>{
    const c=buildClass(build)
    expect(c.xpPerLevel).toEqual(RULE_CLASSES.Fighter!.levels.map(l=>l.xp))
    expect(c.attackThrows.slice(0,4)).toEqual([10,9,9,8])
    expect(c.creationRules.rules.levels[9]!.hitDice).toBe('9d8+2')
  })
  it('accounts for weapon restriction cost in Explorer construction',()=>{
    expect(buildClass({...build,hd:1,thievery:1,weaponTrade:1,powers:['Alertness','Animal Reflexes','Tracking','Pathfinding','Explorer']}).summary.xpSecond).toBe(2000)
  })
  it('calculates racial class costs, limits and independent caster levels',()=>{
    const elf=buildClass({...build,race:'elf',racial:3,hd:1,arcane:1,keyAttributes:['str','int'],proficiencies:Array.from({length:32},(_,i)=>`P${i}`)})
    expect(elf.summary).toMatchObject({xpSecond:4000,maxLevel:10})
    expect(elf.creationRules.rules.levels[0]!.hitDice).toBe('1d6+1')
    const nobiran=buildClass({...build,race:'nobiran',racial:2,hd:0,fighting:0,arcane:4,keyAttributes:['int','wil'],stronghold:'Sanctum',codeOfBehavior:'Observar os votos da ordem.',divineSpellList:[1,2,3,4,5].flatMap(level=>SPELL_LIST.filter(s=>s.tradition==='divine'&&s.level===level).slice(0,10).map(s=>({...s,tradition:'divine' as const}))),proficiencies:Array.from({length:30},(_,i)=>`P${i}`)})
    expect(nobiran.summary).toMatchObject({xpSecond:3125,maxLevel:12,savingClass:'Mage'})
    expect(magicPools(nobiran.creationRules.rules,character)).toHaveLength(2)
  })
  it('rejects illegal budgets, races and incomplete powers',()=>{
    expect(()=>buildClass({...build,arcane:1})).toThrow('pontos')
    expect(()=>buildClass({...build,race:'dwarf',hd:1,arcane:1})).toThrow('Arcane')
    expect(()=>buildClass({...build,armorTrade:1})).toThrow('1 poderes')
    expect(()=>buildClass({...build,proficiencies:[]})).toThrow('28 proficiências')
  })
})
