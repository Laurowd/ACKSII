import {getClassFeats} from './classFeats'
import type {CatalogClass} from './catalog'
import { chosenClassPowers, selectionsFor } from '../../../backend/src/lib/classAbilities'

export function classDefinitionFeats(definition:CatalogClass|undefined, fallbackName:string, level:number, subclass='', catalog:CatalogClass[]=[], character?:any) {
  const inherited=definition?.baseClassKey ? catalog.find(c=>c.source==='catalog'&&c.id===definition.baseClassKey)?.name || '' : ''
  const rules=definition?.rules || definition?.ruleProfile
  const choices=character ? selectionsFor(character,rules) : {}; const tradition=choices.tradition || choices['dark-path'] || subclass
  const result=getClassFeats(definition?.source==='campaign' ? inherited : definition?.name || fallbackName,level,tradition)
  if(definition?.powers){result.powers=definition.powers.filter(p=>p.minimumLevel<=level);result.futurePowers=definition.powers.filter(p=>p.minimumLevel>level)}
  if(definition?.ruleProfile?.mortalWoundsBonus!==undefined)result.levelStats.push({sectionTitle:'Ferimentos mortais',stats:[{label:'Bônus da classe',value:`+${definition.ruleProfile.mortalWoundsBonus}`}]})
  if (character) for (const power of chosenClassPowers(definition?.rules || definition?.ruleProfile || {}, character)) {
    const source = getClassFeats('skill' in power ? 'Thief' : 'Venturer',level)
    const name = power.name.replace(/\s+I{2,3}$/, '')
    const reference = source.powers.find(candidate => candidate.name.startsWith(name) && (candidate.minimumLevel || 1) === power.minimumLevel)
    result.powers.push({...power,description:reference?.description || power.description})
    if ('skill' in power) {
      const target = source.levelStats.flatMap(section => section.stats).find(stat => stat.label === power.skill)?.value || '4+'
      result.levelStats.push({sectionTitle:'Jack of All Trades',stats:[{label:power.name,value:target}]})
    }
  }
  return result
}
