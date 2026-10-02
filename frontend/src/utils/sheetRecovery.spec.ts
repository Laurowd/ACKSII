import { expect, it } from 'vitest'
import { canReplayMutation, isCorrectedEditor, restoreEditableFields } from './sheetRecovery'
it('replays only versioned mutations for the exact character and local API', () => {
  const mutation = { key: 'item', method: 'put', url: '/api/characters/hero/items/item', data: { version: 2, name: 'Rope' } }
  expect(canReplayMutation(mutation, 'hero')).toBe(true)
  for (const wrong of [{ ...mutation, url: '/api/characters/hero-other/items/item' }, { ...mutation, url: 'https://elsewhere/api/characters/hero/items/item' }, { ...mutation, data: {} }, { ...mutation, url: '/api/game-rules/characters/hero/advance/preview' }]) expect(canReplayMutation(wrong, 'hero')).toBe(false)
  expect(mutation.data.version).toBe(2)
})
it('allows a corrected editor intent without replacing an uncertain command', () => {
  const mutation = { key: 'item', method: 'put', url: '/api/characters/hero/items/item', data: { version: 2, quantity: 0 } }
  expect(isCorrectedEditor(mutation, 'hero', 'items:item:update')).toBe(true)
  expect(isCorrectedEditor(mutation, 'hero', 'items:other:update')).toBe(false)
  expect(isCorrectedEditor({ ...mutation, method: 'post', url: '/api/characters/hero/shop/purchase' }, 'hero', 'shop:purchase')).toBe(false)
})
it('restores editable fields without changing ownership, server revision or unrelated collections', () => {
  const current = { id: 'hero', version: 4, userId: 'owner', campaignId: 'camp', notes: 'server', items: [{ id: 'item' }] }
  restoreEditableFields(current, { id: 'else', version: 0, userId: 'else', campaignId: 'else', notes: 'draft', items: [] }, { id: current.id, version: current.version, userId: current.userId, campaignId: current.campaignId, notes: current.notes })
  expect(current).toMatchObject({ id: 'hero', version: 4, userId: 'owner', campaignId: 'camp', notes: 'draft' })
  expect(current.items).toEqual([{ id: 'item' }])
})
