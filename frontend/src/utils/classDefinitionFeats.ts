import {getClassFeats} from './classFeats'
import type {CatalogClass} from './catalog'

export function classDefinitionFeats(definition:CatalogClass|undefined, fallbackName:string, level:number, subclass='', catalog:CatalogClass[]=[]) {
  const inherited=definition?.baseClassKey ? catalog.find(c=>c.source==='catalog'&&c.id===definition.baseClassKey)?.name || '' : ''
  const result=getClassFeats(definition?.source==='campaign' ? inherited : definition?.name || fallbackName,level,subclass)
  if(definition?.powers){result.powers=definition.powers.filter(p=>p.minimumLevel<=level);result.futurePowers=definition.powers.filter(p=>p.minimumLevel>level)}
  if(definition?.ruleProfile?.mortalWoundsBonus!==undefined)result.levelStats.push({sectionTitle:'Ferimentos mortais',stats:[{label:'Bônus da classe',value:`+${definition.ruleProfile.mortalWoundsBonus}`}]})
  return result
}
