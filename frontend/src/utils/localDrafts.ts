export interface LocalDraft<T> { schema: 1; savedAt: number; data: T }
const maxAge = 14 * 24 * 60 * 60 * 1000
export function draftKey(userId: string, scope: string) { return `acks:draft:v1:${encodeURIComponent(userId)}:${encodeURIComponent(scope)}` }
export function createLocalDraft<T>(userId: string, scope: string, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage, now = Date.now) {
  const key = draftKey(userId, scope)
  function remove() { try { storage.removeItem(key) } catch { /* Private browsing/quota. */ } }
  return {
    remove,
    read(): LocalDraft<T> | null {
      if (!userId) return null
      try {
        const raw = storage.getItem(key)
        if (!raw || raw.length > 2_000_000) return null
        const value = JSON.parse(raw)
        if (value.schema === 1 && Number.isFinite(value.savedAt) && value.savedAt <= now() && now() - value.savedAt < maxAge && value.data && typeof value.data === 'object') return value
      } catch { /* Corrupt/inaccessible local data must not break the editor. */ }
      remove(); return null
    },
    write(data: T) {
      if (!userId) return false
      try {
        const serialized = JSON.stringify({ schema: 1, savedAt: now(), data })
        if (serialized.length > 2_000_000) return false
        storage.setItem(key, serialized); return true
      } catch { return false }
    },
  }
}
