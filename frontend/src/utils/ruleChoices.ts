import { getModifier } from './mechanics'

export interface ProficiencyChoice { name: string; category: string }
export interface SpellChoice { name: string; level: number; tradition: string }
export interface MagicChoicePool { tradition: string; studious: boolean; slots: number[]; repertoire: (number | null)[] }
const normalized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
export const categoryName = (category: string) => category === 'class' ? 'de classe' : 'geral'
export const traditionName = (tradition: string) => tradition === 'divine' ? 'divina' : 'arcana'

export function allowedProficiency(name: string, entries: string[] = []) {
  return entries.some(entry => {
    if (normalized(name) === normalized(entry)) return !entry.includes(',')
    if (normalized(name.split('(')[0]!) !== normalized(entry.split('(')[0]!)) return false
    if (!entry.includes('(')) return true
    const option = name.match(/\(([^)]+)\)/)?.[1]
    return !!option && (entry.match(/\(([^)]+)\)/)?.[1] || '').split(',').some(value => normalized(value) === normalized(option))
  })
}

export function proficiencyValidation(rules: any, intellect: number, choices: ProficiencyChoice[], general: string[] = [], level = 1) {
  const limits = { class: 1 + Math.floor(level / rules.proficiencyPeriod), general: 1 + (rules.bonusGeneral || 0) + Math.max(0, getModifier(intellect)) + [5, 9, 13].filter(n => n <= level).length }
  const rows = choices.map(choice => {
    if (!choice.name.trim()) return 'Preencha o nome da proficiência.'
    const allowed = choice.category === 'class' ? rules.proficiencies : general
    if (allowedProficiency(choice.name, allowed)) return ''
    const other = choice.category === 'class' ? general : rules.proficiencies
    return `${choice.name}: não pertence à lista ${categoryName(choice.category)} desta classe.${allowedProficiency(choice.name, other) ? ` Está disponível na categoria ${choice.category === 'class' ? 'Geral' : 'Classe'}; confira os limites antes de trocar.` : ' Escolha uma opção da lista ou registre a exceção no modo manual.'}`
  })
  const issues = rows.filter(Boolean)
  for (const category of ['class', 'general'] as const) {
    const count = choices.filter(p => p.category === category).length
    if (count > limits[category]) issues.push(`Proficiências ${categoryName(category)}: ${count} escolhas; limite ${limits[category]}.`)
  }
  const singleRank = ['combatreflexes', 'combatferocity', 'alertness', 'swashbuckling', 'weaponfinesse', 'endurance', 'running', 'ambushing', 'blindfighting']
  for (const name of singleRank) if (choices.filter(p => normalized(p.name) === name).length > 1) issues.push(`A proficiência ${choices.find(p => normalized(p.name) === name)!.name} não pode ser repetida.`)
  return { rows, issues, limits }
}

export function choiceMagicPools(rules: any, intellect: number, level = 1): MagicChoicePool[] {
  const row = rules?.levels?.[level - 1]
  if (!row || rules.magic === 'none') return []
  const kinds = rules.magic === 'dual' ? ['arcane', 'divine'] : [rules.magic === 'studious-divine' ? 'divine' : rules.magic]
  return kinds.map((tradition, index) => {
    const slots = Array.from({ length: 6 }, (_, i) => row.spellSlots[index * 6 + i] || 0)
    const studious = tradition === 'arcane' || rules.magic === 'studious-divine'
    return { tradition, studious, slots, repertoire: slots.map(n => !n ? 0 : studious ? n + Math.max(0, getModifier(intellect)) : null) }
  })
}

export function spellValidation(pools: MagicChoicePool[], choices: SpellChoice[], spells: SpellChoice[]) {
  const seen = new Set<string>()
  const rows = choices.map(spell => {
    if (!spell.name.trim()) return 'Escolha o nome da magia.'
    const pool = pools.find(p => p.tradition === spell.tradition)
    if (!pool || !Number.isInteger(spell.level) || !pool.slots[spell.level - 1]) return `${spell.name}: tradição ou nível indisponível para esta classe no nível atual.`
    const key = `${pool.tradition}:${normalized(spell.name)}`
    if (seen.has(key)) return `${spell.name}: repetida no repertório ${traditionName(pool.tradition)}.`
    seen.add(key)
    if (!spells.some(s => normalized(s.name) === normalized(spell.name) && s.level === spell.level && s.tradition === pool.tradition)) return `${spell.name}: escolha uma magia ${traditionName(pool.tradition)} de nível ${spell.level} da lista, ou registre a exceção no modo manual.`
    return ''
  })
  const issues = rows.filter(Boolean)
  for (const pool of pools) for (let i = 0; i < 6; i++) {
    const count = choices.filter(s => s.level === i + 1 && s.tradition === pool.tradition).length
    const limit = pool.repertoire[i]
    if (limit != null && count > limit) issues.push(`Repertório ${traditionName(pool.tradition)} de nível ${i + 1}: ${count} magias; limite ${limit}.`)
  }
  return { rows, issues }
}
