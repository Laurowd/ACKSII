import { describe, expect, it } from 'vitest'
import { RULE_CLASSES, GENERAL_PROFICIENCIES } from '../../../backend/src/lib/gameRules'
import { proficiencyValidation } from './ruleChoices'
import { getClassFeats } from './classFeats'
import { classEffects } from './classEffects'
import { ruleProfile } from '../../../backend/src/lib/ruleProfiles'

describe('additional class rules in the frontend', () => {
  it.each(['Manual of Arms', 'Siege Engineering'])('accepts the published grades for %s before submission', name => {
    expect(proficiencyValidation(RULE_CLASSES.Fighter, 10, [{ name, category: 'class' }, { name, category: 'general' }], GENERAL_PROFICIENCIES).issues).toEqual([])
  })
  it('accounts for Venturer fixed powers in the same validation as the API', () => {
    expect(proficiencyValidation(RULE_CLASSES.Venturer, 10, [{ name: 'Diplomacy', category: 'general' }], GENERAL_PROFICIENCIES).issues.join(' ')).toContain('não pode ser repetida')
  })
  it.each([['Mage', 'Collegiate Wizardry'], ['Thief', 'Streetwise']])('allows further grades of %s class knowledge', (className, name) => {
    expect(proficiencyValidation(RULE_CLASSES[className], 10, [{ name, category: 'general' }], GENERAL_PROFICIENCIES).issues).toEqual([])
  })
  it('allows Gambling twice when two general choices are available', () => {
    expect(proficiencyValidation(RULE_CLASSES.Fighter, 13, [{ name: 'Gambling', category: 'general' }, { name: 'Gambling', category: 'general' }], GENERAL_PROFICIENCIES).issues).toEqual([])
  })
  it('includes the revised Paladin range and practical activation constraints', () => {
    const description = getClassFeats('Paladin', 1).powers.find(power => power.name === 'Sense Evil')?.description
    expect(description).toContain('45 pés')
    expect(description).toContain('linha de visão')
    expect(description).toContain('uma vez por turno')
  })
  it('keeps the restricted Bladedancer finesse and does not add a general equivalent', () => {
    const effects = classEffects({ level: 1, str: 10, dex: 16, proficiencies: [] }, ruleProfile('Bladedancer'))
    expect(effects.finesseFor({ name: 'Sword', catalogId: 'w-sword' })).toBe(true)
    expect(effects.finesseFor({ name: 'Hand Axe', catalogId: 'w-hand-axe' })).toBe(false)
  })
})
