export interface CatalogClass {
  id: string
  name: string
  source: 'catalog' | 'campaign'
  legacyIds?: string[]
  powers?: { name: string; description: string; minimumLevel: number }[]
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
  proficiencyOrigins?: { key: string; label: string; proficiencies: string[] }[]
}

export function classRows(c: CatalogClass) {
  const xp: number[] = JSON.parse(c.xpPerLevel)
  const titles: string[] = JSON.parse(c.titles)
  const attacks: number[] = JSON.parse(c.attackThrows)
  const saves: Record<string, number>[] = JSON.parse(c.savingThrows)
  return xp.map((value, i) => ({ level: i + 1, xp: value, title: titles[i] ?? '', attack: attacks[i], saves: saves[i] }))
}

export function selectedClass(classes: CatalogClass[], character: { classKey?: string; className: string }) {
  if (character.classKey) return classes.find(c => c.id === character.classKey || c.legacyIds?.includes(character.classKey!))
  return classes.find(c => c.source === 'campaign' && c.name === character.className) ?? classes.find(c => c.name === character.className)
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && !(error as any).isAxiosError) return error.message || fallback
  const e = error as { code?: string; config?: { method?: string }; response?: { data?: { error?: string; message?: string } } }
  if (['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(e?.code || '') && ['post', 'put', 'patch', 'delete'].includes(e?.config?.method || '')) return 'Não foi possível confirmar a resposta do servidor. A ação pode ter sido registrada. Confira os dados antes de repetir; as edições locais foram preservadas.'
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(e?.code || '')) return 'O servidor demorou para responder. Confira a conexão e tente novamente. As alterações pendentes continuam no editor.'
  if (e?.code === 'ERR_NETWORK') return 'Não foi possível conectar ao servidor. Confira sua conexão e tente novamente. As alterações pendentes continuam no editor.'
  return e.response?.data?.message || e.response?.data?.error || fallback
}

export function proficiencyOptions(entries:string[] = []) {
  return entries.flatMap(entry=>{
    const match=entry.match(/^(.+?)\s*\(([^)]+)\)$/)
    return match && match[2]!.includes(',') ? match[2]!.split(',').map(choice=>`${match[1]!.trim()} (${choice.trim()})`) : [entry]
  })
}
