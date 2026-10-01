export const ATTRIBUTE_KEYS = ['str', 'int', 'dex', 'wil', 'con', 'cha'] as const
export type AttributeKey = typeof ATTRIBUTE_KEYS[number]
export function abilityModifier(value: number) {
  return value <= 3 ? -3 : value <= 5 ? -2 : value <= 8 ? -1 : value <= 12 ? 0 : value <= 15 ? 1 : value <= 17 ? 2 : 3
}
const keys: Record<string, AttributeKey[]> = {
  Fighter: ['str'], Explorer: ['con'], Thief: ['dex'], Mage: ['int'], Crusader: ['wil'], Venturer: ['cha'],
  Assassin: ['str', 'dex'], Barbarian: ['str', 'con'], Bard: ['dex', 'cha'], Bladedancer: ['wil', 'dex'],
  Paladin: ['str', 'cha'], Priestess: ['wil', 'cha'], Shaman: ['wil', 'con'], Warlock: ['int', 'wil'], Witch: ['int', 'wil'],
  'Dwarven Craftpriest': ['wil'], 'Dwarven Vaultguard': ['str'], 'Elven Nightblade': ['dex', 'int'],
  'Elven Spellsword': ['str', 'int'], 'Nobiran Wonderworker': ['int', 'wil'], 'Zaharan Ruinguard': ['str', 'int'],
}
export function creationRules(name: string) {
  const keyAttributes = keys[name] ?? []
  const minimumAttributes: Partial<Record<AttributeKey, number>> = Object.fromEntries(keyAttributes.map(k => [k, 9]))
  if (name.startsWith('Dwarven ')) minimumAttributes.con = 9
  if (name === 'Nobiran Wonderworker') for (const k of ATTRIBUTE_KEYS) minimumAttributes[k] = 11
  if (name === 'Zaharan Ruinguard') { minimumAttributes.wil = 9; minimumAttributes.cha = 9 }
  const spellcaster = ['Mage', 'Crusader', 'Bladedancer', 'Priestess', 'Shaman', 'Warlock', 'Witch',
    'Dwarven Craftpriest', 'Elven Nightblade', 'Elven Spellsword', 'Nobiran Wonderworker', 'Zaharan Ruinguard'].includes(name)
  return { keyAttributes, minimumAttributes, spellcaster }
}

export function initialAdventuring(str: number, className = '') {
  const perceptive = className === 'Explorer' || /^(Dwarven|Elven) /.test(className)
  return [
    { name: 'Dungeonbashing', throwTarget: 18 - 4 * abilityModifier(str) },
    { name: 'Climbing', throwTarget: 8 }, { name: 'Searching', throwTarget: perceptive ? 14 : 18 },
    { name: 'Trapbreaking', throwTarget: 18 }, { name: 'Listening', throwTarget: perceptive ? 14 : 18 },
  ].map(p => ({ ...p, category: 'adventuring' }))
}
