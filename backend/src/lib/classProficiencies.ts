/** Full proficiency equivalents in the Revised Rulebook class descriptions, pp. 24–97.
 * These are implicit powers, not extra paid or persisted proficiency rows.
 * Restricted equivalents (e.g. Bladedancer's weapon-specific finesse) remain separate.
 */
type ProficiencyPower = { name: string; minimumLevel?: number; ranks?: number }
const equivalents: Record<string, ProficiencyPower[]> = {
  Fighter: [{ name: 'Manual of Arms' }],
  Explorer: [{ name: 'Alertness' }, { name: 'Ambushing' }, { name: 'Endurance' }],
  Thief: [{ name: 'Streetwise' }],
  Mage: [{ name: 'Collegiate Wizardry' }],
  Crusader: [{ name: 'Theology' }],
  Venturer: [{ name: 'Bribery' }, { name: 'Diplomacy' }, { name: 'Bargaining' }, { name: 'Language' }],
  Assassin: [{ name: 'Streetwise' }],
  Bard: [{ name: 'Arcane Dabbling' }, { name: 'Loremastery' }, { name: 'Language' }, { name: 'Performance' }],
  Bladedancer: [{ name: 'Theology' }],
  Paladin: [{ name: 'Manual of Arms' }, { name: 'Divine Health' }, { name: 'Sensing Evil' }, { name: 'Laying on Hands' }],
  Priestess: [{ name: 'Diplomacy' }, { name: 'Theology' }, { name: 'Divine Health' }, { name: 'Laying on Hands' }],
  Shaman: [{ name: 'Theology' }],
  Witch: [{ name: 'Theology' }],
  'Dwarven Craftpriest': [{ name: 'Theology' }],
  'Dwarven Vaultguard': [{ name: 'Manual of Arms' }],
  'Elven Nightblade': [{ name: 'Acrobatics' }, { name: 'Streetwise' }, { name: 'Quiet Magic', minimumLevel: 2 }],
  'Elven Spellsword': [{ name: 'Collegiate Wizardry' }],
  'Nobiran Wonderworker': [{ name: 'Collegiate Wizardry' }, { name: 'Divine Health' }, { name: 'Laying on Hands' }],
  'Zaharan Ruinguard': [{ name: 'Manual of Arms' }],
}
export function classProficiencyPowers(rules: { className?: string; abilityPowers?: ProficiencyPower[]; powers?: ProficiencyPower[] } = {}, level = 1) {
  return [...(equivalents[rules.className || ''] || []), ...(rules.abilityPowers || rules.powers || [])]
    .filter(power => (power.minimumLevel || 1) <= level)
}
