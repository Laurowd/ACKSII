import type { CatalogClass } from './catalog'
import { classEffects } from './classEffects'
import { activeCombatModifiers, combatConfiguration } from './combatModifiers'
import { calculateAC, calculateEncumbrance, calculateHealingRate, getEncumbranceMovement, getMaximumEncumbrance, getModifier } from './mechanics'
import { abilityProficiencies, chosenClassPowers } from '../../../backend/src/lib/classAbilities'

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
  const effects = classEffects({ ...character, dex }, definition?.ruleProfile)
  const configuration = combatConfiguration(character), modifiers = activeCombatModifiers(character)
  const armorSources = [{ source: 'DEX', value: getModifier(dex) }, { source: character.armorName || 'Armadura/efeitos já registrados', value: number(character.armorAcBonus) }, { source: 'Ajuste manual existente', value: adjustment }]
  const initiativeSources = [...effects.initiativeSources]
  for (const modifier of modifiers) (modifier.stat === 'ac' ? armorSources : initiativeSources).push({ source: modifier.source, value: modifier.value })
  const powers = [...abilityProficiencies(character, definition?.ruleProfile), ...chosenClassPowers(definition?.ruleProfile || {}, character), ...(definition?.ruleProfile?.powers || []).filter((p: any) => p.minimumLevel <= number(character.level, 1))]
  const has = (name: string) => powers.some((power: any) => String(power.name).trim().toLowerCase() === name.toLowerCase())
  const eligible = configuration.powersEnabled && configuration.lightArmor && number(character.armorWeight) <= 2 && weight <= 5
  if (eligible) {
    const graceful = definition?.ruleProfile?.gracefulFighting || has('Graceful Fighting'), swashbuckling = has('Swashbuckling')
    const bonus = 1 + Math.floor((number(character.level, 1) - 1) / 6)
    if (graceful) { armorSources.push({ source: 'Graceful Fighting', value: bonus }); initiativeSources.push({ source: 'Graceful Fighting', value: 1 }) }
    if (swashbuckling) armorSources.push({ source: 'Swashbuckling', value: graceful && (Boolean(character.armorName?.trim()) || number(character.armorAcBonus) > 0 || number(character.armorWeight) > 0) ? Math.min(1, bonus) : bonus })
  }
  const extraArmor = armorSources.slice(3).reduce((sum, entry) => sum + entry.value, 0)
  let xpNext = number(character.xpNext)
  if (definition) {
    try { xpNext = number(JSON.parse(definition.xpPerLevel)[number(character.level, 1)]) } catch { /* Keep manual progression if the table is unavailable. */ }
  }
  const encumbrance = getEncumbranceMovement(weight, getMaximumEncumbrance(getModifier(number(character.str ?? 10, 10))) - (definition?.ruleProfile?.race === 'halfling' ? 8 : 0), definition?.ruleProfile?.race)
  // Standard medium armor weighs up to 4 stone.
  const running = has('Running') && weight <= 7 && number(character.armorWeight) <= 4 && !encumbrance.overCapacity
  if (running) {
    encumbrance.moveExploration += 30; encumbrance.moveCombat += 10; encumbrance.moveCharge += 30
    encumbrance.moveExpedition += 6; encumbrance.moveStealth += 10; encumbrance.moveClimb += 10
  }
  return {
    armorClass: { noArmor: base.noArmor + adjustment + extraArmor, noShield: base.noShield + adjustment + extraArmor, withShield: base.withShield + adjustment + extraArmor },
    armorSources, initiativeSources,
    initiative: initiativeSources.reduce((sum, entry) => sum + entry.value, 0),
    castingInitiative: effects.castingInitiative + modifiers.filter(entry => entry.stat === 'initiative').reduce((sum, entry) => sum + entry.value, 0),
    healingRate: calculateHealingRate(),
    encumbrance, movementSources: running ? [{source: 'Running', value: 30}] : [],
    xpNext,
  }
}
