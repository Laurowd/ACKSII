/** Read-only reference data. Each caller receives its own copy. */
export function createResourceCache(now = Date.now) {
  const entries = new Map<string, { expires: number; promise: Promise<any> }>()
  let generation = 0
  return {
    clear() { generation++; entries.clear() },
    async get<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
      let entry = entries.get(key)
      if (!entry || entry.expires <= now()) {
        const started = generation
        const promise = loader().then(value => {
          if (started !== generation) throw new Error('A sessão ou as regras mudaram. Carregue novamente.')
          return value
        })
        entry = { expires: now() + ttl, promise }
        entries.set(key, entry)
        promise.catch(() => { if (entries.get(key)?.promise === promise) entries.delete(key) })
      }
      return structuredClone(await entry.promise)
    },
  }
}
export const referenceCache = createResourceCache()
