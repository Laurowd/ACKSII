import { afterEach, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
vi.mock('../utils/toast', () => ({ notifyError: vi.fn() }))
import api from './api'
import { referenceCache } from './resourceCache'
afterEach(() => { vi.unstubAllGlobals(); referenceCache.clear() })
it('sets a finite timeout and never automatically retries an uncertain write', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null })
  const adapter = vi.fn(async config => { throw new AxiosError('timeout', 'ECONNABORTED', config) })
  await expect(api.put('/api/characters/one/items/item', { version: 1, name: 'Rope' }, { adapter })).rejects.toHaveProperty('code', 'ECONNABORTED')
  expect(adapter).toHaveBeenCalledTimes(1)
  expect(adapter.mock.calls[0]![0].timeout).toBe(15_000)
})
it('invalidates reference data after changing classes or campaign settings', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null })
  const loader = vi.fn(async () => 'old')
  await referenceCache.get('catalog', 300_000, loader)
  await api.put('/api/campaigns/one/settings', {}, { adapter: async config => ({ config, data: {}, status: 200, statusText: 'OK', headers: {} }) })
  await referenceCache.get('catalog', 300_000, loader)
  expect(loader).toHaveBeenCalledTimes(2)
})
