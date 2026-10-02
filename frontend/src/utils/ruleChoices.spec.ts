import { describe, expect, it } from 'vitest'
import { allowedProficiency, choiceMagicPools, proficiencyValidation, spellValidation } from './ruleChoices'
import { proficiencyOptions, errorMessage } from './catalog'
import tables from '../../../backend/src/data/acksRules.json'
import spells from '../../../backend/src/data/spellAccess.json'

describe('choices shown by the book-rule editors', () => {
  it('rejects Seduction as a Venturer class choice and identifies the general category', () => {
    const result = proficiencyValidation(tables.classes.Venturer, 12, [{ name: 'Seduction', category: 'class' }, { name: 'Caving', category: 'general' }], tables.generalProficiencies)
    expect(result.rows[0]).toContain('categoria Geral')
    expect(proficiencyValidation(tables.classes.Venturer, 12, [{ name: 'Navigation', category: 'class' }, { name: 'Seduction', category: 'general' }], tables.generalProficiencies).issues).toEqual([])
  })
  it('accepts each catalog suggestion, including expanded specializations, in its category', () => {
    for (const rules of Object.values(tables.classes)) for (const name of proficiencyOptions(rules.proficiencies)) expect(allowedProficiency(name, rules.proficiencies), name).toBe(true)
    for (const name of tables.generalProficiencies) expect(allowedProficiency(name, tables.generalProficiencies), name).toBe(true)
    expect(allowedProficiency('Combat Trickery', tables.classes.Fighter.proficiencies)).toBe(false)
    expect(allowedProficiency('Combat Trickery (wrestling)', tables.classes.Fighter.proficiencies)).toBe(false)
    expect(allowedProficiency('Combat Trickery (disarm)', tables.classes.Fighter.proficiencies)).toBe(true)
  })
  it('checks budgets, restricted duplicates and racial bonus choices', () => {
    const choices = [{ name: 'Combat Reflexes', category: 'class' }, { name: 'Combat Reflexes', category: 'class' }]
    expect(proficiencyValidation(tables.classes.Fighter, 10, choices, tables.generalProficiencies).issues.join(' ')).toContain('não pode ser repetida')
    expect(proficiencyValidation(tables.classes.Fighter, 16, [], []).limits).toEqual({ class: 1, general: 3 })
    expect(proficiencyValidation({ ...tables.classes['Dwarven Craftpriest'], bonusGeneral: 3 }, 10, [], []).limits.general).toBe(4)
  })
  it('shows only usable traditions and keeps delayed spellcasting at zero', () => {
    expect(choiceMagicPools(tables.classes.Venturer, 10)).toEqual([])
    expect(choiceMagicPools(tables.classes.Mage, 16)[0]).toMatchObject({ tradition: 'arcane', repertoire: [3, 0, 0, 0, 0, 0] })
    expect(choiceMagicPools(tables.classes.Witch, 10)[0]).toMatchObject({ tradition: 'divine', studious: true })
    expect(choiceMagicPools(tables.classes['Nobiran Wonderworker'], 12).map(p => p.tradition)).toEqual(['arcane', 'divine'])
    expect(choiceMagicPools(tables.classes['Elven Nightblade'], 12)[0]!.slots[0]).toBe(0)
  })
  it('checks initial and later repertoire limits, traditions and catalog membership', () => {
    const magic = choiceMagicPools(tables.classes.Mage, 10)
    const armor = { name: 'Arcane Armor', level: 1, tradition: 'arcane' }
    expect(spellValidation(magic, [armor], spells).issues).toEqual([])
    expect(spellValidation(magic, [armor, armor], spells).issues.join(' ')).toContain('repetida')
    expect(spellValidation(magic, [{ ...armor, tradition: 'divine' }], spells).issues.join(' ')).toContain('indisponível')
    expect(spellValidation(magic, [{ ...armor, level: 2 }], spells).issues.join(' ')).toContain('indisponível')
    expect(spellValidation(magic, [{ ...armor, name: 'Campaign spell' }], spells).issues.join(' ')).toContain('modo manual')
    expect(spellValidation(magic, [{ ...armor, name: '' }], spells).issues).toEqual(['Escolha o nome da magia.'])
  })
  it('preserves actionable local errors without replacing network fallbacks', () => {
    expect(errorMessage(new Error('Salve a ficha antes de continuar.'), 'Falha.')).toBe('Salve a ficha antes de continuar.')
    expect(errorMessage(Object.assign(new Error('Network Error'), { isAxiosError: true }), 'Falha de conexão.')).toBe('Falha de conexão.')
  })
})
