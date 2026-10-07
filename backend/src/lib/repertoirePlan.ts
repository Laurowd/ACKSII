import { magicPools, type ClassRules } from './gameRules'
import { formulaKey } from './spellLearning'

/** Keep unchanged row IDs, including spell IDs referenced by an ongoing study. */
export function repertoirePlan(character: any, rules: ClassRules, spells: any[]) {
  const pools = magicPools(rules, character), retained = new Set<string>(), added: any[] = []
  const key = (spell: any) => formulaKey({ ...spell, tradition: spell.tradition || (pools.length === 1 ? pools[0]!.tradition : '') })
  for (const spell of spells) {
    const existing = character.spells.find((row: any) => !retained.has(row.id) && key(row) === key(spell))
    if (existing) retained.add(existing.id)
    else added.push(spell)
  }
  const removed = character.spells.filter((row: any) => !retained.has(row.id))
  const studious = (spell: any) => pools.find(pool => pool.tradition === (spell.tradition || (pools.length === 1 ? pools[0]!.tradition : '')))?.studious
  return { added, removed, changesStudy: [...added, ...removed].some(studious) }
}
