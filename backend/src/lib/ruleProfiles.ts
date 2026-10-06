// Machine-readable class effects. Keep situational effects out of unconditional totals.
// Revised Rulebook: class descriptions, pp. 24–99.
import { classChoiceDefinitions } from './classAbilities'
import { BARBARIAN_ORIGINS } from './creationRules'
export function ruleProfile(name: string) {
  const warrior = ['Fighter', 'Explorer', 'Assassin', 'Barbarian', 'Bard', 'Paladin', 'Dwarven Vaultguard', 'Elven Spellsword', 'Zaharan Ruinguard'].includes(name)
  const initiative = ['Explorer', 'Barbarian'].includes(name) ? 1 : 0
  return {
    className: name, classChoices: classChoiceDefinitions(name), proficiencyOrigins: name === 'Barbarian' ? BARBARIAN_ORIGINS : [],
    proficiencyBonus: name === 'Dwarven Craftpriest' ? 3 : 0,
    initiative, initiativeSource: initiative ? 'Animal Reflexes' : '',
    alertness: name === 'Explorer',
    gracefulFighting: name === 'Bladedancer',
    weaponFinesse: name === 'Bladedancer' ? 'bladedancer' : '',
    perceptive: name === 'Explorer' || /^(Elven|Dwarven) /.test(name),
    damageProgression: warrior ? 'fighter' : 'none',
    damageTrade: ['Paladin','Zaharan Ruinguard'].includes(name) ? 'missile' : 'none',
    ...(name === 'Zaharan Ruinguard' ? { damageWeapons: ['Battle Axe','Great Axe','Flail','Sword','Two-Handed Sword','Whip'] } : {}),
    cleaveProgression: warrior ? 'full' : ['Mage', 'Priestess', 'Witch', 'Warlock', 'Nobiran Wonderworker'].includes(name) ? 'none' : 'half',
  }
}
