export interface CatalogClass {
  id: string
  name: string
  source: 'catalog' | 'campaign'
  hitDie: string
  conBonus: boolean
  description: string
  classFeatures: string
  baseClassKey: string
  xpPerLevel: string
  titles: string
  attackThrows: string
  savingThrows: string
  thiefSkills: string
  rebukingUndead: string
  keyAttributes?: string[]
  minimumAttributes?: Record<string, number>
  spellcaster?: boolean
  maxLevel?: number
  creationRules?: string
  ruleProfile?: any
  rules?: any
}

export function classRows(c: CatalogClass) {
  const xp: number[] = JSON.parse(c.xpPerLevel)
  const titles: string[] = JSON.parse(c.titles)
  const attacks: number[] = JSON.parse(c.attackThrows)
  const saves: Record<string, number>[] = JSON.parse(c.savingThrows)
  return xp.map((value, i) => ({ level: i + 1, xp: value, title: titles[i] ?? '', attack: attacks[i], saves: saves[i] }))
}

export function selectedClass(classes: CatalogClass[], character: { classKey?: string; className: string }) {
  if (character.classKey) return classes.find(c => c.id === character.classKey)
  return classes.find(c => c.source === 'campaign' && c.name === character.className) ?? classes.find(c => c.name === character.className)
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && !(error as any).isAxiosError) return error.message || fallback
  const e = error as { response?: { data?: { error?: string; message?: string } } }
  return e.response?.data?.message || e.response?.data?.error || fallback
}

export function proficiencyOptions(entries:string[] = []) {
  return entries.flatMap(entry=>{
    const match=entry.match(/^(.+?)\s*\(([^)]+)\)$/)
    return match && match[2]!.includes(',') ? match[2]!.split(',').map(choice=>`${match[1]!.trim()} (${choice.trim()})`) : [entry]
  })
}
