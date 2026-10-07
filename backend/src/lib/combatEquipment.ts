import { abilityProficiencies, chosenClassPowers } from './classAbilities'

const shieldClasses = new Set(['Fighter','Explorer','Crusader','Venturer','Assassin','Barbarian','Bard','Paladin','Shaman','Dwarven Craftpriest','Dwarven Vaultguard','Elven Spellsword','Zaharan Ruinguard'])
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')
/** Unknown free classes retain their manual reference; known classes use actual styles. */
export function shieldProficiency(character: any, definition?: any) {
  let construction:any={};try{construction=JSON.parse(definition?.creationRules || '{}')}catch{}
  const profile=definition?.ruleProfile || construction.ruleProfile || {}, rules=definition?.rules || {...profile,abilityPowers:profile.powers}
  const build=construction.build, styles=profile.fightingStyles || build?.fightingStyles
  const powers=[...abilityProficiencies(character,rules),...chosenClassPowers(rules,character),...(profile.powers || [])]
    .filter((power:any)=>(power.minimumLevel || 1)<=(character.level || 1))
  if(powers.some((power:any)=>['weaponandshield','fightingstyleweaponandshield'].includes(normalize(power.name || ''))))return true
  if(build) {
    const armor=build.fighting>=2 || build.fighting===1 && build.fightingVariant==='crusader' ? 4 : build.fighting===1 ? 2 : 0
    if(armor-Number(build.armorTrade || 0)<=0)return false
  }
  if(styles)return styles.some((style:string)=>normalize(style)==='weaponandshield')
  if(build || profile.optionalStyles!==undefined)return (profile.optionalStyles ?? (build.fighting>=2?3:build.fighting===1?2:1)-build.styleTrade)===3
  const name=profile.className || character.className || definition?.name
  if(shieldClasses.has(name))return true
  if(['Thief','Mage','Bladedancer','Priestess','Warlock','Witch','Elven Nightblade','Nobiran Wonderworker'].includes(name))return false
  return !definition?.rules && !definition?.ruleProfile
}

export type ArmorCategory = 'none'|'very-light'|'light'|'medium'|'heavy'|'unknown'
/** Category does not change with size, quality or magical weight reductions. */
export function armorCategory(character: any, configured?: string): ArmorCategory {
  if(configured && ['none','very-light','light','medium','heavy'].includes(configured))return configured as ArmorCategory
  const name=normalize(character.armorName || '')
  if(/plate|lamellar|placas|lamelar/.test(name))return 'heavy'
  if(/chain|ringmail|scale|linen|arenaarmorheavy|heavyarenaarmor|cota|escamas|linho|arenapesada/.test(name))return 'medium'
  if(/leather|arenaarmorlight|lightarenaarmor|couro|arenaleve/.test(name))return 'light'
  if(/padded|hide|fur|acolchoad|pele/.test(name))return 'very-light'
  if(!name && !Number(character.armorWeight) && !Number(character.armorAcBonus))return 'none'
  return 'unknown'
}
