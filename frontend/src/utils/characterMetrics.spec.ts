import { describe, expect, it } from 'vitest'
import { calculateCharacterMetrics } from './characterMetrics'
import { characterExport, characterPrintHtml } from './characterExport'
import { parseCharacterImport } from './characterImport'
import type { CatalogClass } from './catalog'

describe('current values in the sheet and portable exports', () => {
  const character = { characterName: '<script>alert(1)</script>', dex: 16, str: 10, armorAcBonus: 2, armorWeight: 6, acAdjustment: -1,
    acNoShield: 2, initiative: 0, moveCombat: 40, healingRate: 0, items: [], weapons: [], proficiencies: [{ name: 'Combat Reflexes' }] }
  it('recalculates AC, initiative and load before saving', () => {
    const metrics = calculateCharacterMetrics(character)
    expect(metrics.armorClass).toEqual({ noArmor: 1, noShield: 3, withShield: 4 })
    expect(metrics.initiative).toBe(3)
    expect(metrics.encumbrance.moveCombat).toBe(30)
    const exported = characterExport(character)
    expect(exported.character).toMatchObject({ acNoShield: 3, initiative: 3, moveCombat: 30 })
    expect(exported.computed.healingRate).toBe('1d3')
    const html = characterPrintHtml(character)
    expect(html).toContain('CA sem escudo</dt><dd>3</dd>')
    expect(html).toContain('Recuperação</dt><dd>1d3</dd>')
    expect(html).not.toContain('<script>')
    expect(character.acNoShield).toBe(2)
  })
  it('keeps zero/negative AC and counts carried load only', () => {
    const metrics = calculateCharacterMetrics({ dex: 3, str: 10, items: [{ weight: 100, quantity: 1, slot: 'stashed' }], coinGP: 1000 })
    expect(metrics.armorClass.noShield).toBe(-3)
    expect(metrics.encumbrance.totalStone).toBe(1)
    expect(calculateCharacterMetrics({ dex: 10 }).armorClass.noShield).toBe(0)
  })
  it('exports class progression and respects a campaign manual progression exception', () => {
    const definition = { xpPerLevel: '[0,2000,4000]' } as CatalogClass
    expect(characterExport({ ...character, level: 1, xpNext: 123 }, definition).character).toMatchObject({ xpNext: 2000 })
    expect(characterExport({ ...character, level: 1, xpNext: 123 }, definition, false).character).toMatchObject({ xpNext: 123 })
  })
  it('accepts exports and rejects malformed, unrelated and oversized files', () => {
    expect(parseCharacterImport(JSON.stringify(characterExport(character))).character.characterName).toBe(character.characterName)
    for (const value of ['invalid', '{}', JSON.stringify({ format: 'acks-ii-character', version: 2, character: {} }), ' '.repeat(245761)]) expect(() => parseCharacterImport(value)).toThrow()
  })
})
