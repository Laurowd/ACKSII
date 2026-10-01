// Machine-readable class effects. Keep situational effects out of unconditional totals.
// Revised Rulebook: class descriptions, pp. 24–99.
export function ruleProfile(name: string) {
  const warrior = ['Fighter', 'Explorer', 'Assassin', 'Barbarian', 'Bard', 'Paladin', 'Dwarven Vaultguard', 'Elven Spellsword', 'Zaharan Ruinguard'].includes(name)
  const initiative = ['Explorer', 'Barbarian'].includes(name) ? 1 : 0
  return {
    initiative, initiativeSource: initiative ? 'Animal Reflexes' : '',
    alertness: name === 'Explorer',
    gracefulFighting: name === 'Bladedancer',
    perceptive: name === 'Explorer' || /^(Elven|Dwarven) /.test(name),
    damageProgression: warrior ? 'fighter' : 'none',
    cleaveProgression: warrior ? 'full' : ['Mage', 'Priestess', 'Witch', 'Warlock', 'Nobiran Wonderworker'].includes(name) ? 'none' : 'half',
  }
}
