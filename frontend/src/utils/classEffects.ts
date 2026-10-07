import { getModifier } from './mechanics'
import { abilityProficiencies, selectionsFor, chosenClassPowers, nameKey } from '../../../backend/src/lib/classAbilities'
import { adventuringBonus } from '../../../backend/src/lib/proficiencyBonus'
import { canUseWeaponFinesse, isMissileAttack, weaponAttackAttribute, type AttackWeapon } from '../../../backend/src/lib/weaponAttacks'

/** Catalog profiles arrive from the API; custom classes opt into their own profile. */
export function classEffects(character: any, profile: any = {}) {
  const profs: any[] = abilityProficiencies(character, profile)
  const level = character.level || 1
  const powers: any[] = [...(profile.powers || []).filter((p:any)=>p.minimumLevel<=level), ...chosenClassPowers(profile, character)]
  const has = (name: string) => [...profs,...powers].some(p => p.name.trim().toLowerCase() === name.toLowerCase())
  const sources = [{ source: 'DEX', value: getModifier(character.dex) }]
  if (profile.initiative) sources.push({ source: profile.initiativeSource, value: profile.initiative })
  const animalReflexes=!profile.initiative&&has('Animal Reflexes')?1:0
  if(animalReflexes)sources.push({source:'Animal Reflexes',value:1})
  if (has('Combat Reflexes')) sources.push({ source: 'Combat Reflexes', value: 1 })
  const combatOnly = (profile.initiative || 0) + animalReflexes + (has('Combat Reflexes') ? 1 : 0)
  const conditional = []
  if (profile.gracefulFighting || has('Graceful Fighting')) conditional.push(`Graceful Fighting: +1 iniciativa e +${1+Math.floor((level-1)/6)} CA com armadura leve ou menor e carga até 5 st.`)
  if (has('Swashbuckling')) conditional.push(`Swashbuckling: +${1+Math.floor((level-1)/6)} CA com armadura leve ou menor e carga até 5 st; com Graceful Fighting e armadura, este bônus é limitado a +1.`)
  const finesseFor = (weapon:AttackWeapon) => canUseWeaponFinesse(weapon,has('Weapon Finesse'),profile.weaponFinesse==='bladedancer')
  const damageBonusFor = (missile:boolean, weapon?:AttackWeapon) => {
    if (profile.damageProgression !== 'fighter' || profile.damageTrade === 'both' || profile.damageTrade === (missile ? 'missile' : 'melee')) return 0
    if (profile.className === 'Barbarian' && selectionsFor(character,profile)['damage-specialization'] !== (missile ? 'missile' : 'melee')) return 0
    if (profile.damageWeapons && (!weapon || !profile.damageWeapons.some((name:string) => nameKey(name) === nameKey(weapon.name || '') || nameKey(`w-${name}`) === nameKey(weapon.catalogId || '')))) return 0
    return 1 + Math.floor(level / 3)
  }
  return {
    initiative: sources.reduce((sum, effect) => sum + effect.value, 0), initiativeSources: sources,
    castingInitiative: sources.reduce((sum,e)=>sum+e.value,0)-combatOnly, conditional,
    avoidSurprise: (profile.alertness || has('Alertness') ? 1 : 0) + combatOnly,
    damageBonus: profile.damageProgression === 'fighter' ? 1 + Math.floor(level / 3) : 0,
    damageBonusFor, finesseFor,
    attackAttributeFor: (weapon:AttackWeapon) => weaponAttackAttribute(weapon,getModifier(character.str),getModifier(character.dex),finesseFor(weapon)),
    weaponDamageBonusFor: (weapon:AttackWeapon) => damageBonusFor(isMissileAttack(weapon),weapon),
    cleaves: (profile.cleaveProgression === 'full' ? level : profile.cleaveProgression === 'half' ? Math.floor(level / 2) : 0) + (has('Combat Ferocity') ? 1 : 0),
    // Show recommendations alongside stored throws; old manual adjustments remain intact.
    adventuringTarget(name: string) {
      const bonus = adventuringBonus(name,profile)
      if (name === 'Dungeonbashing') return 18 - 4 * getModifier(character.str) + (profile.race==='halfling'?4:0) - bonus
      if (name === 'Climbing') return 8 - bonus
      return (profile.perceptive && ['Searching', 'Listening'].includes(name) ? 14 : 18) - bonus
    },
  }
}
