import { abilityState, classGrants, grantRows, type ClassAbilityRules, type ClassSelections } from './classAbilities'
import { initialAdventuring } from './creationRules'

/** Explicit reconciliation, retaining row IDs, manual targets, and unrelated choices. */
export function classChoicePlan(character: any, rules: ClassAbilityRules, choices: ClassSelections, state: any, reconcileAdventuring = false, level = character.level, convertPaid = true) {
  const next = { ...character, level, classChoices: choices, rulesState: JSON.stringify(state) }
  const grants = grantRows(classGrants(rules, next)), used = new Set<string>(), converted: any[] = [], added: any[] = [], targets: any[] = []
  const key = (name: string) => name.toLowerCase().replace(/\)\s+[1-3]$/, ')').replace(/[^a-z0-9]/g, '')
  for (const grant of grants) {
    const existing = (character.proficiencies || []).find((p: any) => !used.has(p.id) && p.category === 'natural' && key(p.name) === key(grant.name))
      || (convertPaid && (character.proficiencies || []).find((p: any) => !used.has(p.id) && ['class','general'].includes(p.category) && key(p.name) === key(grant.name)))
    if (existing) {
      used.add(existing.id)
      if (existing.category !== 'natural' || existing.name !== grant.name) converted.push({ ...existing, name: grant.name, category: 'natural' })
    } else added.push(grant)
  }
  const removed = (character.proficiencies || []).filter((p: any) => (p.category === 'natural' && !used.has(p.id)) || (['class','general'].includes(p.category) && key(p.name) === 'adventuring'))
  if(character.level!==level) for(const prof of character.proficiencies || []) if(prof.category!=='adventuring' && ['climbing','loremastery'].includes(prof.name.split('(')[0].trim().toLowerCase())) targets.push({...prof,throwTarget:prof.throwTarget + character.level - level})
  if (reconcileAdventuring) {
    const bonus = rules.className === 'Dwarven Craftpriest' ? 3 : 0, delta = bonus - Number(abilityState(character).adventuringProficiencyBonus || 0)
    if (delta) for (const prof of character.proficiencies || []) if (prof.category === 'adventuring' && initialAdventuring(character.str).some(p => p.name === prof.name)) targets.push({ ...prof, throwTarget: prof.throwTarget - delta })
    state.adventuringProficiencyBonus = bonus
  }
  const removeIds = new Set(removed.map((p: any) => p.id))
  const proficiencies = (character.proficiencies || []).filter((p: any) => !removeIds.has(p.id)).map((p: any) => targets.find(value => value.id === p.id) || converted.find(value => value.id === p.id) || p).concat(added)
  return { added, converted, removed, targets, proficiencies }
}
