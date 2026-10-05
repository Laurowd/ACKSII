import { describe, expect, it } from 'vitest'
import { remainingSpellUses, spellTradition, spellCastingValidation } from './spellcasting'
import tables from '../../../backend/src/data/acksRules.json'
import spells from '../../../backend/src/data/spellAccess.json'
import { choiceMagicPools } from './ruleChoices'

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
  it('disables invalid entries without blocking a valid spell or depending on description loading', () => {
    const info = { magic: choiceMagicPools(tables.classes.Priestess, 10, 8) }
    const choices = [{ name: 'Discern Gist', level: 1, tradition: '' }, { name: 'Magia', level: 1, tradition: 'divine' }]
    const result = spellCastingValidation(info, choices, spells)
    expect(result[0]).toBe('')
    expect(result[1]).toContain('escolha uma magia divina')
  })
  it('enforces valid repertoire limits while excluding placeholders and legacy duplicate rows', () => {
    const info = { magic: choiceMagicPools(tables.classes.Mage, 10) }
    const spell = { name: 'Slumber', level: 1, tradition: 'arcane' }
    const choices = [spell, { ...spell }, { name: 'Magia', level: 1, tradition: 'arcane' }]
    expect(spellCastingValidation(info, choices, spells).slice(0, 2)).toEqual(['', ''])
    choices.push({ name: 'Arcane Armor', level: 1, tradition: 'arcane' })
    expect(spellCastingValidation(info, choices, spells)[0]).toContain('limite 1')
  })
})
