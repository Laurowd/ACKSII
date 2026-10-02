import type { SavedMutation } from '../services/mutationJournal'
export function belongsToCharacter(url: string, id: string) {
  return [`/api/characters/${id}/`, `/api/game-rules/characters/${id}/`, `/api/campaign-rules/characters/${id}/`].some(prefix => url.startsWith(prefix)) && !url.includes('?') && !url.endsWith('/preview')
}
/** Never replace a stored version with a fresh version to replay an uncertain write. */
export function canReplayMutation(mutation: SavedMutation, id: string) {
  return belongsToCharacter(mutation.url, id) && ['post', 'put', 'patch', 'delete'].includes(mutation.method) && Number.isInteger(mutation.data?.version) && mutation.data.version >= 0
}
export function isCorrectedEditor(mutation: SavedMutation, id: string, operationKey?: string) {
  if (mutation.method !== 'put' || !belongsToCharacter(mutation.url, id)) return false
  const prefix = `/api/characters/${id}/`
  if (!mutation.url.startsWith(prefix)) return false
  const parts = mutation.url.slice(prefix.length).split('/')
  return (parts.length === 1 && parts[0] === 'domain' && operationKey === 'domain:update') ||
    (parts.length === 2 && operationKey === `${parts[0]}:${parts[1]}:update`)
}
export function restoreEditableFields(current: any, saved: any, editable: Record<string, any>) {
  const protectedFields = new Set(['id', 'version', 'userId', 'campaignId', 'createdAt', 'updatedAt'])
  for (const key of Object.keys(editable)) if (!protectedFields.has(key) && key in saved) current[key] = JSON.parse(JSON.stringify(saved[key]))
}
