import { describe, expect, it } from 'vitest'
import { RULE_CLASSES, proficiencyIssues } from './gameRules'
import { classChoiceIssues, classGrants, abilityProficiencies } from './classAbilities'
import { learnedProficiencyRows, levelReconciliation, proficiencyPowerTarget } from './levelReconciliation'
import { classProficiencyPowers } from './classProficiencies'
import { researchPlan } from './campaignRules'
import { researchAssistantAllowance } from './researchAssistance'

const hero = { level: 1, str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, proficiencies: [] as any[] }
describe('additional Revised Rulebook regressions', () => {
  it.each(['Manual of Arms', 'Siege Engineering'])('permits the additional grades described for %s', name => {
    expect(proficiencyIssues(RULE_CLASSES.Fighter!, hero, [{ name, category: 'class' }, { name, category: 'general' }])).toEqual([])
  })
  it('does not spend a Venturer choice repeating its free single-rank Diplomacy', () => {
    const choices = [{ name: 'Navigation', category: 'class' }, { name: 'Diplomacy', category: 'general' }]
    expect(proficiencyIssues(RULE_CLASSES.Venturer!, { ...hero, classChoices: { 'expert-traveling': 'Driving' } }, choices).join(' ')).toContain('não pode ser repetida')
    expect(proficiencyIssues(RULE_CLASSES.Mage!, hero, [{ name: 'Battle Magic', category: 'class' }, choices[1]!])).toEqual([])
  })
  it('counts native Theology and Craft grants before initializing newly bought grades', () => {
    const rules = RULE_CLASSES['Dwarven Craftpriest']!, character = { ...hero, classChoices: { craft: 'Craft (brewing)' } }
    expect(learnedProficiencyRows(character, rules, [{ name: 'Theology', category: 'general' }], 1)[0]?.throwTarget).toBe(4)
    expect(learnedProficiencyRows(character, rules, [{ name: 'Craft (brewing)', category: 'general' }], 1)[0]?.throwTarget).toBe(-1)
    const edited = { ...character, proficiencies: [{ id: 'old', name: 'Theology', category: 'general', throwTarget: 6 }] }
    expect(levelReconciliation(edited, rules, 2).proficiencies.find(p => p.id === 'old')?.throwTarget).toBe(6)
    expect(proficiencyPowerTarget(edited, rules, edited.proficiencies[0])).toBe(4)
    expect(edited.proficiencies[0]?.throwTarget).toBe(6)
  })
  it('counts explicit custom proficiency powers without inventing native class grants', () => {
    const rules = { abilityPowers: [{ name: 'Alchemy', minimumLevel: 1 }, { name: 'Theology', minimumLevel: 3 }] }
    expect(learnedProficiencyRows(hero, rules, [{ name: 'Alchemy', category: 'general' }], 1)[0]?.throwTarget).toBe(7)
    expect(classProficiencyPowers(rules, 1).map(p => p.name)).toEqual(['Alchemy'])
  })
  it('unlocks the Nightblade Quiet Magic equivalent with spellcasting at level two', () => {
    expect(classProficiencyPowers(RULE_CLASSES['Elven Nightblade'], 1).some(p => p.name === 'Quiet Magic')).toBe(false)
    expect(classProficiencyPowers(RULE_CLASSES['Elven Nightblade'], 2).some(p => p.name === 'Quiet Magic')).toBe(true)
  })
  it.each([['Mage', 'Collegiate Wizardry'], ['Thief', 'Streetwise']])('allows an additional grade of the fixed %s proficiency', (className, name) => {
    const rules = RULE_CLASSES[className]!
    expect(proficiencyIssues(rules, hero, [{ name, category: 'general' }])).toEqual([])
    expect(learnedProficiencyRows(hero, rules, [{ name, category: 'general' }], 1)[0]?.throwTarget).toBe(7)
  })
  it('allows additional Gambling selections for the income improvement in its description', () => {
    expect(proficiencyIssues(RULE_CLASSES.Fighter!, { ...hero, int: 13 }, [{ name: 'Combat Reflexes', category: 'class' }, { name: 'Gambling', category: 'general' }, { name: 'Gambling', category: 'general' }])).toEqual([])
  })
  it('gives legacy Antiquarian Witch the same Healing Arts as protected choices', () => {
    const character = { ...hero, level: 3, subclass: 'Antiquarian' }, rules = RULE_CLASSES.Witch!
    expect(classGrants(rules, character)).toEqual(classGrants(rules, { ...character, classChoices: { tradition: 'Antiquarian' } }))
    expect(classGrants(rules, character)[0]).toMatchObject({ name: 'Healing', ranks: 1, throwTarget: 11 })
    expect(classChoiceIssues(rules, character, undefined, true)).toEqual([])
    expect(abilityProficiencies(character, rules).some(p => p.name === 'Healing')).toBe(true)
  })
  it('retains the choice for Antiquarian Witch that already has three Healing grades', () => {
    const character = { ...hero, level: 3, subclass: 'Antiquarian', proficiencies: Array.from({ length: 3 }, () => ({ name: 'Healing', category: 'general' })) }
    expect(classGrants(RULE_CLASSES.Witch!, character)).toEqual([])
    expect(classChoiceIssues(RULE_CLASSES.Witch!, character, undefined, true).join(' ')).toContain('Arte da tradição')
    expect(classGrants(RULE_CLASSES.Witch!, { ...character, classChoices: { tradition: 'Antiquarian', 'traditional-arts': 'Alchemy' } })[0]?.name).toBe('Alchemy')
  })
})

describe('normal research-assistant limits, Rulebook p. 390', () => {
  const character = { ...hero, className: 'Mage', level: 9, workshopValue: 8000 }
  const project = { effectType: 'WEEKLY', status: 'QUEUED', spellLevel: 3, effectCount: 1, hasFormula: true }
  const assistant = { casterLevel: 14, rateBonusPercent: 0, dedication: 'dedicated' }
  const plan = { casterLevel: 9, tradition: 'arcane', rateBonusPercent: 0, dedication: 'dedicated', assistants: [] as any[], duration: 'instant', affectsUser: false, esoteric: false, healing: false, eligible: true, itemKind: 'other' }
  it('permits one assistant at INT10 and includes its real contribution', () => {
    expect(researchPlan(project, character, { ...plan, assistants: [assistant] })).toMatchObject({ researchRateGp: 2350, daysRequired: 4 })
    expect(() => researchPlan(project, character, { ...plan, assistants: [assistant, assistant] })).toThrow('Limite de 1')
    expect(researchPlan(project, { ...character, int: 16 }, { ...plan, assistants: [assistant, assistant, assistant] }).daysRequired).toBe(2)
  })
  it('rejects level zero, prayerful assistance and an unavailable caster level', () => {
    expect(() => researchPlan(project, character, { ...plan, assistants: [{ ...assistant, casterLevel: 0 }] })).toThrow('entre 1 e 14')
    expect(() => researchPlan(project, { ...character, className: 'Crusader' }, { ...plan, tradition: 'divine', assistants: [assistant] })).toThrow('conjurador de estudo')
    expect(researchAssistantAllowance(RULE_CLASSES.Mage, character, 'arcane', 10).limit).toBe(0)
    expect(researchAssistantAllowance(RULE_CLASSES.Mage, { ...character, level: 4 }, 'arcane', 4).limit).toBe(0)
  })
  it('permits studious divine assistants and independent prayerful work without assistants', () => {
    expect(researchAssistantAllowance(RULE_CLASSES.Witch, { ...character, int: 13 }, 'divine', 9).limit).toBe(2)
    expect(researchPlan(project, { ...character, className: 'Crusader' }, { ...plan, tradition: 'divine' })).toMatchObject({ researchRateGp: 600, daysRequired: 15 })
  })
})
