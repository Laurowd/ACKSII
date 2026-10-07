import { getModifier } from './mechanics'
import { abilityProficiencies } from '../../../backend/src/lib/classAbilities'
import { proficiencyRankIssues } from '../../../backend/src/lib/proficiencyRanks'
import { classProficiencyPowers } from '../../../backend/src/lib/classProficiencies'
import { restrictedRepertoire, restrictedRepertoireIssues } from '../../../backend/src/lib/warlockPaths'

export interface ProficiencyChoice { name: string; category: string }
export interface SpellChoice { name: string; level: number; tradition: string; campaignSpellId?: string; description?: string; range?: string; duration?: string; types?:string[] }
export interface MagicChoicePool { tradition: string; studious: boolean; slots: number[]; repertoire: (number | null)[]; spellList?:SpellChoice[]; restricted?:{path:string;extra:number;types:string[]} }
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

export function proficiencyValidation(rules: any, intellect: number, choices: ProficiencyChoice[], general: string[] = [], level = 1, grants: { name: string; ranks?: number; conditional?: boolean }[] = []) {
  const limits = { class: 1 + Math.floor(level / rules.proficiencyPeriod), general: 1 + (rules.bonusGeneral || 0) + Math.max(0, getModifier(intellect)) + [5, 9, 13].filter(n => n <= level).length }
  const rows = choices.map(choice => {
    if (!choice.name.trim()) return 'Preencha o nome da proficiência.'
    if (choice.category === 'adventuring') return ''
    if (choice.category === 'natural') return grants.some(grant => normalized(grant.name) === normalized(choice.name)) ? '' : `${choice.name}: não é concedida pelas escolhas de classe registradas.`
    if (normalized(choice.name) === 'adventuring') return 'Adventuring já é concedida automaticamente; não gasta uma escolha.'
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
  issues.push(...proficiencyRankIssues(choices,grants,classProficiencyPowers(rules,level)))
  return { rows, issues, limits }
}

export function choiceMagicPools(rules: any, intellect: number, level = 1, character: any = {}): MagicChoicePool[] {
  const row = rules?.levels?.[level - 1]
  if (!row || rules.magic === 'none') return []
  const kinds = rules.magic === 'dual' ? ['arcane', 'divine'] : [rules.magic === 'studious-divine' ? 'divine' : rules.magic]
  return kinds.map((tradition, index) => {
    const slots = Array.from({ length: 6 }, (_, i) => row.spellSlots[index * 6 + i] || 0)
    const studious = tradition === 'arcane' || rules.magic === 'studious-divine'
    const expanded = abilityProficiencies({ ...character, level }, rules).some(proficiency => normalized(proficiency.name) === 'expandedrepertoire') ? 1 : 0
    const restricted=tradition==='arcane'?restrictedRepertoire(rules,character,level):undefined
    return { tradition, studious, slots, repertoire: slots.map(n => !n ? 0 : studious ? n + Math.max(0, getModifier(intellect)) + expanded + (restricted?.extra || 0) : null), ...(restricted?{restricted}:{}), ...(tradition==='divine'&&rules.divineSpellList?{spellList:rules.divineSpellList}:{}) }
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
    const entry = spells.find(s => normalized(s.name) === normalized(spell.name) && s.level === spell.level && s.tradition === pool.tradition)
    if (!entry) return `${spell.name}: escolha uma magia ${traditionName(pool.tradition)} de nível ${spell.level} da lista, confira a liberação pelo mestre ou registre apenas a referência no modo manual.`
    if(!entry.campaignSpellId&&pool.spellList&&!pool.spellList.some(s=>normalized(s.name)===normalized(spell.name)&&s.level===spell.level))return `${spell.name}: não pertence ao repertório religioso desta classe.`
    return ''
  })
  const issues = rows.filter(Boolean)
  for (const pool of pools) for (let i = 0; i < 6; i++) {
    const count = choices.filter(s => s.level === i + 1 && s.tradition === pool.tradition).length
    const limit = pool.repertoire[i]
    if (limit != null && count > limit) issues.push(`Repertório ${traditionName(pool.tradition)} de nível ${i + 1}: ${count} magias; limite ${limit}.`)
  }
  for(const pool of pools)issues.push(...restrictedRepertoireIssues(pool,choices,spells))
  return { rows, issues }
}
