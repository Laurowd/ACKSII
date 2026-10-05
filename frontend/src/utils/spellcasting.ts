import { spellValidation, type SpellChoice } from './ruleChoices'

export function spellTradition(info: any, spell: any): string {
  return spell.tradition || (info.magic?.length === 1 ? info.magic[0].tradition : '')
}

export function remainingSpellUses(info: any, tradition: string, level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 6) return 0
  const pool = info.magic?.find((entry: any) => entry.tradition === tradition)
  if (!pool) return 0
  return Math.max(0, Number(pool.slots?.[level - 1] || 0) - Number(info.used?.[`${tradition}:${level}`] || 0))
}

export function spellCastingValidation(info: any, spells: any[], catalog: SpellChoice[]): string[] {
  const choices = spells.map(spell => ({ name: String(spell.name || ''), level: spell.level, tradition: spellTradition(info, spell) }))
  const rows = choices.map(spell => spellValidation(info.magic || [], [spell], catalog).issues.join(' '))
  const groups = new Map<string, SpellChoice[]>()
  for (const [i, spell] of choices.entries()) {
    if (rows[i]) continue
    const key = `${spell.tradition}:${spell.level}`, group = groups.get(key) || []
    const normalized = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!group.some(entry => normalized(entry.name) === normalized(spell.name))) group.push(spell)
    groups.set(key, group)
  }
  const issues = new Map([...groups].map(([key, group]) => [key, spellValidation(info.magic || [], group, catalog).issues.join(' ')]))
  return choices.map((spell, i) => rows[i] || issues.get(`${spell.tradition}:${spell.level}`) || '')
}
export interface RepertoireDraft {
  spells: Array<{ name: string; level: number; tradition: string }> | null
  original: string
  orderApproved: boolean
  open: boolean
}
export const emptyRepertoireDraft = (): RepertoireDraft => ({ spells: null, original: '', orderApproved: false, open: false })
export const repertoireSnapshot = (draft: RepertoireDraft) => JSON.stringify({ spells: draft.spells, orderApproved: draft.orderApproved })
export const repertoireHasChanges = (draft: RepertoireDraft) => draft.spells !== null && repertoireSnapshot(draft) !== draft.original
