import { expect, it } from 'vitest'
import { createLocalDraft, draftKey } from './localDrafts'
function memory() { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v) }, removeItem: (k: string) => { map.delete(k) } } }
it('recovers only the same user and character, removes completed drafts and expires old data', () => {
  const storage = memory(); let time = 100
  const own = createLocalDraft<{ notes: string }>('one', 'sheet:hero', storage, () => time)
  expect(own.write({ notes: 'unsaved' })).toBe(true)
  expect(createLocalDraft('two', 'sheet:hero', storage, () => time).read()).toBeNull()
  expect(createLocalDraft('one', 'sheet:other', storage, () => time).read()).toBeNull()
  expect(own.read()?.data.notes).toBe('unsaved')
  time += 15 * 86400000; expect(own.read()).toBeNull()
  own.write({ notes: 'new' }); own.remove(); expect(own.read()).toBeNull()
})
it('ignores corruption, future dates, huge data, storage failures and anonymous drafts', () => {
  const storage = memory(), key = draftKey('one', 'hero'), own = createLocalDraft('one', 'hero', storage, () => 1)
  for (const value of ['{broken', JSON.stringify({ schema: 1, savedAt: 2, data: {} })]) { storage.setItem(key, value); expect(own.read()).toBeNull() }
  expect(own.write({ notes: 'a'.repeat(2_000_001) })).toBe(false)
  const blocked = { getItem: () => { throw Error() }, setItem: () => { throw Error() }, removeItem: () => { throw Error() } }
  expect(createLocalDraft('one', 'hero', blocked).read()).toBeNull()
  expect(createLocalDraft('one', 'hero', blocked).write({ notes: 'hi' })).toBe(false)
  expect(createLocalDraft('', 'hero', storage).write({ notes: 'hi' })).toBe(false)
})
