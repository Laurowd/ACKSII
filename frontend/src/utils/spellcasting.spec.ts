import { describe, expect, it } from 'vitest'
import { remainingSpellUses, spellTradition, spellCastingValidation, manualSpellChoices } from './spellcasting'
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

describe('manual spell choices', () => {
  it('uses the book access list for the selected level and class tradition', () => {
    const pools = choiceMagicPools(tables.classes.Mage, 16)
    const first = manualSpellChoices(spells, pools, 1)
    expect(first.map(spell => spell.value)).toContain('Arcane Armor')
    expect(first.map(spell => spell.value)).not.toContain('Cure Light Injury')
    expect(first.map(spell => spell.value)).not.toContain('Adjust Self')
    expect(first.find(spell => spell.value === 'Discern Gist')?.tradition).toBe('arcane')
    expect(manualSpellChoices(spells, pools, 2).map(spell => spell.value)).toContain('Adjust Self')
    const divine = manualSpellChoices(spells, pools, 1, 'divine')
    expect(divine.map(spell => spell.value)).toContain('Cure Light Injury')
    expect(divine.map(spell => spell.value)).not.toContain('Arcane Armor')
  })
  it('respects religious lists while retaining authorized campaign spells', () => {
    const revealed = { name: 'Chama revelada', level: 1, tradition: 'divine', campaignSpellId: 'revealed', description: 'Efeito completo da magia.' }
    const pools = [{ tradition: 'divine', spellList: [{ name: 'Discern Gist', level: 1 }] }]
    const choices = manualSpellChoices([...spells, revealed], pools, 1)
    expect(choices.map(spell => spell.value)).toEqual(['Chama revelada', 'Discern Gist'])
    expect(choices[0]?.hint).toContain('Magia de campanha')
    expect(JSON.stringify(choices)).not.toContain(revealed.description)
  })
  it('deduplicates names shared by traditions without selecting an ambiguous tradition', () => {
    const choices = manualSpellChoices(spells, [], 1)
    expect(choices.filter(spell => spell.value === 'Discern Gist')).toHaveLength(1)
    expect(choices.find(spell => spell.value === 'Discern Gist')).toMatchObject({ tradition: '' })
    expect(choices.find(spell => spell.value === 'Discern Gist')?.hint).toContain('Divina')
    expect(choices.find(spell => spell.value === 'Discern Gist')?.hint).toContain('Arcana')
  })
})
