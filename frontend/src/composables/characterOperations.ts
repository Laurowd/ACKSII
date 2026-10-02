import { inject, type InjectionKey } from 'vue'

export interface OperationState {
  pending: number
  busy: boolean
  error: unknown | null
  conflict: boolean
}

interface Options {
  getCharacter: () => any
  prepare: (key?: string) => Promise<boolean>
  onState?: (state: OperationState) => void
}

interface Task {
  key: string
  request: (version: number) => Promise<{ data: any }>
  apply: (data: any) => void
  resolve: Array<(data: any | null) => void>
  retainDraft: boolean
  expectedVersion?: number
}

/** Kept by the sheet, so failed edits survive switching tabs. */
export function createCharacterOperations(options: Options) {
  const pending = new Map<string, Task>()
  let processing: Promise<void> | null = null
  let active: Promise<void> | null = null
  let finishActive: (() => void) | null = null
  let activeKey: string | null = null
  let error: unknown | null = null
  let lastError: unknown | null = null
  let conflict = false
  let generation = 0
  const state = () => options.onState?.({ pending: pending.size, busy: Boolean(processing), error, conflict })

  async function process() {
    while (pending.size && !error && !conflict) {
      const task = pending.values().next().value as Task
      const started = generation
      let received = false
      try {
        if (!await options.prepare(task.key)) throw new Error('Salve ou resolva o conflito da ficha antes de continuar.')
        if (started !== generation) break
        activeKey = task.key
        active = new Promise<void>((resolve) => { finishActive = resolve })
        const before = JSON.parse(JSON.stringify(options.getCharacter()))
        task.expectedVersion ??= Number(options.getCharacter().version)
        const { data } = await task.request(task.expectedVersion)
        received = true
        if (started !== generation) break
        const character = options.getCharacter()
        const returned = data.character || data.characters?.find((entry: any) => entry.id === character.id)
        if (returned) {
          const updates = { ...returned }
          for (const field of relations) if (Array.isArray(data[field])) updates[field] = data[field]
          mergeCharacterMutation(character, before, updates)
        }
        task.apply(data)
        if (pending.get(task.key) === task) pending.delete(task.key)
        task.resolve.splice(0).forEach((resolve) => resolve(data))
      } catch (caught) {
        if (started !== generation) break
        const status = (caught as any)?.response?.status
        conflict = (caught as any)?.response?.data?.code === 'CHARACTER_CONFLICT'
        const retryable = conflict || !status || status >= 500 || [408, 425, 429].includes(status)
        const retain = retryable || task.retainDraft
        // A local merge error cannot turn an acknowledged write into another write.
        if ((received || !retain) && pending.get(task.key) === task) pending.delete(task.key)
        error = caught
        lastError = caught
        state()
        // Resolve callers; retain the operation and its draft for an explicit retry.
        if (retain) for (const item of pending.values()) item.resolve.splice(0).forEach((resolve) => resolve(null))
        task.resolve.splice(0).forEach((resolve) => resolve(null))
        if (!retain) error = null
      } finally {
        finishActive?.()
        active = null
        finishActive = null
        activeKey = null
        state()
      }
    }
  }

  function start() {
    if (processing || error || conflict || !pending.size) return
    processing = Promise.resolve().then(process).finally(() => {
      processing = null
      state()
      if (pending.size && !error && !conflict) start()
    })
    state()
  }

  function run(key: string, request: Task['request'], apply: Task['apply'] = () => {}, settings: { retainDraft?: boolean } = {}) {
    if (activeKey === key && !key.endsWith(':update')) return Promise.resolve(null)
    return new Promise<any | null>((resolve) => {
      const previous = pending.get(key)
      pending.set(key, {
        key, request, apply, resolve: [...(previous?.resolve || []), resolve],
        retainDraft: settings.retainDraft === true,
        // A corrected draft is a new intent; retrying an uncertain command is not.
        expectedVersion: settings.retainDraft || (activeKey === key && key.endsWith(':update')) ? undefined : previous?.expectedVersion,
      })
      const status = (error as any)?.response?.status
      if (previous && settings.retainDraft && status >= 400 && status < 500 && !conflict) error = null
      state()
      start()
      if (error || conflict) resolve(null)
    })
  }

  async function retryPending() {
    if (conflict) return false
    if (processing) await processing
    error = null
    lastError = null
    start()
    while (processing) await processing
    return pending.size === 0
  }

  async function waitForActive() { if (active) await active }

  function clearPending() {
    generation++
    for (const item of pending.values()) item.resolve.splice(0).forEach((resolve) => resolve(null))
    pending.clear()
    error = null
    lastError = null
    conflict = false
    state()
  }

  return { run, retryPending, waitForActive, clearPending, getLastError: () => lastError }
}

export type CharacterOperations = ReturnType<typeof createCharacterOperations>
export const characterOperationsKey: InjectionKey<CharacterOperations> = Symbol('characterOperations')

export function useCharacterOperations() {
  const operations = inject(characterOperationsKey)
  if (!operations) throw new Error('O editor precisa do coordenador de salvamento da ficha.')
  return operations
}

/** Apply calculations only where the user has not typed a newer value. */
export function mergeUnchangedDraft(target: any, sent: Record<string, any>, returned: any) {
  if (!returned) return
  for (const [key, value] of Object.entries(returned)) {
    if (!(key in sent) || JSON.stringify(target[key]) === JSON.stringify(sent[key])) target[key] = value
  }
}

const relations = new Set(['weapons', 'proficiencies', 'items', 'spells', 'rituals', 'magicFormulae', 'henchmen', 'scars', 'activities', 'armyUnits', 'magicItemResearch', 'mercantileVentures'])
const listFields = new Set(['spellbook', 'learnedSpells', 'researchQueue'])

/** Merge the committed result against the draft captured before the request. */
export function mergeCharacterMutation(character: any, before: any, returned: any) {
  if (returned.version !== undefined && returned.version < character.version) return
  for (const [key, raw] of Object.entries(returned)) {
    let value: any = raw
    if (listFields.has(key) && typeof value === 'string') {
      try { const parsed = JSON.parse(value); value = Array.isArray(parsed) ? parsed : [] }
      catch { value = [] }
    }
    if (relations.has(key) && Array.isArray(value) && Array.isArray(character[key])) {
      const originals = new Map((before[key] || []).map((entry: any) => [entry.id, entry]))
      const local = new Map(character[key].map((entry: any) => [entry.id, entry]))
      const merged = value.map((entry: any) => {
        const draft = local.get(entry.id)
        if (!draft) return entry
        mergeUnchangedDraft(draft, originals.get(entry.id) || {}, entry)
        return draft
      })
      for (const draft of character[key]) if (!value.some((entry: any) => entry.id === draft.id) && JSON.stringify(draft) !== JSON.stringify(originals.get(draft.id))) merged.push(draft)
      character[key] = merged
    } else if (key === 'domain' && value && character.domain) {
      mergeUnchangedDraft(character.domain, before.domain || {}, value)
    } else if (JSON.stringify(character[key]) === JSON.stringify(before[key])) character[key] = value
  }
  if (returned.version !== undefined) character.version = returned.version
}
