import { describe, expect, it, vi } from 'vitest'
import { createCharacterOperations, mergeCharacterMutation, mergeUnchangedDraft, type OperationState } from './characterOperations'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('character relation persistence', () => {
  it('serializes edits and uses the version returned by the preceding operation', async () => {
    const character = { version: 4 }
    const prepare = vi.fn(async () => true)
    const operations = createCharacterOperations({ getCharacter: () => character, prepare })
    const versions: number[] = []
    const request = async (version: number) => { versions.push(version); return { data: { character: { version: version + 1 } } } }
    await Promise.all([operations.run('item', request), operations.run('spell', request)])
    expect(versions).toEqual([4, 5])
    expect(character.version).toBe(6)
    expect(prepare).toHaveBeenCalledTimes(2)
  })

  it('retains failed changes and retries them before later edits after changing tabs', async () => {
    const states: OperationState[] = []
    const character = { version: 1 }
    const operations = createCharacterOperations({ getCharacter: () => character, prepare: async () => true, onState: (state) => states.push(state) })
    const request = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue({ data: { character: { version: 2 }, item: { name: 'Espada' } } })
    const apply = vi.fn()
    expect(await operations.run('item', request, apply)).toBeNull()
    expect(states.at(-1)?.pending).toBe(1)
    const spell = vi.fn(async () => ({ data: { character: { version: 3 } } }))
    expect(await operations.run('spell', spell)).toBeNull()
    expect(spell).not.toHaveBeenCalled()
    expect(await operations.retryPending()).toBe(true)
    expect(request).toHaveBeenCalledTimes(2)
    expect(spell).toHaveBeenCalledWith(2)
    expect(apply).toHaveBeenCalledOnce()
    expect(states.at(-1)?.pending).toBe(0)
  })

  it('keeps conflicts blocked until local changes are explicitly discarded', async () => {
    const states: OperationState[] = []
    const operations = createCharacterOperations({ getCharacter: () => ({ version: 1 }), prepare: async () => true, onState: (state) => states.push(state) })
    const request = vi.fn(async () => { throw { response: { data: { code: 'CHARACTER_CONFLICT' } } } })
    await operations.run('item', request)
    expect(await operations.retryPending()).toBe(false)
    expect(request).toHaveBeenCalledOnce()
    expect(states.at(-1)?.conflict).toBe(true)
    operations.clearPending()
    expect(states.at(-1)).toMatchObject({ pending: 0, error: null, conflict: false })
  })

  it('waits for an active relation request without blocking its preparation', async () => {
    const response = deferred<{ data: { character: { version: number } } }>()
    let operations: ReturnType<typeof createCharacterOperations>
    operations = createCharacterOperations({ getCharacter: () => ({ version: 1 }), prepare: async () => { await operations.waitForActive(); return true } })
    const request = vi.fn(() => response.promise)
    const operation = operations.run('item', request)
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce())
    let finished = false
    const wait = operations.waitForActive().then(() => { finished = true })
    await Promise.resolve()
    expect(finished).toBe(false)
    response.resolve({ data: { character: { version: 2 } } })
    await Promise.all([operation, wait])
    expect(finished).toBe(true)
  })

  it('does not apply a late response after reload discards pending operations', async () => {
    const response = deferred<{ data: any }>()
    const character = { version: 1 }
    const operations = createCharacterOperations({ getCharacter: () => character, prepare: async () => true })
    const request = vi.fn(() => response.promise), apply = vi.fn()
    const operation = operations.run('item', request, apply)
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce())
    operations.clearPending()
    response.resolve({ data: { character: { version: 2 } } })
    expect(await operation).toBeNull()
    expect(apply).not.toHaveBeenCalled()
    expect(character.version).toBe(1)
  })

  it('keeps text typed while an earlier edit was saving', () => {
    const draft = { name: 'Machado novo', weight: 1, totalCostGp: 10 }
    mergeUnchangedDraft(draft, { name: 'Machado', weight: 1 }, { name: 'Machado', weight: 2, totalCostGp: 25 })
    expect(draft).toEqual({ name: 'Machado novo', weight: 2, totalCostGp: 25 })
  })

  it('queues a newer edit of the same item while its previous save is in flight', async () => {
    const firstResponse = deferred<{ data: any }>()
    const character = { version: 1 }
    const operations = createCharacterOperations({ getCharacter: () => character, prepare: async () => true })
    const first = vi.fn(() => firstResponse.promise)
    const saving = operations.run('items:1:update', first)
    await vi.waitFor(() => expect(first).toHaveBeenCalledOnce())
    const newer = vi.fn(async () => ({ data: { character: { version: 3 } } }))
    const next = operations.run('items:1:update', newer)
    firstResponse.resolve({ data: { character: { version: 2 } } })
    await Promise.all([saving, next])
    expect(newer).toHaveBeenCalledWith(2)
    expect(character.version).toBe(3)
  })

  it('merges a rule result without discarding changes typed during its request', () => {
    const before = { version: 1, hpCurr: 8, notes: '', spellbook: ['Sleep'], domain: { treasury: 50, strongholdName: 'Torre' }, items: [{ id: 'item', name: 'Amuleto', quantity: 1 }] }
    const draft = structuredClone(before)
    draft.notes = 'Anotação durante a pesquisa'
    draft.domain.strongholdName = 'Torre nova'
    draft.items[0]!.name = 'Amuleto identificado'
    mergeCharacterMutation(draft, before, { version: 2, hpCurr: 6, notes: '', spellbook: '["Sleep"]', domain: { treasury: 25, strongholdName: 'Torre' }, items: [{ id: 'item', name: 'Amuleto', quantity: 1 }, { id: 'produced', name: 'Varinha', quantity: 1 }] })
    expect(draft.version).toBe(2)
    expect(draft.hpCurr).toBe(6)
    expect(draft.notes).toBe('Anotação durante a pesquisa')
    expect(draft.domain).toEqual({ treasury: 25, strongholdName: 'Torre nova' })
    expect(draft.items.map((item) => item.name)).toEqual(['Amuleto identificado', 'Varinha'])
    expect(draft.spellbook).toEqual(['Sleep'])
  })

  it('never repeats an acknowledged write when its local rendering fails', async () => {
    const character = { version: 1 }
    const operations = createCharacterOperations({ getCharacter: () => character, prepare: async () => true })
    const request = vi.fn(async () => ({ data: { character: { version: 2 } } }))
    await operations.run('magic:cast', request, () => { throw Error('render failed') })
    expect(await operations.retryPending()).toBe(true)
    expect(request).toHaveBeenCalledOnce()
    expect(character.version).toBe(2)
  })

  it.each([400, 403, 409])('does not keep an invalid command pending for HTTP %i', async (status) => {
    const character = { version: 1 }
    const states: OperationState[] = []
    const operations = createCharacterOperations({ getCharacter: () => character, prepare: async () => true, onState: (state) => states.push(state) })
    const invalid = vi.fn(async () => { throw { response: { status, data: { error: 'Atualize a prévia.' } } } })
    expect(await operations.run('advance:apply', invalid)).toBeNull()
    expect(await operations.retryPending()).toBe(true)
    expect(invalid).toHaveBeenCalledOnce()
    expect(states.at(-1)).toMatchObject({ pending: 0, error: null, conflict: false })
    const valid = vi.fn(async () => ({ data: { character: { version: 2 } } }))
    await operations.run('item:update', valid)
    expect(valid).toHaveBeenCalledWith(1)
    expect(character.version).toBe(2)
  })

  it('keeps a rejected edit pending and saves a corrected draft before leaving', async () => {
    const character = { version: 1 }, states: OperationState[] = []
    const operations = createCharacterOperations({ getCharacter: () => character, prepare: async () => true, onState: (state) => states.push(state) })
    const invalid = vi.fn(async () => { throw { response: { status: 400, data: { error: 'Quantidade inválida.' } } } })
    await operations.run('items:1:update', invalid, undefined, { retainDraft: true })
    expect(states.at(-1)?.pending).toBe(1)
    // This is the same check used by the sheet's route-leave guard.
    expect(await operations.retryPending()).toBe(false)
    const corrected = vi.fn(async () => ({ data: { character: { version: 2 } } }))
    await operations.run('items:1:update', corrected, undefined, { retainDraft: true })
    expect(corrected).toHaveBeenCalledWith(1)
    expect(await operations.retryPending()).toBe(true)
    expect(states.at(-1)?.pending).toBe(0)
  })

  it('keeps the original version when retrying a command whose response was lost', async () => {
    const character = { version: 4 }
    let serverVersion = 4, castCount = 0
    const versions: number[] = []
    const operations = createCharacterOperations({ getCharacter: () => character, prepare: async () => true })
    const request = vi.fn(async (version: number) => {
      versions.push(version)
      if (version !== serverVersion) throw { response: { status: 409, data: { code: 'CHARACTER_CONFLICT' } } }
      castCount++
      serverVersion++
      // The command committed, but another response updated the local version
      // before this request's broken connection could be retried.
      character.version = serverVersion
      throw Error('response lost')
    })
    await operations.run('magic:spell:cast', request)
    expect(await operations.retryPending()).toBe(false)
    expect(versions).toEqual([4, 4])
    expect(castCount).toBe(1)
    expect(serverVersion).toBe(5)
  })
})
