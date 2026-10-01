// ACKS II Mechanics Engine
// Auto-calculates modifiers, AC, encumbrance, movement, etc.

/** Standard ACKS II ability score modifier table */
export function getModifier(score: number): number {
  if (score <= 3) return -3;
  if (score <= 5) return -2;
  if (score <= 8) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3; // 18+
}

/** Format modifier with sign */
export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Calculate Encumbrance in stone */
export interface ItemData {
  name?: string;
  quantity: number;
  weight: number; // in stone
  slot?: string;
}

export interface WeaponData {
  encumbrance: number; // in stone
}

export function calculateEncumbrance(items: ItemData[], weapons: WeaponData[] = [], totalCoins: number = 0, armorWeight: number = 0): number {
  const itemWeight = items
    .filter(i => i.slot !== 'mount' && i.slot !== 'vehicle' && i.slot !== 'stashed')
    .reduce((total, item) => total + item.weight * item.quantity, 0);
  const weaponWeight = weapons.reduce((total, w) => total + (w.encumbrance || 0), 0);
  const coinWeight = totalCoins / 1000; // 1000 coins = 1 stone in ACKS
  return itemWeight + weaponWeight + coinWeight + armorWeight;
}

export interface EncumbranceResult {
  totalStone: number;
  maxCapacity: number;
  overCapacity: boolean;
  capacityExceededBy: number;
  category: string;
  moveExploration: number;
  moveCombat: number;
  moveCharge: number;
  moveExpedition: number;
  moveStealth: number;
  moveClimb: number;
}

/** Maximum carried load in stone: 20 plus the character's STR modifier. */
export function getMaximumEncumbrance(strengthModifier: number = 0): number {
  const modifier = Number.isFinite(strengthModifier) ? strengthModifier : 0;
  return Math.max(0, 20 + modifier);
}

export function getEncumbranceMovement(totalStone: number, maxCapacity: number = 20): EncumbranceResult {
  const safeTotal = Math.max(0, Number.isFinite(totalStone) ? totalStone : 0);
  const safeCapacity = Math.max(0, Number.isFinite(maxCapacity) ? maxCapacity : 20);
  const shared = {
    totalStone: safeTotal,
    maxCapacity: safeCapacity,
    overCapacity: safeTotal > safeCapacity,
    capacityExceededBy: Math.max(0, safeTotal - safeCapacity),
  };

  if (shared.overCapacity) {
    return {
      ...shared, category: 'Acima da capacidade',
      moveExploration: 0, moveCombat: 0, moveCharge: 0, moveExpedition: 0, moveStealth: 0, moveClimb: 0,
    };
  }

  // ACKS II encumbrance thresholds (in stone): 0+, >5, >7, >10
  if (safeTotal <= 5) {
    return {
      ...shared, category: 'Leve',
      moveExploration: 120, moveCombat: 40, moveCharge: 120, moveExpedition: 24, moveStealth: 40, moveClimb: 40,
    };
  } else if (safeTotal <= 7) {
    return {
      ...shared, category: 'Médio',
      moveExploration: 90, moveCombat: 30, moveCharge: 90, moveExpedition: 18, moveStealth: 30, moveClimb: 30,
    };
  } else if (safeTotal <= 10) {
    return {
      ...shared, category: 'Pesado',
      moveExploration: 60, moveCombat: 20, moveCharge: 60, moveExpedition: 12, moveStealth: 20, moveClimb: 20,
    };
  } else {
    return {
      ...shared, category: 'Muito Pesado',
      moveExploration: 30, moveCombat: 10, moveCharge: 30, moveExpedition: 6, moveStealth: 10, moveClimb: 10,
    };
  }
}

/** Target number to hit an AC: class base + target AC - all applicable bonuses. */
export function calculateAttackThrow(baseThrow: number, targetAC: number, totalBonus: number = 0): number {
  return baseThrow + targetAC - totalBonus;
}

export interface AttackWeaponData {
  style?: string;
  rangeShort?: number;
  rangeMed?: number;
  rangeLong?: number;
}

/** Ranged weapons use DEX; weapons without a listed range use STR. */
export function getWeaponAbilityModifier(weapon: AttackWeaponData, strMod: number, dexMod: number): number {
  if (weapon.style === 'Missile Weapon') return dexMod;
  if (['Single Weapon', 'Dual Weapon', 'Two-Handed Weapon', 'Weapon and Shield'].includes(weapon.style ?? '')) return strMod;
  const isRanged = Number(weapon.rangeShort || 0) > 0
    || Number(weapon.rangeMed || 0) > 0
    || Number(weapon.rangeLong || 0) > 0;
  return isRanged ? dexMod : strMod;
}

/** AC calculation: base 0 + armor + shield + DEX mod */
export function calculateAC(baseAC: number, dexMod: number, hasShield: boolean): {
  noArmor: number;
  noShield: number;
  withShield: number;
} {
  return {
    noArmor: 0 + dexMod,
    noShield: baseAC + dexMod,
    withShield: baseAC + dexMod + (hasShield ? 1 : 0),
  };
}

/** Initiative bonus = DEX mod + class bonus */
export function calculateInitiative(dexMod: number, classBonus: number = 0): number {
  return dexMod + classBonus;
}

/** Natural healing after a full day of rest. */
export function calculateHealingRate(): string {
  return '1d3';
}

/** XP needed for next level (common ACKS progression) */
export const XP_TABLE: Record<number, number> = {
  1: 0,
  2: 2000,
  3: 4000,
  4: 8000,
  5: 16000,
  6: 32000,
  7: 64000,
  8: 130000,
  9: 260000,
  10: 390000,
  11: 520000,
  12: 650000,
  13: 780000,
  14: 910000,
};

export function getXpForNextLevel(currentLevel: number): number {
  return XP_TABLE[currentLevel + 1] || 0;
}
