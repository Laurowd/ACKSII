export interface SavedMutation { key: string; method: string; url: string; data: any }
type Listener = (event: { phase: 'start' | 'success'; mutation: SavedMutation; requestId: number }) => void
const listeners = new Set<Listener>()
let sequence = 0
export function observeMutations(listener: Listener) { listeners.add(listener); return () => listeners.delete(listener) }
export function mutationStarted(config: any) {
  const method = String(config.method || 'get').toLowerCase(), url = String(config.url || '')
  if (!['post', 'put', 'patch', 'delete'].includes(method) || !/^\/api\/(characters\/|game-rules\/characters\/|campaign-rules\/characters\/)/.test(url) || /\/preview$/.test(url)) return
  const mutation = { key: `${method}:${url}`, method, url, data: JSON.parse(JSON.stringify(config.data || {})) }
  const requestId = ++sequence
  config.localMutation = { mutation, requestId }
  for (const listener of listeners) listener({ phase: 'start', mutation, requestId })
}
export function mutationSucceeded(config: any) {
  if (config.localMutation) for (const listener of listeners) listener({ phase: 'success', ...config.localMutation })
}
