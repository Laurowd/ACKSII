import { naturalProficiencies, type ProficiencyOrigin } from './creationRules'

export function proficiencyOriginPlan(character: any, origins: ProficiencyOrigin[], origin: string) {
  const granted = naturalProficiencies(origins, origin, character.level)
  const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const used = new Set<string>(), converted: any[] = [], added: any[] = []
  for (const grant of granted) {
    const existing = character.proficiencies.find((p: any) => p.category === 'natural' && key(p.name) === key(grant.name))
      || character.proficiencies.find((p: any) => ['class','general'].includes(p.category) && key(p.name) === key(grant.name))
    if (existing) {
      used.add(existing.id)
      if (existing.category !== 'natural') converted.push({ ...existing, category: 'natural' })
    } else added.push(grant)
  }
  const removed = character.proficiencies.filter((p: any) => (p.category === 'natural' && !used.has(p.id)) || (['class','general'].includes(p.category) && key(p.name) === 'adventuring'))
  const removeIds = new Set(removed.map((p: any) => p.id))
  const choices = character.proficiencies.filter((p: any) => !removeIds.has(p.id)).map((p: any) => converted.find(value => value.id === p.id) || p).concat(added)
  return { origin, label: origins.find(value => value.key === origin)?.label, converted, added, removed, choices }
}
