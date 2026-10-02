export type PowerChoice = { name?: string; description?: string; kind?: 'power' | 'skill'; trade?: string; children?: PowerChoice[] }
export const POWER_TRADES = [
  { id: '1-2-12', from: 1, cost: 1, levels: [2,12] },
  { id: '1-3-11', from: 1, cost: 1, levels: [3,11] },
  { id: '1-4-10', from: 1, cost: 1, levels: [4,10] },
  { id: '1-5-9', from: 1, cost: 1, levels: [5,9] },
  { id: '1-6-8', from: 1, cost: 1, levels: [6,8] },
  { id: '1-7-7', from: 1, cost: 1, levels: [7,7] },
  { id: '2-3-5-7', from: 1, cost: 2, levels: [3,5,7] },
  { id: '2-2-4-9', from: 1, cost: 2, levels: [2,4,9] },
  { id: '2-5-5-5', from: 1, cost: 2, levels: [5,5,5] },
  ...[[7,9,13],[7,8,14],[8,10,13],[8,9,14],[9,10,14],[9,11,13],[9,12,12],[10,11,14],[10,12,13],[11,13,13],[11,12,14],[12,13,14]].map(([from,a,b]) => ({id:`advanced-${from}-${a}-${b}`,from:from!,cost:1,levels:[a!,b!]})),
]

export function resolvePowerChoice(choice: PowerChoice, level: number, maxLevel: number, skills: string[], depth = 0): {cost: number; powers: {name:string;description:string;minimumLevel:number;kind:'power'|'skill'}[]} {
  if (depth > 12) throw Error('A sequência de trocas é longa demais.')
  if (choice.trade) {
    const trade = POWER_TRADES.find(t => t.id === choice.trade && t.from === level)
    if (!trade || choice.children?.length !== trade.levels.length) throw Error('Troca de poderes incompatível com o nível ou quantidade de escolhas.')
    const children = choice.children.map((child,i) => resolvePowerChoice(child,trade.levels[i]!,maxLevel,skills,depth+1))
    if (children.some(child => child.cost !== 1)) throw Error('Cada benefício de uma troca deve ocupar uma única escolha.')
    return {cost:trade.cost,powers:children.flatMap(child => child.powers)}
  }
  if (level > maxLevel) throw Error(`Um poder desbloqueia no nível ${level}, acima do máximo ${maxLevel}.`)
  const name = choice.name?.trim()
  if (!name) throw Error('Informe o nome de cada poder ou habilidade.')
  const kind = choice.kind || 'power'
  if (kind === 'skill' && !skills.includes(name)) throw Error('Habilidade de ladrão inválida.')
  if(kind==='power'&&!choice.description?.trim())throw Error(`Informe a descrição do poder ${name}.`)
  return {cost:kind === 'skill' && name === 'Backstabbing' ? 2 : 1,powers:[{name,description:choice.description?.trim() || '',minimumLevel:level,kind}]}
}
