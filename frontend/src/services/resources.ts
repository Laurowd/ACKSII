import api from './api'
import { referenceCache } from './resourceCache'

let identity = ''
/** Only cache catalogs/settings, never character state or operation previews. */
export async function getResource(url: string, config: { params?: Record<string, any> } = {}) {
  if (!['/api/game-rules/metadata', '/api/class-builder/metadata', '/api/classes/catalog'].includes(url) && !/^\/api\/campaigns\/[^/?]+\/settings$/.test(url)) throw new Error('Esta consulta não é um catálogo ou configuração reutilizável.')
  const session = localStorage.getItem('token') || ''
  if (session !== identity) { identity = session; referenceCache.clear() }
  const params = Object.entries(config.params || {}).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b))
  const key = JSON.stringify([url, params])
  const immutable = url === '/api/game-rules/metadata' || url === '/api/class-builder/metadata'
  const data = await referenceCache.get(key, immutable ? 300_000 : 15_000, async () => (await api.get(url, config)).data)
  if (session !== (localStorage.getItem('token') || '')) { referenceCache.clear(); throw new Error('A sessão mudou. Carregue novamente.') }
  return { data }
}
