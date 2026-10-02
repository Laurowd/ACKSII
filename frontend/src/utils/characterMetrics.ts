import type { CatalogClass } from './catalog'
import { classEffects } from './classEffects'
import { calculateAC, calculateEncumbrance, calculateHealingRate, getEncumbranceMovement, getMaximumEncumbrance, getModifier } from './mechanics'

const number = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback

/** Shared by the live sheet, portable export and the judge's session view. */
export function calculateCharacterMetrics(character: any = {}, definition?: CatalogClass) {
  const dex = number(character.dex ?? 10, 10)
  const base = calculateAC(number(character.armorAcBonus), getModifier(dex), true)
  const adjustment = number(character.acAdjustment)
  const coins = ['coinPP', 'coinEP', 'coinGP', 'coinSP', 'coinCP'].reduce((sum, key) => sum + number(character[key]), 0)
  const items = (character.items || []).map((item: any) => ({ ...item, weight: number(item.weight), quantity: number(item.quantity, 1) }))
  const weapons = (character.weapons || []).map((weapon: any) => ({ encumbrance: number(weapon.encumbrance) }))
  const weight = calculateEncumbrance(items, weapons, coins, number(character.armorWeight))
  let xpNext = number(character.xpNext)
  if (definition) {
    try { xpNext = number(JSON.parse(definition.xpPerLevel)[number(character.level, 1)]) } catch { /* Keep manual progression if the table is unavailable. */ }
  }
  return {
    armorClass: { noArmor: base.noArmor + adjustment, noShield: base.noShield + adjustment, withShield: base.withShield + adjustment },
    initiative: classEffects({ ...character, dex }, definition?.ruleProfile).initiative,
    healingRate: calculateHealingRate(),
    encumbrance: getEncumbranceMovement(weight, getMaximumEncumbrance(getModifier(number(character.str ?? 10, 10))) - (definition?.ruleProfile?.race==='halfling'?8:0), definition?.ruleProfile?.race),
    xpNext,
  }
}
