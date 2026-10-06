import { describe, expect, it } from 'vitest'
import { creationSettings, purchaseSummary, absorbAutomaticProficiencies } from './creation'
import type { CatalogClass } from './catalog'

describe('guided creation choices', () => {
  it('moves the reported Tribal Warrior grants out of paid choices', () => {
    const paid = [{ name: 'Ambushing', category: 'class' }, { name: 'Tracking', category: 'general' }]
    const choices = [{ name: 'Adventuring', category: 'general' }, ...paid, { name: 'Running', category: 'class' }, { name: 'Endurance', category: 'general' }]
    expect(absorbAutomaticProficiencies(choices, [{ name: 'Running' }, { name: 'Endurance' }])).toEqual(paid)
    expect(choices).toHaveLength(5)
    expect(absorbAutomaticProficiencies([{ name: 'Seafaring', category: 'general' }, { name: 'Seafaring', category: 'class' }], [{ name: 'Seafaring' }])).toEqual([{ name: 'Seafaring', category: 'class' }])
  })
  it('does not infer book rules from the name or base of a free campaign class', () => {
    const free = { id: 'custom', name: 'Fighter', source: 'campaign', baseClassKey: 'catalog:fighter', creationRules: '{}' } as CatalogClass
    expect(creationSettings(free).rules).toBeUndefined()
    expect(creationSettings({ ...free, creationRules: '{invalid' })).toEqual({})
    expect(creationSettings({ ...free, creationRules: JSON.stringify({ rules: { magic: 'none' } }) }).rules.magic).toBe('none')
  })
  it('recognizes structured base rules', () => {
    const base = { id: 'catalog:fighter', source: 'catalog', rules: { magic: 'none' } } as CatalogClass
    expect(creationSettings(base).rules).toEqual({ magic: 'none' })
  })
  it('identifies the reported horse and crossbow overspend', () => {
    const equipment = [{ id: 'horse', name: 'Horse, Riding', costGp: 75 }, { id: 'crossbow', name: 'Crossbow', costGp: 30 }]
    const purchases = [{ entryId: 'horse', quantity: 1 }, { entryId: 'crossbow', quantity: 1 }]
    expect(purchaseSummary(100, purchases, equipment)).toMatchObject({ valid: true, spentGp: 105, remainingGp: -5 })
    expect(purchaseSummary(110, purchases, equipment)).toMatchObject({ coins: { gp: 5, sp: 0, cp: 0 } })
  })
  it('summarizes copper accurately and rejects incomplete purchase rows', () => {
    const entries = [{ id: 'item', name: 'Item', costGp: 0.03 }]
    expect(purchaseSummary(30, [{ entryId: 'item', quantity: 3 }], entries).coins).toEqual({ gp: 29, sp: 9, cp: 1 })
    expect(purchaseSummary(30, [{ entryId: '', quantity: 1 }], entries).valid).toBe(false)
    expect(purchaseSummary(30, [{ entryId: 'item', quantity: 1.5 }], entries).valid).toBe(false)
  })
})
