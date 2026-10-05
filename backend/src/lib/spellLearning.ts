import { magicPools, normalized, readState, SPELL_LIST, spellIssues, type ClassRules } from './gameRules'
export function formulaKey(spell: any) { return `${spell.tradition}:${spell.level}:${normalized(spell.name)}` }
export function studyPlan(character: any, rules: ClassRules, input: any) {
  const spell = SPELL_LIST.find(entry => formulaKey(entry) === input.formulaKey)
  if (!spell) throw new Error('Escolha uma fórmula do catálogo.')
  const pool = magicPools(rules, character).find(entry => entry.tradition === spell.tradition && entry.studious)
  if (!pool?.slots[spell.level - 1]) throw new Error('A classe precisa estudar e já poder conjurar magias deste nível.')
  const state = readState(character.rulesState)
  const names = (() => { try { return JSON.parse(character.spellbook || '[]') } catch { return [] } })()
  if (!(state.formulas || []).some((entry: any) => formulaKey(entry) === input.formulaKey) && !(Array.isArray(names) && names.some((name: any) => typeof name === 'string' && normalized(name) === normalized(spell.name)))) throw new Error('Registre a fórmula adquirida no grimório antes de iniciar o estudo.')
  if (character.spells.some((entry: any) => formulaKey({ ...entry, tradition: entry.tradition || pool.tradition }) === formulaKey(spell))) throw new Error('Esta magia já pertence ao repertório.')
  const replaced = input.replaceSpellId && character.spells.find((entry: any) => entry.id === input.replaceSpellId)
  if (input.replaceSpellId && (!replaced || replaced.level !== spell.level || (replaced.tradition || pool.tradition) !== spell.tradition)) throw new Error('A substituição precisa ser de uma magia da mesma tradição e nível.')
  const proposed = [...character.spells.filter((entry: any) => entry.id !== input.replaceSpellId), spell]
  const issues = spellIssues(rules, character, proposed)
  if (issues.length) throw new Error(issues.join(' '))
  return { spell: { name: spell.name, level: spell.level, tradition: spell.tradition }, replaceSpellId: input.replaceSpellId || null, replacedName: replaced?.name || null }
}
