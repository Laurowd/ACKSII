import { getModifier } from './mechanics'

/** Catalog profiles arrive from the API; custom classes opt into their own profile. */
export function classEffects(character: any, profile: any = {}) {
  const profs: any[] = character.proficiencies || []
  const level = character.level || 1
  const powers: any[] = (profile.powers || []).filter((p:any)=>p.minimumLevel<=level)
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
  return {
    initiative: sources.reduce((sum, effect) => sum + effect.value, 0), initiativeSources: sources,
    castingInitiative: sources.reduce((sum,e)=>sum+e.value,0)-combatOnly, conditional,
    avoidSurprise: (profile.alertness || has('Alertness') ? 1 : 0) + combatOnly,
    damageBonus: profile.damageProgression === 'fighter' ? 1 + Math.floor(level / 3) : 0,
    damageBonusFor(missile:boolean) {return profile.damageProgression==='fighter' && profile.damageTrade!=='both' && profile.damageTrade!==(missile?'missile':'melee') ? 1+Math.floor(level/3):0},
    cleaves: (profile.cleaveProgression === 'full' ? level : profile.cleaveProgression === 'half' ? Math.floor(level / 2) : 0) + (has('Combat Ferocity') ? 1 : 0),
    // Show recommendations alongside stored throws; old manual adjustments remain intact.
    adventuringTarget(name: string) {
      if (name === 'Dungeonbashing') return 18 - 4 * getModifier(character.str) + (profile.race==='halfling'?4:0)
      if (name === 'Climbing') return 8
      return profile.perceptive && ['Searching', 'Listening'].includes(name) ? 14 : 18
    },
  }
}
