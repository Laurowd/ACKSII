import { afterEach, describe, expect, it, vi } from 'vitest'
import { readSheetTab, saveSheetTab } from './sheetPreferences'
afterEach(() => vi.unstubAllGlobals())
describe('sheet navigation preferences', () => {
  it('remembers a tab only for the same account and character', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
    saveSheetTab('player', 'hero', 'magic')
    expect(readSheetTab('player', 'hero')).toBe('magic')
    expect(readSheetTab('another-player', 'hero')).toBe('combat')
    expect(readSheetTab('player', 'another-hero')).toBe('combat')
  })
  it('ignores obsolete tabs and does not store invalid identifiers', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => 'obsolete', setItem })
    expect(readSheetTab('player', 'hero')).toBe('combat')
    saveSheetTab('player', 'hero', 'obsolete'); saveSheetTab('', 'hero', 'magic')
    expect(setItem).not.toHaveBeenCalled()
  })
  it('keeps the sheet usable when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('Blocked') }, setItem: () => { throw Error('Blocked') } })
    expect(readSheetTab('player', 'hero')).toBe('combat')
    expect(() => saveSheetTab('player', 'hero', 'session')).not.toThrow()
  })
})
