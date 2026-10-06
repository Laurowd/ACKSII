import { selectionsFor, type ClassAbilityRules } from './classAbilities'
export const SPELL_TYPES = [
  {key:'bst',label:'Explosão'}, {key:'dth',label:'Morte'}, {key:'det',label:'Detecção'}, {key:'elm',label:'Elemental'},
  {key:'enc',label:'Encantamento'}, {key:'eso',label:'Esotérica'}, {key:'hea',label:'Cura'}, {key:'ill',label:'Ilusão'},
  {key:'mov',label:'Movimento'}, {key:'nec',label:'Necromancia'}, {key:'pro',label:'Proteção'}, {key:'sum',label:'Invocação e conjuração'},
  {key:'trn',label:'Transmogrificação'}, {key:'wal',label:'Parede'},
]
export function warlockPath(rules:ClassAbilityRules, character:any) {
  if(rules.className!=='Warlock')return ''
  const value=selectionsFor(character,rules)['dark-path']
  return ['Demonology','Necromancy','Transmogrification'].includes(value || '')?value!:''
}
export function restrictedRepertoire(rules:ClassAbilityRules, character:any, level=character.level || 1) {
  const path=warlockPath(rules,character)
  if(!path || level<7)return undefined
  return {path,extra:1,types:path==='Demonology'?['sum']:path==='Necromancy'?['dth','nec']:['trn']}
}
export function restrictedRepertoireIssues(pool:any, choices:any[], catalog:any[]) {
  if(!pool.restricted)return []
  const issues:string[]=[]
  for(let i=0;i<6;i++) {
    if(!pool.slots[i])continue
    const atLevel=choices.filter(spell=>spell.level===i+1 && (spell.tradition===pool.tradition || (!spell.tradition && pool.tradition==='arcane')))
    const base=(pool.repertoire[i] || 0)-pool.restricted.extra, excess=Math.max(0,atLevel.length-base)
    const eligible=atLevel.filter(spell=>{
      const entry=catalog.find(candidate=>candidate.level===spell.level && candidate.tradition===pool.tradition && candidate.name.toLowerCase().replace(/[^a-z0-9]/g,'')===spell.name.toLowerCase().replace(/[^a-z0-9]/g,''))
      return entry?.types?.some((type:string)=>pool.restricted.types.includes(type))
    }).length
    if(excess>eligible)issues.push(`A vaga extra de ${pool.restricted.path} no nível ${i+1} exige ${pool.restricted.types.map((type:string)=>SPELL_TYPES.find(entry=>entry.key===type)?.label).join(' ou ')}. Confira o tipo da magia com o mestre.`)
  }
  return issues
}
