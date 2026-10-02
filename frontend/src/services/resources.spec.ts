import { afterEach, expect, it, vi } from 'vitest'
const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('./api', () => ({ default: { get } }))
import { getResource } from './resources'
import { referenceCache } from './resourceCache'
afterEach(() => { vi.unstubAllGlobals(); referenceCache.clear(); get.mockReset() })
it('separates cached settings by account and campaign, and drops them after mutation', async () => {
  let token = 'account-a'
  vi.stubGlobal('localStorage', { getItem: () => token })
  get.mockImplementation(async () => ({ data: { account: token } }))
  expect((await getResource('/api/classes/catalog', { params: { campaignId: 'one' } })).data.account).toBe('account-a')
  await getResource('/api/classes/catalog', { params: { campaignId: 'one' } })
  await getResource('/api/classes/catalog', { params: { campaignId: 'two' } })
  expect(get).toHaveBeenCalledTimes(2)
  token = 'account-b'
  expect((await getResource('/api/classes/catalog', { params: { campaignId: 'one' } })).data.account).toBe('account-b')
  referenceCache.clear(); await getResource('/api/classes/catalog', { params: { campaignId: 'one' } })
  expect(get).toHaveBeenCalledTimes(4)
})
it('never returns data after the account changes while a request is pending', async () => {
  let token = 'one', finish!: (value: any) => void
  vi.stubGlobal('localStorage', { getItem: () => token })
  get.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const pending = getResource('/api/classes/catalog')
  token = 'two'; finish({ data: { private: 'one' } })
  await expect(pending).rejects.toThrow('sessão mudou')
  await expect(getResource('/api/characters')).rejects.toThrow('não é um catálogo')
})
