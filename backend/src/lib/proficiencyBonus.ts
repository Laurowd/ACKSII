/** Judge's Journal p. 300: racial search/listen and rebuking are exceptions. */
export function proficiencyBonus(rules: { className?: string; race?: string; racialValue?: number; proficiencyBonus?: number } = {}) {
  return rules.proficiencyBonus ?? (rules.race === 'dwarf' ? Number(rules.racialValue || 0) : rules.className === 'Dwarven Craftpriest' ? 3 : 0)
}
export function adventuringBonus(name: string, rules: Parameters<typeof proficiencyBonus>[0] = {}) {
  const dwarf = rules.race === 'dwarf' || rules.className?.startsWith('Dwarven ')
  return dwarf && ['Searching', 'Listening'].includes(name) ? 0 : proficiencyBonus(rules)
}
