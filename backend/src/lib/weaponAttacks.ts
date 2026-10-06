// Revised Rulebook pp. 57, 121, 126: mode and size govern Weapon Finesse.
export type AttackWeapon = {name?:string;catalogId?:string;style?:string;rangeShort?:number;rangeMed?:number;rangeLong?:number;attackAbility?:string}
const key=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'')
const tiny=['Knife','Dagger','Silver Dagger','Club','Sap']
const small=['Hand Axe','Warhammer','Short Sword','Javelin','Cestus','Whip']
const medium=['Sword','Battle Axe','Flail','Mace','Spear','Net','Rock','Staff Sling','Staff']
const large=['Great Axe','Morning Star','Two-Handed Sword','Lance','Polearm']
const sizes=new Map([...tiny.map(name=>[key(name),'tiny']),...small.map(name=>[key(name),'small']),...medium.map(name=>[key(name),'medium']),...large.map(name=>[key(name),'large'])] as [string,string][])
const bladeWeapons=new Set(['Dagger','Silver Dagger','Short Sword','Sword','Two-Handed Sword','Lance','Javelin','Polearm','Spear'].map(key))
export function weaponIdentity(weapon:AttackWeapon) { return key(weapon.catalogId?.startsWith('w-') ? weapon.catalogId.slice(2) : weapon.name || '') }
export function isMissileAttack(weapon:AttackWeapon) {
  if(weapon.style==='Missile Weapon')return true
  if(['Single Weapon','Dual Weapon','Two-Handed Weapon','Weapon and Shield'].includes(weapon.style || ''))return false
  return [weapon.rangeShort,weapon.rangeMed,weapon.rangeLong].some(range=>Number(range || 0)>0)
}
export function canUseWeaponFinesse(weapon:AttackWeapon, ordinary:boolean, bladedancer=false) {
  if(isMissileAttack(weapon))return false
  const id=weaponIdentity(weapon)
  return (bladedancer && bladeWeapons.has(id)) || (ordinary && ['tiny','small','medium'].includes(sizes.get(id) || ''))
}
export function weaponAttackAttribute(weapon:AttackWeapon, strModifier:number, dexModifier:number, finesse=false):'str'|'dex' {
  if(isMissileAttack(weapon))return 'dex'
  if(!finesse || weapon.attackAbility==='str')return 'str'
  if(weapon.attackAbility==='dex')return 'dex'
  return dexModifier>strModifier?'dex':'str'
}
