import tables from '../data/acksRules.json'
import spellList from '../data/spellAccess.json'
import { abilityModifier, creationRules, BARBARIAN_ORIGINS, type ProficiencyOrigin } from './creationRules'
import { classChoiceDefinitions, classGrants, abilityProficiencies, type ClassAbilityRules } from './classAbilities'

export type ClassRules = ClassAbilityRules & { page: number; proficiencies: string[]; proficiencyPeriod: number; magic: string; bonusGeneral?:number; proficiencyOrigins?: ProficiencyOrigin[]; divineSpellList?:{name:string;level:number;tradition:string}[];
  levels: { level: number; xp: number; hitDice: string; casterLevel: number; arcaneCasterLevel?: number; divineCasterLevel?: number; spellSlots: number[] }[] }
export const RULE_CLASSES = tables.classes as Record<string, ClassRules>
for (const [className, rules] of Object.entries(RULE_CLASSES)) { rules.className = className; rules.classChoices = classChoiceDefinitions(className) }
RULE_CLASSES.Barbarian!.proficiencyOrigins=BARBARIAN_ORIGINS
export const GENERAL_PROFICIENCIES = tables.generalProficiencies
export const SPELL_LIST = spellList
export const normalized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
export function readState(value: string | undefined) { try { return JSON.parse(value || '{}') } catch { return {} } }
export function rulesFor(klass: any): ClassRules | undefined {
  if (klass?.id?.startsWith('catalog:')) return RULE_CLASSES[klass.name]
  const construction = readState(klass?.creationRules)
  return construction.rules ? {...construction.rules, ...(construction.ruleProfile?.powers ? {abilityPowers:construction.ruleProfile.powers} : {})} : undefined
}
export function proficiencyBudget(rules: ClassRules, level: number, intellect: number) {
  return { class: 1 + Math.floor(level / rules.proficiencyPeriod), general: 1 + (rules.bonusGeneral||0) + Math.max(0, abilityModifier(intellect)) + [5,9,13].filter(n => n <= level).length }
}
export function proficiencyIssues(rules: ClassRules, character: any, choices: { name: string; category: string }[], level = character.level || 1) {
  const budget = proficiencyBudget(rules, level, character.int)
  const issues: string[] = []
  const grants = classGrants(rules, character, level)
  for (const choice of choices.filter(p => p.category === 'natural')) {
    if (!grants.some(p => normalized(p.name) === normalized(choice.name))) issues.push(`${choice.name}: não é concedida pelas escolhas de classe registradas.`)
    if (choices.filter(p => p.category === 'natural' && normalized(p.name) === normalized(choice.name)).length > grants.filter(g => normalized(g.name) === normalized(choice.name)).length) issues.push(`${choice.name}: concessão de classe repetida.`)
  }
  for (const category of ['class', 'general'] as const) {
    const selected = choices.filter(p => p.category === category)
    if (selected.length > budget[category]) issues.push(`${category}: ${selected.length} escolhas; limite ${budget[category]}.`)
    const allowed = category === 'class' ? rules.proficiencies : GENERAL_PROFICIENCIES
    for (const p of selected) {
      if (normalized(p.name) === 'adventuring') { issues.push('Adventuring já é concedida automaticamente; não gasta uma escolha.'); continue }
      const match = allowed.some(entry => {
        const base = entry.split('(')[0]!.trim()
        if (normalized(p.name) === normalized(entry)) return !entry.includes(',')
        if (normalized(p.name.split('(')[0]!) !== normalized(base)) return false
        if (!entry.includes('(')) return true
        const option = p.name.match(/\(([^)]+)\)/)?.[1]
        return option && entry.match(/\(([^)]+)\)/)![1]!.split(',').some(v => normalized(v) === normalized(option))
      })
      if (!match) issues.push(`${p.name}: não pertence à lista ${category}.`)
    }
  }
  // Repeated ranks and specializations require the specific proficiency's permission.
  const singleRank = new Set(['combatreflexes','combatferocity','alertness','swashbuckling','weaponfinesse','endurance','running','ambushing','blindfighting','climbing','riding','expandedrepertoire'])
  const ranks = [...choices.filter(p => p.category !== 'adventuring' && p.category !== 'natural'), ...grants.filter(g => !g.conditional), ...(rules.abilityPowers || []).filter(power => (power.minimumLevel || 1) <= level)]
  for (const name of singleRank) if (ranks.filter(p => normalized(p.name) === name).length > 1) issues.push(`A proficiência ${ranks.find(p => normalized(p.name) === name)!.name} não pode ser repetida.`)
  for (const name of new Set(grants.filter(g => g.ranks === 3).map(g => normalized(g.name)))) if (choices.some(p => ['class','general'].includes(p.category) && normalized(p.name) === name)) issues.push('Craft já possui as três graduações concedidas pela classe; escolha outro ofício ou proficiência.')
  return issues
}

export function magicPools(rules: ClassRules, character: any, level = character.level || 1) {
  const row = rules.levels[level - 1]
  if (!row || rules.magic === 'none') return []
  const kinds = rules.magic === 'dual' ? ['arcane','divine'] : [rules.magic === 'studious-divine' ? 'divine' : rules.magic]
  return kinds.map((tradition, index) => {
    const slots = Array.from({ length: 6 }, (_, i) => row.spellSlots[index * 6 + i] || 0)
    const studious = tradition === 'arcane' || rules.magic === 'studious-divine'
    return { tradition, casterLevel: (tradition === 'arcane' ? row.arcaneCasterLevel : row.divineCasterLevel) ?? row.casterLevel, studious, slots,
      repertoire: slots.map(n => !n ? 0 : studious ? n + Math.max(0, abilityModifier(character.int)) + (abilityProficiencies({...character,level}, rules).some(p => normalized(p.name) === 'expandedrepertoire') ? 1 : 0) : null),...(tradition==='divine'&&rules.divineSpellList?{spellList:rules.divineSpellList}:{}) }
  })
}

export function spellIssues(rules: ClassRules, character: any, spells: any[], level = character.level || 1, catalog: any[] = SPELL_LIST) {
  const pools = magicPools(rules, character, level)
  const issues: string[] = []
  const seen = new Set<string>()
  for (const spell of spells) {
    const pool = pools.find(p => p.tradition === spell.tradition) || (pools.length === 1 && !spell.tradition ? pools[0] : undefined)
    if (!pool || !pool.slots[spell.level - 1]) { issues.push(`${spell.name || 'Magia'}: tipo ou nível indisponível.`); continue }
    const key = `${pool.tradition}:${normalized(spell.name)}`
    if (seen.has(key)) issues.push(`${spell.name}: repetida no repertório ${pool.tradition}.`)
    seen.add(key)
    const entry = catalog.find(s => normalized(s.name) === normalized(spell.name) && s.level === spell.level && s.tradition === pool.tradition)
    if (!entry) issues.push(`${spell.name}: não consta nas opções disponíveis ${pool.tradition} de nível ${spell.level}; confira o nome e a liberação do mestre.`)
    if(!entry?.campaignSpellId&&pool.tradition==='divine'&&rules.divineSpellList&&!rules.divineSpellList.some(s=>normalized(s.name)===normalized(spell.name)&&s.level===spell.level))issues.push(`${spell.name}: não pertence ao repertório religioso desta classe.`)
  }
  for (const pool of pools) for (let i = 0; i < 6; i++) {
    const count = spells.filter(s => s.level === i + 1 && (s.tradition === pool.tradition || (!s.tradition && pools.length === 1))).length
    const limit = pool.repertoire[i]
    if (limit != null && count > limit) issues.push(`Repertório ${pool.tradition} ${i+1}: ${count} magias, limite ${limit}.`)
  }
  return issues
}

// Legacy/manual entries are references, not additional castable choices. Check
// the selected spell and the valid, distinct choices of its own pool/level.
export function spellCastIssues(rules: ClassRules, character: any, spell: any, catalog: any[] = SPELL_LIST) {
  const issues = spellIssues(rules, character, [spell], character.level || 1, catalog)
  if (issues.length) return issues
  const pools = magicPools(rules, character)
  const tradition = spell.tradition || (pools.length === 1 ? pools[0]!.tradition : '')
  const seen = new Set<string>()
  const choices = (character.spells || [spell]).filter((entry: any) => {
    const entryTradition = entry.tradition || (pools.length === 1 ? pools[0]!.tradition : '')
    if (entry.level !== spell.level || entryTradition !== tradition || spellIssues(rules, character, [entry], character.level || 1, catalog).length) return false
    const key = normalized(entry.name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return spellIssues(rules, character, choices, character.level || 1, catalog)
}

// Rulebook p. 311: re-roll all HD, CON per die (minimum 1), at least +1 HP.
export function advancement(rules: ClassRules, character: any, dice: number[]) {
  const next = rules.levels[character.level]
  if (!next) throw new Error('A classe já está no nível máximo.')
  if (character.xp < next.xp) throw new Error(`São necessários ${next.xp} XP para avançar.`)
  const [, countText, sidesText, flatText] = next.hitDice.match(/^(\d+)d(\d+)(?:\+(\d+))?$/) || []
  const count = Number(countText), sides = Number(sidesText)
  if (!count || dice.length !== count || dice.some(n => !Number.isInteger(n) || n < 1 || n > sides)) throw new Error(`Informe ${count} resultados de d${sides}.`)
  const rolled = dice.reduce((sum, n) => sum + Math.max(1, n + abilityModifier(character.con)), 0) + Number(flatText || 0)
  const hpMax = Math.max(character.hpMax + 1, rolled)
  return { level: next.level, hitDice: next.hitDice, rolled, hpMax, hpCurr: character.hpCurr + hpMax - character.hpMax,
    xpNext: rules.levels[next.level]?.xp || 0, proficiencies: proficiencyBudget(rules, next.level, character.int), magic: magicPools(rules, character, next.level) }
}

export function xpAdjustment(character: any, klass: any) {
  const attributes: string[] = klass.id?.startsWith('catalog:') ? creationRules(klass.name).keyAttributes : readState(klass.creationRules).keyAttributes || []
  const score = Math.min(...attributes.map(a => character[a]))
  return !attributes.length ? 0 : score >= 16 ? 10 : score >= 13 ? 5 : 0
}

// Rulebook pp. 310–311. The Judge determines eligible treasure and defeated monsters.
export function monsterXp(hd: number, bonusHd: boolean, abilities: number) {
  const basic = [5,10,20,50,80,200,320,440,600,700,850,1000,1200,1400,1600,1800,2000,2200,2400,2600,2800,3000]
  const extra = [1,3,9,15,55,150,250,350,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1800,2000]
  const plus: Record<number, number[]> = {1:[15,6],2:[35,12],3:[65,35],4:[140,75],5:[260,200],6:[380,300],7:[500,400]}
  if (!Number.isInteger(hd) || hd < 0 || hd > 100 || !Number.isInteger(abilities) || abilities < 0 || abilities > 100) throw new Error('Dados de vida ou habilidades especiais inválidos.')
  const row = bonusHd && plus[hd] ? plus[hd]! : [basic[Math.min(hd,21)]! + Math.max(0,hd-21)*250, extra[Math.min(hd,21)]! + Math.max(0,hd-21)*250]
  return row[0]! + abilities * row[1]!
}
export function allocateAdventure(total: number, participants: { id: string; share: number; xp: number; level: number; thresholds: number[]; adjustment: number }[]) {
  if (!Number.isFinite(total) || total < 0 || total > 1e9 || !participants.length || new Set(participants.map(p=>p.id)).size !== participants.length) throw new Error('Aventura ou participantes inválidos.')
  const shares = participants.reduce((sum,p) => sum+p.share,0)
  if (participants.some(p => ![0.5,1].includes(p.share))) throw new Error('Use uma cota para personagens ou meia cota para henchmen.')
  return participants.map(p => {
    const base = total * p.share / shares
    const adjusted = Math.floor(base * (1+p.adjustment/100))
    const ceiling = p.thresholds[p.level+1]
    const gained = Math.min(adjusted, ceiling == null ? adjusted : Math.max(0,ceiling-1-p.xp))
    return { id:p.id, share:p.share, base, adjustment:p.adjustment, gained, capped:adjusted-gained, xp:p.xp+gained }
  })
}
