import { describe, expect, it, vi } from 'vitest'
import { createResourceCache } from './resourceCache'

describe('reference cache', () => {
  it('deduplicates simultaneous reads, isolates returned objects and expires entries', async () => {
    let time = 0
    const cache = createResourceCache(() => time), loader = vi.fn(async () => ({ rules: { enabled: true } }))
    const [a, b] = await Promise.all([cache.get('catalog', 15, loader), cache.get('catalog', 15, loader)])
    a.rules.enabled = false
    expect(b.rules.enabled).toBe(true); expect(loader).toHaveBeenCalledTimes(1)
    time = 16; await cache.get('catalog', 15, loader); expect(loader).toHaveBeenCalledTimes(2)
  })
  it('does not reuse failed requests or serve an in-flight result after invalidation', async () => {
    const cache = createResourceCache(), fail = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce('online')
    await expect(cache.get('rules', 100, fail)).rejects.toThrow('offline')
    await expect(cache.get('rules', 100, fail)).resolves.toBe('online')
    let finish!: (value: string) => void
    const old = cache.get('campaign', 100, () => new Promise<string>(resolve => { finish = resolve }))
    cache.clear(); finish('old permissions')
    await expect(old).rejects.toThrow('mudaram')
    await expect(cache.get('campaign', 100, async () => 'new permissions')).resolves.toBe('new permissions')
  })
})
