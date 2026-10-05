export interface CombatModifier { source: string; stat: 'ac' | 'initiative'; value: number; active: boolean; itemId?: string }
export interface CombatConfiguration { powersEnabled: boolean; lightArmor: boolean; modifiers: CombatModifier[] }
export function combatConfiguration(character: any): CombatConfiguration {
  try {
    const state = typeof character.rulesState === 'string' ? JSON.parse(character.rulesState) : character.rulesState
    const value = state?.combat
    if (value && Array.isArray(value.modifiers)) return structuredClone(value)
  } catch { /* Preserve older sheets with manual adjustments. */ }
  return { powersEnabled: false, lightArmor: false, modifiers: [] }
}
export function activeCombatModifiers(character: any) {
  const seen = new Set<string>()
  return combatConfiguration(character).modifiers.filter(entry => {
    const key = `${entry.stat}:${entry.itemId || entry.source.trim().toLocaleLowerCase()}`
    if (!entry.active || seen.has(key) || !Number.isInteger(entry.value) || Math.abs(entry.value) > 30) return false
    if (entry.itemId) {
      const item = character.items?.find((i: any) => i.id === entry.itemId)
      try { if (!item || !JSON.parse(item.magicDetails || '{}').identified || ['mount', 'vehicle', 'stashed'].includes(item.slot)) return false } catch { return false }
    }
    seen.add(key); return true
  })
}
