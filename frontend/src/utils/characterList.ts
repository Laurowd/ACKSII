type Summary = { id: string; characterName: string; className: string; campaignId: string | null; level: number; updatedAt: string; user?: { username: string } }
export type CharacterSort = 'updated' | 'name' | 'level'
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
export function filterCharacters<T extends Summary>(characters: T[], campaign: string, search: string, sort: CharacterSort) {
  const words = fold(search.trim()).split(/\s+/).filter(Boolean)
  return characters.filter(c => (campaign === 'ALL' || (c.campaignId || '') === campaign) && words.every(word => fold([c.characterName, c.className, c.user?.username].filter(Boolean).join(' ')).includes(word)))
    .sort((a, b) => (sort === 'level' ? b.level - a.level : sort === 'updated' ? (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) : 0) || (a.characterName || '').localeCompare(b.characterName || '', 'pt-BR') || a.id.localeCompare(b.id))
}
export function recentCharacters(userId: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
  const key = `acks:recent:v1:${encodeURIComponent(userId)}`
  const read = (): string[] => {
    try { const values = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(values) ? values.filter(v => typeof v === 'string').slice(0, 6) : [] } catch { return [] }
  }
  return { read, visit(id: string) { if (!userId) return; try { storage.setItem(key, JSON.stringify([id, ...read().filter(value => value !== id)].slice(0, 6))) } catch { /* Storage may be unavailable. */ } } }
}
