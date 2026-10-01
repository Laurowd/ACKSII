import { describe, it, expect } from 'vitest'
import {
  getModifier,
  formatMod,
  calculateEncumbrance,
  getEncumbranceMovement,
  getMaximumEncumbrance,
  calculateAttackThrow,
  getWeaponAbilityModifier,
  calculateAC,
  calculateInitiative,
  calculateHealingRate,
  getXpForNextLevel,
  XP_TABLE,
} from './mechanics'

describe('getModifier', () => {
  it('returns -3 for scores 1-3', () => {
    expect(getModifier(1)).toBe(-3)
    expect(getModifier(3)).toBe(-3)
  })
  it('returns -2 for 4-5', () => {
    expect(getModifier(4)).toBe(-2)
    expect(getModifier(5)).toBe(-2)
  })
  it('returns -1 for 6-8', () => {
    expect(getModifier(6)).toBe(-1)
    expect(getModifier(8)).toBe(-1)
  })
  it('returns 0 for 9-12', () => {
    expect(getModifier(9)).toBe(0)
    expect(getModifier(12)).toBe(0)
  })
  it('returns 1 for 13-15', () => {
    expect(getModifier(13)).toBe(1)
    expect(getModifier(15)).toBe(1)
  })
  it('returns 2 for 16-17', () => {
    expect(getModifier(16)).toBe(2)
    expect(getModifier(17)).toBe(2)
  })
  it('returns 3 for 18+', () => {
    expect(getModifier(18)).toBe(3)
    expect(getModifier(20)).toBe(3)
  })
})

describe('formatMod', () => {
  it('formats positive with +', () => {
    expect(formatMod(1)).toBe('+1')
    expect(formatMod(0)).toBe('+0')
  })
  it('formats negative without +', () => {
    expect(formatMod(-1)).toBe('-1')
    expect(formatMod(-3)).toBe('-3')
  })
})

describe('calculateEncumbrance', () => {
  it('sums item weight * quantity, plus weapon encumbrance, plus coins', () => {
    expect(calculateEncumbrance([
      { name: 'A', quantity: 1, weight: 2 },
      { name: 'B', quantity: 3, weight: 1 },
    ], [
      { encumbrance: 1.5 }
    ], 2000)).toBe(8.5) // (2*1) + (3*1) + 1.5 + (2000/1000) = 8.5
  })
  it('returns 0 for empty list', () => {
    expect(calculateEncumbrance([])).toBe(0)
  })
})

describe('getEncumbranceMovement', () => {
  it('returns Leve for <= 5 stone', () => {
    const r = getEncumbranceMovement(5)
    expect(r.category).toBe('Leve')
    expect(r.moveExploration).toBe(120)
    expect(r.moveCombat).toBe(40)
    expect(r.moveClimb).toBe(40)
  })
  it('returns Médio for 6-7 stone', () => {
    const r = getEncumbranceMovement(7)
    expect(r.category).toBe('Médio')
    expect(r.moveExploration).toBe(90)
  })
  it('returns Pesado for 8-10 stone', () => {
    const r = getEncumbranceMovement(10)
    expect(r.category).toBe('Pesado')
    expect(r.moveExploration).toBe(60)
  })
  it('returns Muito Pesado for > 10 stone', () => {
    const r = getEncumbranceMovement(15)
    expect(r.category).toBe('Muito Pesado')
    expect(r.moveExploration).toBe(30)
  })
  it('stops movement and reports the excess above maximum capacity', () => {
    const r = getEncumbranceMovement(18.5, 18)
    expect(r.category).toBe('Acima da capacidade')
    expect(r.overCapacity).toBe(true)
    expect(r.capacityExceededBy).toBe(0.5)
    expect(r.moveExploration).toBe(0)
    expect(r.moveCombat).toBe(0)
  })
})

describe('getMaximumEncumbrance', () => {
  it('adds the STR modifier to the 20 stone base capacity', () => {
    expect(getMaximumEncumbrance(3)).toBe(23)
    expect(getMaximumEncumbrance(-3)).toBe(17)
  })
})

describe('calculateAttackThrow', () => {
  it('adds target AC and subtracts the combined bonus', () => {
    expect(calculateAttackThrow(10, 6, 0)).toBe(16)
    expect(calculateAttackThrow(10, 6, 2)).toBe(14)
    expect(calculateAttackThrow(10, -1, 2)).toBe(7)
  })
})

describe('getWeaponAbilityModifier', () => {
  it('uses STR for melee and DEX for a weapon with range', () => {
    expect(getWeaponAbilityModifier({}, 2, -1)).toBe(2)
    expect(getWeaponAbilityModifier({ rangeShort: 30 }, 2, -1)).toBe(-1)
    expect(getWeaponAbilityModifier({ rangeShort: 30, style: 'Single Weapon' }, 2, -1)).toBe(2)
    expect(getWeaponAbilityModifier({ rangeShort: 30, style: 'Missile Weapon' }, 2, -1)).toBe(-1)
  })
})

describe('calculateAC', () => {
  it('computes noArmor, noShield, withShield', () => {
    const ac = calculateAC(4, 1, true)
    expect(ac.noArmor).toBe(1)
    expect(ac.noShield).toBe(5)
    expect(ac.withShield).toBe(6)
  })
  it('withShield does not add 1 when hasShield is false', () => {
    const ac = calculateAC(4, 0, false)
    expect(ac.withShield).toBe(4)
  })
})

describe('calculateInitiative', () => {
  it('adds dex mod and class bonus', () => {
    expect(calculateInitiative(2, 1)).toBe(3)
    expect(calculateInitiative(-1, 0)).toBe(-1)
  })
  it('defaults class bonus to 0', () => {
    expect(calculateInitiative(1)).toBe(1)
  })
})

describe('calculateHealingRate', () => {
  it('represents the ACKS II natural healing die', () => {
    expect(calculateHealingRate()).toBe('1d3')
  })
})

describe('getXpForNextLevel', () => {
  it('returns value from XP_TABLE for next level', () => {
    expect(getXpForNextLevel(1)).toBe(XP_TABLE[2])
    expect(getXpForNextLevel(1)).toBe(2000)
    expect(getXpForNextLevel(5)).toBe(32000)
  })
  it('returns 0 for level beyond table', () => {
    expect(getXpForNextLevel(14)).toBe(0)
  })
})
