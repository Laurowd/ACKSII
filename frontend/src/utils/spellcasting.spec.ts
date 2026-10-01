import { describe, expect, it } from 'vitest'
import { remainingSpellUses, spellTradition } from './spellcasting'

describe('spellcasting resources', () => {
  const info = { magic: [{ tradition: 'arcane', slots: [2, 1] }, { tradition: 'divine', slots: [1] }], used: { 'arcane:1': 2, 'divine:1': 0 } }
  it('keeps traditions separate and prevents casting an exhausted or unavailable level', () => {
    expect(remainingSpellUses(info, 'arcane', 1)).toBe(0)
    expect(remainingSpellUses(info, 'divine', 1)).toBe(1)
    expect(remainingSpellUses(info, 'arcane', 2)).toBe(1)
    expect(remainingSpellUses(info, 'arcane', 3)).toBe(0)
    expect(remainingSpellUses(info, '', 1)).toBe(0)
    expect(remainingSpellUses(info, 'arcane', 0)).toBe(0)
  })
  it('uses the sole class tradition for old spells without changing mixed repertoires', () => {
    expect(spellTradition({ magic: [info.magic[0]] }, {})).toBe('arcane')
    expect(spellTradition(info, {})).toBe('')
    expect(spellTradition(info, { tradition: 'divine' })).toBe('divine')
  })
})
