// Pure book rules, also imported by the frontend. No database or environment dependencies.
import book from '../data/acksRules.json'

export type ClassChoiceOption = { key: string; label: string; minimumLevel?: number; attribute?: string; proficiency?: string; ranks?: number; skill?: string; power?: string }
export type ClassChoiceDefinition = { id: string; label: string; minimumLevel: number; kind?: string; options: ClassChoiceOption[] }
export type ClassAbilityRules = { className?: string; proficiencyOrigins?: { key: string; proficiencies: string[] }[]; classChoices?: ClassChoiceDefinition[]; abilityPowers?: {name:string;minimumLevel?:number}[] }
export type ClassGrant = { name: string; category: 'natural'; throwTarget: number; ranks: number; source: string; conditional?: boolean }
export type ClassSelections = Record<string, string>
export const nameKey = (value: string) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
export function abilityState(character: any) {
  try { const state = typeof character.rulesState === 'string' ? JSON.parse(character.rulesState) : character.rulesState; return state && typeof state === 'object' && !Array.isArray(state) ? state : {} } catch { return {} }
}
export const selectionsFor = (character: any): ClassSelections => character.classChoices || abilityState(character).classChoices || {}
const option = (key: string, label = key, proficiency = key): ClassChoiceOption => ({ key, label, proficiency })
const expand = (entry: string) => {
  const match = entry.match(/^(.+?)\s*\(([^)]+)\)$/)
  return match?.[2]?.includes(',') ? match[2].split(',').map(value => `${match[1]!.trim()} (${value.trim()})`) : [entry]
}
const bardProficiencies = [...new Set(Object.values(book.classes).flatMap(klass => klass.proficiencies.flatMap(expand)))].filter(name => name !== 'Adventuring')
const skillLevels: Record<string, number> = { Climbing: 1, Hiding: 1, Listening: 1, Lockpicking: 1, Pickpocketing: 1, Searching: 1, Sneaking: 1, Trapbreaking: 1, Deciphering: 4, Scrollreading: 10 }
const venturerPowers: Record<string, number> = { Bargaining: 1, Bribery: 1, Diplomacy: 1, Multilingual: 1, Pathfinding: 1, Treachery: 1, 'Steady Trade Route': 2, Rumormongering: 4, 'Steady Trade Route II': 6, 'Access to Capital': 8, Guildhouse: 9, 'Steady Trade Route III': 10, 'Monopoly Power': 12 }
const jackOptions: ClassChoiceOption[] = [
  ...bardProficiencies.map(name => option(name)),
  ...Object.entries(skillLevels).map(([name, minimumLevel]) => ({ key: `skill:${name}`, label: `${name} · habilidade de ladrão`, skill: name, minimumLevel })),
  ...Object.entries(venturerPowers).map(([name, minimumLevel]) => ({ key: `power:${name}`, label: `${name} · poder de Venturer`, power: name, minimumLevel, ...(['Bargaining','Bribery','Diplomacy','Multilingual'].includes(name) ? {proficiency:name === 'Multilingual' ? 'Language' : name} : {}) })),
  ...['Driving','Seafaring'].map(name => ({ key: `travel:${name}`, label: `Expert Traveling · ${name}`, proficiency: name, power: 'Expert Traveling', minimumLevel:1 })),
  { key: 'judge', label: 'Outro poder aprovado pelo mestre', power: 'judge' },
]
export const TOTEM_ANIMALS = [
  { name: 'Bear', attribute: 'str', benefit: 'Berserkergang', characteristics: 'Spd 120′, AC 3, HD 4, #AT 3, Dmg 1d3/1d3/1d6, hug' },
  { name: 'Cheetah', attribute: 'dex', benefit: 'Running', characteristics: 'Spd 360′, AC 5, HD 2+2, #AT 3, Dmg 1d2/1d2/1d4, pounce' },
  { name: 'Crocodile', attribute: 'con', benefit: 'Combat Ferocity', characteristics: 'Spd 60′/90′ swim, AC 4, HD 2, #AT 1, Dmg 1d8' },
  { name: 'Crow/Raven', attribute: 'int', benefit: 'Divine Blessing', characteristics: 'Spd 330′ fly, AC 1, HD 1/4, #AT 1, Dmg 1d2-1' },
  { name: 'Dog', attribute: 'cha', benefit: 'Alertness', characteristics: 'Spd 180′, AC 2, HD 1+1, #AT 1, Dmg 1d4' },
  { name: 'Eagle/Hawk', attribute: 'cha', benefit: 'Command', characteristics: 'Spd 480′ fly, AC 3, HD 1+1, #AT 2, Dmg 1d3/1d3, dive' },
  { name: 'Elk', attribute: 'con', benefit: 'Contemplation', characteristics: 'Spd 180′, AC 2, HD 4, #AT 1, Dmg 1d10' },
  { name: 'Goat', attribute: 'wil', benefit: 'Climbing', characteristics: 'Spd 150′, AC 2, HD 1, Dmg 1d4' },
  { name: 'Horse', attribute: 'con', benefit: 'Mounted Combat', characteristics: 'Spd 210′, AC 2, HD 2, #AT 2, Dmg 1d4/1d4' },
  { name: 'Hyena', attribute: 'cha', benefit: 'Weapon Focus', characteristics: 'Spd 150′, AC 2, HD 2+1, #AT 2, Dmg 1d8, bone crush' },
  { name: 'Jackal', attribute: 'int', benefit: 'Combat Trickery', characteristics: 'Spd 180′, AC 2, HD 1-1, #AT 1, Dmg 1d4' },
  { name: 'Lion', attribute: 'str', benefit: 'Divine Health', characteristics: 'Spd 180′, AC 3, HD 5, #AT 3, Dmg 1d4+1/1d4+1/1d10, pounce' },
  { name: 'Monkey', attribute: 'dex', benefit: 'Prestidigitation', characteristics: 'Spd 120′/120′ climb, AC 2, HD 1, #AT 1, Dmg 1d3' },
  { name: 'Rat', attribute: 'wil', benefit: 'Quiet Magic', characteristics: 'Spd 120′/60′ swim, AC 2, HD 1/2, #AT 1, Dmg 1d3' },
  { name: 'Owl', attribute: 'int', benefit: 'Sensing Power', characteristics: 'Spd 300′ fly, AC 3, HD 1/2, #AT 2, Dmg 1d2/1d2, dive attack' },
  { name: 'Python', attribute: 'str', benefit: 'Laying on Hands', characteristics: 'Spd 90′, AC 3, HD 5, #AT 2, Dmg 1d4/2d8, constriction' },
  { name: 'Viper', attribute: 'dex', benefit: 'Combat Reflexes', characteristics: 'Spd 90′, AC 3, HD 2, #AT 1, Dmg 1d4, poison' },
  { name: 'Wolf', attribute: 'wil', benefit: 'Ambushing', characteristics: 'Spd 180′, AC 2, HD 2+2, #AT 1, Dmg 1d6' },
]
export function classChoiceDefinitions(name: string): ClassChoiceDefinition[] {
  if (name === 'Barbarian') return [{ id: 'damage-specialization', label: 'Especialização de dano', minimumLevel: 1, kind: 'immutable', options: [{ key: 'melee', label: 'Corpo a corpo' }, { key: 'missile', label: 'Projéteis' }] }]
  if (name === 'Venturer') return [{ id: 'expert-traveling', label: 'Expert Traveling · escolha gratuita', minimumLevel: 1, options: [option('Driving'), option('Seafaring')] }]
  if (name === 'Dwarven Craftpriest') return [{ id: 'craft', label: 'Ofício · três graduações gratuitas de Craft', minimumLevel: 1, kind: 'craft', options: ['armor-making','weapon-smithing','leatherworking','rune-carving','bookbinding','stonemasonry','brewing','jewelling'].map(value => ({ ...option(`Craft (${value})`), ranks: 3 })) }]
  if (name === 'Shaman') return [{ id: 'totem', label: 'Animal totêmico', minimumLevel: 1, kind: 'immutable', options: TOTEM_ANIMALS.map(animal => ({ ...option(animal.name, `${animal.name} · ${animal.benefit}`, animal.benefit), attribute: animal.attribute })) }]
  if (name === 'Witch') return [
    { id: 'tradition', label: 'Tradição da Witch', minimumLevel: 1, kind: 'immutable', options: ['Antiquarian','Chthonic','Sylvan'].map(key => ({ key, label: key })) },
    { id: 'traditional-arts', label: 'Arte da tradição · graduação gratuita', minimumLevel: 3, kind: 'witch-arts', options: ['Healing','Alchemy','Naturalism','Seduction','Diplomacy','Intimidation'].map(name => option(name)) },
  ]
  if (name === 'Bard') return [1,3,6,8,11].map((minimumLevel, index) => ({ id: `jack-${index+1}`, label: `Jack of All Trades${index ? ` ${['','II','III','IV','V'][index]}` : ''} · escolha gratuita`, minimumLevel, kind: 'jack', options: jackOptions }))
  return []
}
export function relevantChoices(rules: ClassAbilityRules, character: any, level = character.level || 1) {
  return (rules.classChoices || classChoiceDefinitions(rules.className || '')).filter(choice => choice.minimumLevel <= level)
}
function paidRanks(character: any, name: string) { return (character.proficiencies || []).filter((p: any) => p.category !== 'natural' && nameKey(p.name) === nameKey(name)).length }
export function choiceOptions(definition: ClassChoiceDefinition, character: any, level = character.level || 1) {
  const choices = selectionsFor(character)
  let allowed = definition.options.filter(value => (value.minimumLevel || 1) <= level)
  if (definition.kind === 'witch-arts') {
    const names = choices.tradition === 'Antiquarian' ? paidRanks(character, 'Healing') >= 3 ? ['Alchemy','Naturalism'] : ['Healing']
      : choices.tradition === 'Chthonic' ? paidRanks(character,'Seduction') ? ['Diplomacy','Intimidation'] : ['Seduction']
      : choices.tradition === 'Sylvan' ? paidRanks(character,'Naturalism') ? ['Naturalism','Alchemy','Healing'] : ['Naturalism'] : []
    allowed = allowed.filter(value => names.includes(value.key))
    const recorded = abilityState(character).classChoices?.[definition.id]
    if (recorded === choices[definition.id]) {
      const historical = definition.options.find(value => value.key === recorded)
      if (historical && !allowed.some(value => value.key === recorded)) allowed.push(historical)
    }
  }
  return allowed
}
export function completeAutomaticSelections(rules: ClassAbilityRules, character: any, choices: ClassSelections, level = character.level || 1) {
  const completed = { ...choices }
  for (const definition of relevantChoices(rules, character, level)) if (definition.kind === 'witch-arts' && !completed[definition.id]) {
    const allowed = choiceOptions(definition, {...character, classChoices:completed}, level)
    if (allowed.length === 1) completed[definition.id] = allowed[0]!.key
  }
  return completed
}
export function classChoiceIssues(rules: ClassAbilityRules, character: any, choices = selectionsFor(character), requireChoices = false, canApprove = false) {
  const issues: string[] = [], selectedCharacter = { ...character, classChoices: choices }
  const definitions = rules.classChoices || classChoiceDefinitions(rules.className || '')
  const keys = new Set(definitions.flatMap(definition => [definition.id, ...(definition.kind === 'jack' ? [`${definition.id}-name`, `${definition.id}-description`, `${definition.id}-level`] : [])]))
  for (const key of Object.keys(choices)) if (!keys.has(key)) issues.push(`Escolha de classe desconhecida: ${key}.`)
  for (const definition of definitions) {
    const value = choices[definition.id], level = character.level || 1
    if (definition.minimumLevel > level) { if (value) issues.push(`${definition.label}: disponível apenas no nível ${definition.minimumLevel}.`); continue }
    const options = choiceOptions(definition, selectedCharacter)
    // A single mandatory traditional art can be granted automatically at level 3.
    if (!value && definition.kind === 'witch-arts' && options.length === 1) continue
    if (!value) { if (requireChoices && (definition.kind !== 'witch-arts' || choices.tradition)) issues.push(`Escolha ${definition.label}.`); continue }
    const chosen = options.find(entry => entry.key === value)
    if (!chosen && !(definition.kind === 'craft' && /^Craft \([^()\r\n]{2,80}\)$/.test(value))) { issues.push(`${definition.label}: escolha inválida ou indisponível.`); continue }
    if (chosen?.attribute && Number(character[chosen.attribute]) < 9) issues.push(`${value}: requer ${chosen.attribute.toUpperCase()} ≥ 9.`)
    if (value === 'judge') {
      const signature = approvedChoiceSignature(choices, definition.id)
      if (!canApprove && abilityState(character).classChoiceApprovals?.[definition.id] !== signature) issues.push(`${definition.label}: este poder precisa ser aprovado pelo mestre responsável.`)
      const minimum = Number(choices[`${definition.id}-level`])
      if (!choices[`${definition.id}-name`]?.trim() || !choices[`${definition.id}-description`]?.trim() || !Number.isInteger(minimum) || minimum < 1 || minimum > level) issues.push(`${definition.label}: informe nome, descrição e nível de aquisição do poder aprovado; conjuração não é concedida.`)
    }
  }
  return issues
}
export const approvedChoiceSignature = (choices: ClassSelections, id: string) => JSON.stringify([choices[id], choices[`${id}-name`], choices[`${id}-description`], choices[`${id}-level`]])
export function classGrants(rules: ClassAbilityRules, character: any, level = character.level || 1): ClassGrant[] {
  const state = abilityState(character), choices = selectionsFor(character), grants: ClassGrant[] = []
  const origin = character.proficiencyOrigin || state.proficiencyOrigin
  for (const name of rules.proficiencyOrigins?.find(value => value.key === origin)?.proficiencies || []) grants.push({ name, category: 'natural', throwTarget: name === 'Climbing' ? 7 - level : 11, ranks: 1, source: 'Origem' })
  for (const definition of relevantChoices(rules, character, level)) {
    const options = choiceOptions(definition, character, level), value = choices[definition.id] || (definition.kind === 'witch-arts' && options.length === 1 ? options[0]!.key : '')
    const chosen = options.find(entry => entry.key === value)
    const proficiency = definition.kind === 'craft' && /^Craft \([^()\r\n]{2,80}\)$/.test(value) ? value : chosen?.proficiency
    if (proficiency) grants.push({ name: proficiency, category: 'natural', throwTarget: definition.kind === 'craft' ? 2 : proficiency === 'Climbing' ? 7 - level : 11 - (rules.className === 'Dwarven Craftpriest' ? 3 : 0), ranks: definition.kind === 'craft' ? 3 : chosen?.ranks || 1, source: definition.label, ...(definition.id === 'totem' ? { conditional: true } : {}) })
  }
  return grants
}
export const grantRows = (grants: ClassGrant[]) => grants.map(({ name, category, throwTarget }) => ({ name, category, throwTarget }))
export function activeTotem(character: any) {
  const status = character.totemStatus || abilityState(character).totemStatus
  return status?.alive === true && status?.nearby === true
}
export function abilityProficiencies(character: any, profile: any = {}) {
  const rules = { className: profile.className, classChoices: profile.classChoices, proficiencyOrigins: profile.proficiencyOrigins }
  const grants = classGrants(rules, character), profs: any[] = character.proficiencies || []
  const conditional = new Set(grants.filter(g => g.conditional).map(g => nameKey(g.name)))
  const valid = profs.filter(prof => prof.category !== 'natural' || !conditional.has(nameKey(prof.name)) || activeTotem(character))
  const combined = [...valid, ...(profile.abilityPowers || profile.powers || []).filter((power:any) => (power.minimumLevel || 1) <= (character.level || 1))]
  for (const grant of grants.filter(g => !g.conditional || activeTotem(character))) {
    if (!valid.some(p => p.category === 'natural' && nameKey(p.name) === nameKey(grant.name))) combined.push(grant)
  }
  return combined
}
export function chosenClassPowers(rules: ClassAbilityRules, character: any) {
  const choices = selectionsFor(character)
  return relevantChoices(rules, character).flatMap(definition => {
    const selected = choiceOptions(definition, character).find(option => option.key === choices[definition.id])
    if (selected?.skill) return [{ name: selected.skill, skill: selected.skill, minimumLevel: 1, description: `${selected.skill}: habilidade concedida por ${definition.label}; usa a progressão da habilidade de ladrão.` }]
    if (selected?.power === 'judge') return abilityState(character).classChoiceApprovals?.[definition.id] === approvedChoiceSignature(choices, definition.id) ? [{ name: choices[`${definition.id}-name`]!, minimumLevel: Number(choices[`${definition.id}-level`]), description: choices[`${definition.id}-description`]! }] : []
    if (selected?.power) return [{ name: selected.power, minimumLevel: selected.minimumLevel || 1, description: `Poder de Venturer concedido por ${definition.label}.` }]
    return []
  })
}
