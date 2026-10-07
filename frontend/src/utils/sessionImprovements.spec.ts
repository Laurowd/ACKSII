import { describe, expect, it } from 'vitest'
import { calculateCharacterMetrics } from './characterMetrics'
import { characterExport } from './characterExport'
import { presentAudit } from './auditPresentation'

describe('combat sources and compatibility', () => {
  const combat = { powersEnabled: true, lightArmor: true, modifiers: [] }
  const character = { dex: 10, str: 10, level: 7, armorName: 'Leather', armorWeight: 1, armorAcBonus: 2, acAdjustment: -1, proficiencies: [{ name: 'Swashbuckling' }], rulesState: JSON.stringify({ combat }), items: [] }
  const definition: any = { ruleProfile: { gracefulFighting: true } }
  it('keeps legacy values until the user opts into conditional powers', () => {
    expect(calculateCharacterMetrics({ ...character, rulesState: '{}' }, definition).armorClass.noShield).toBe(1)
    expect(calculateCharacterMetrics(character, definition).armorClass.noShield).toBe(4)
    expect(calculateCharacterMetrics(character, definition).initiative).toBe(1)
    expect(characterExport(character, definition).computed.armorSources.map(entry => entry.source)).toContain('Swashbuckling')
  })
  it('stops conditional bonuses when heavy armor or load violates the condition', () => {
    expect(calculateCharacterMetrics({ ...character, armorName:'Chain Mail',armorWeight: 3 }, definition).armorClass.noShield).toBe(1)
    expect(calculateCharacterMetrics({ ...character, items: [{ weight: 5, quantity: 1 }] }, definition).initiative).toBe(0)
  })
  it('requires an identified, carried item and applies a source only once', () => {
    const modifier = { source: 'Ring', stat: 'ac', value: 2, active: true, itemId: 'ring' }
    const c = { dex: 10, items: [{ id: 'ring', magicDetails: '{"identified":true}', slot: 'worn', weight: 0, quantity: 1 }], rulesState: JSON.stringify({ combat: { ...combat, powersEnabled: false, modifiers: [modifier, modifier] } }) }
    expect(calculateCharacterMetrics(c).armorClass.noShield).toBe(2)
    expect(calculateCharacterMetrics({ ...c, items: [{ ...c.items[0], slot: 'stashed' }] }).armorClass.noShield).toBe(0)
    expect(calculateCharacterMetrics({ ...c, items: [{ ...c.items[0], magicDetails: '{}' }] }).armorClass.noShield).toBe(0)
  })
  it('includes item initiative when casting while excluding combat-only reflexes', () => {
    const c = { dex: 13, proficiencies: [{ name: 'Combat Reflexes' }], items: [{ id: 'ring', magicDetails: '{"identified":true}', slot: 'worn' }], rulesState: JSON.stringify({ combat: { ...combat, powersEnabled: false, modifiers: [{ source: 'Ring', stat: 'initiative', value: 2, active: true, itemId: 'ring' }] } }) }
    const metrics = calculateCharacterMetrics(c)
    expect(metrics.initiative).toBe(4); expect(metrics.castingInitiative).toBe(3)
  })
})
describe('readable campaign history', () => {
  it('presents a group reward without inventing a missing character', () => {
    const presentation = presentAudit({ action: 'REWARD_SETTLEMENT', details: JSON.stringify({ awards: [{ name: 'Lief', gained: 500, gold: 30 }], reason: 'Ruins' }) })
    expect(presentation).toEqual({ title: 'Distribuição de XP e ouro', subject: 'Campanha', lines: ['Lief: +500 XP · +30 GP', 'Motivo: Ruins'] })
  })
  it('preserves readable legacy history and tolerates malformed records', () => {
    expect(presentAudit({ details: 'PV(10→8)', character: { characterName: 'Lief' } }).lines).toEqual(['PV(10→8)'])
    expect(presentAudit({ action: 'UNKNOWN', details: '{}' }).lines).toEqual([])
  })
})
