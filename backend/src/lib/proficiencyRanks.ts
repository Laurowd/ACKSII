// Revised Rulebook pp. 101–121. A proficiency is single-rank unless its text permits more.
type RankEntry = {name:string;ranks?:number;category?:string;conditional?:boolean;permitsExtraRank?:boolean}
const key=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'')
export const proficiencyBase = (name:string) => name.split('(')[0]!.trim()
const repeatable = new Set([
  'Alchemy','Animal Husbandry','Animal Training','Art','Craft','Bargaining','Caving','Disguise','Engineering',
  'Healing','Knowledge','Language','Laying on Hands','Magical Engineering','Magical Music','Mapping',
  'Military Strategy','Mimicry','Navigation','Performance','Precise Shooting','Profession','Seafaring','Theology','Tracking',
].map(key))
const specializations = new Set(['Art','Craft','Combat Trickery','Elementalism','Fighting Style','Fighting Style Specialization','Folkways','Knowledge','Labor','Martial Training','Performance','Profession','Weapon Focus'].map(key))
export function proficiencyRankKey(name:string) {
  return specializations.has(key(proficiencyBase(name))) ? key(name) : key(proficiencyBase(name))
}
export function proficiencyRankCount(name:string, choices:RankEntry[], grants:RankEntry[]=[]) {
  const id=proficiencyRankKey(name)
  return [...choices.filter(p=>!['adventuring','natural'].includes(p.category || '')), ...grants.filter(g=>!g.conditional)]
    .filter(p=>proficiencyRankKey(p.name)===id).reduce((sum,p)=>sum+(p.ranks || 1),0)
}
export function proficiencyRankIssues(choices:RankEntry[], grants:RankEntry[]=[], powers:RankEntry[]=[]) {
  const entries=[...choices.filter(p=>!['adventuring','natural'].includes(p.category || '')), ...grants.filter(g=>!g.conditional), ...powers]
  const groups=new Map<string,RankEntry[]>()
  for(const entry of entries) { const id=proficiencyRankKey(entry.name);groups.set(id,[...(groups.get(id)||[]),entry]) }
  const issues:string[]=[]
  for(const group of groups.values()) {
    const name=group[0]!.name, base=key(proficiencyBase(name)), count=group.reduce((sum,p)=>sum+(p.ranks || 1),0)
    if(count>1 && !repeatable.has(base) && !group.some(p=>p.permitsExtraRank)) issues.push(`A proficiência ${name} não pode ser repetida; sua descrição não permite outra graduação nessa escolha.`)
    if(base==='militarystrategy' && count>3) issues.push('Military Strategy permite no máximo três graduações (Rulebook p. 115).')
  }
  return issues
}
/** Initial target for a newly learned rank; existing edited targets are retained. */
export function newProficiencyTarget(name:string, rank=1, level=1, bonus=0) {
  const base=key(proficiencyBase(name))
  let target=11
  if(base==='climbing') target=7-level
  else if(base==='loremastery') target=19-level
  else if(['art','craft'].includes(base)) target=[11,7,3,2][Math.min(3,Math.max(0,rank-1))]!
  else if(base==='disguise') target=11-2*(rank-1)
  else if(['alchemy','animalhusbandry','caving','healing','knowledge','magicalengineering','mapping','militarystrategy','mimicry','performance','profession','theology','tracking'].includes(base)) target=11-4*(rank-1)
  return target-bonus
}
