import { domainEconomy, domainIncomeFactor } from './domainEconomy'
import { itemResearchRate, calculateItemResearch } from './magicResearch'
import { abilityModifier } from './creationRules'

export function settleDomainMonth(d:any,input:any) {
  const families=d.peasantFamilies
  if(!families)throw new Error('Cadastre uma população maior que zero.')
  const roll=input.moraleDice.reduce((a:number,b:number)=>a+b,0)
  if(input.moraleDice.length!==2||input.moraleDice.some((n:number)=>!Number.isInteger(n)||n<1||n>6))throw new Error('Informe dois resultados de d6 para a moral.')
  const current=Math.max(-4,Math.min(4,d.peasantMorale))
  const sources=[
    {source:'Guarnição abaixo de 2 GP/família',value:Math.min(0,Math.floor(d.garrisonCost/families-2))},
    {source:'Liturgias (base 1 GP/família)',value:Math.floor(d.liturgiesCost/families-1)},
    {source:'Impostos (base 2 GP/família)',value:Math.floor(2-d.taxPerFamily)},
    {source:'Dízimo insuficiente',value:d.titheCost<families?-1:0},
    {source:'Administração do domínio',value:input.administered?1:0},
    {source:'Acontecimentos e outros ajustes do mestre',value:input.eventMorale},
  ]
  const adjusted=roll+sources.reduce((s,m)=>s+m.value,0)
  const change=roll===2?-2:roll===12?2:adjusted<=2?-2:adjusted<=5?-1:adjusted<=8?Math.sign(input.baseMorale-current):adjusted<=11?1:2
  const morale=Math.max(-4,Math.min(input.repressed?0:4,current+change))
  const capacity=({outlands:185,borderlands:375,civilized:780} as any)[input.classification]*input.hexes
  const naturalGrowth=current===-4?0:input.growth
  const population=Math.max(0,Math.min(capacity,families+naturalGrowth-input.losses+input.eventFamilies))
  const factor=domainIncomeFactor(current)
  const economy=domainEconomy(d),revenue=economy.gross*factor
  const balance=revenue+Number(d.eventModifier||0)-economy.expenses-input.tributeGp
  const treasury=Number(d.treasury)+balance
  if(treasury<0)throw new Error('O tesouro não cobre as despesas. Registre os pagamentos efetivos e as consequências dos atrasos antes de fechar o mês.')
  return {population,morale,sources,roll,adjusted,capacity,incomeFactor:factor,revenue,expenses:economy.expenses,tributeGp:input.tributeGp,balance,treasury,
    populationDice:Math.ceil(families/1000),moralePopulationDice:Math.abs(current)*Math.ceil(families/1000),
    overflow:Math.max(0,families+naturalGrowth-input.losses+input.eventFamilies-capacity)}
}

export function researchPlan(project:any,character:any,input:any) {
  if(project.effectType==='MANUAL')throw new Error('Escolha um efeito calculado no projeto antes de iniciar o acompanhamento.')
  if(project.status!=='QUEUED')throw new Error('O projeto precisa estar na fila, sem trabalho iniciado.')
  if(project.effectType==='AT_WILL'&&input.duration!=='concentration')throw new Error('Efeito à vontade exige duração de concentração.')
  if(project.effectType.startsWith('PERMANENT')&&(!input.affectsUser||input.duration==='instant'||input.duration==='concentration'||input.duration==='round'))throw new Error('Efeito permanente exige duração de ao menos um turno e deve afetar o usuário.')
  const durations:Record<string,string>={PERMANENT_DAY:'day',PERMANENT_HOUR:'hour',PERMANENT_THREE_TURNS:'turn',PERMANENT_TURN:'turn',PERMANENT_CASTER_LEVEL:'turn'}
  if(durations[project.effectType]&&durations[project.effectType]!==input.duration)throw new Error('A duração informada não corresponde ao multiplicador permanente do projeto.')
  if(input.esoteric&&project.effectType!=='ONE_USE')throw new Error('Itens ativados/permanentes com magia esotérica exigem experimentação, fora deste fluxo normal.')
  if(input.tradition==='arcane'&&input.healing)throw new Error('Conjuradores arcanos não criam itens com efeitos de cura.')
  if(!input.eligible)throw new Error('Confira a elegibilidade da classe para usar/criar o item.')
  if(project.effectType==='CHARGED'){
    const limits:Record<string,number[]>={wand:[10,20],rod:[6,12],staff:[15,30]}
    const bound=limits[input.itemKind]
    if(bound&&(project.effectCount<bound[0]!||project.effectCount>bound[1]!))throw new Error(`Cargas de ${input.itemKind}: ${bound[0]} a ${bound[1]}.`)
  }
  const rate=itemResearchRate(input.casterLevel)*(1+input.rateBonusPercent/100)*(input.dedication==='ancillary'?1/8:1)
    +input.assistants.reduce((sum:number,a:any)=>sum+itemResearchRate(a.casterLevel)*(1+a.rateBonusPercent/100)*(a.dedication==='ancillary'?1/8:1),0)
  const costs=calculateItemResearch({...project,researchRateGp:rate})
  const minimumLevel=project.effectType==='ONE_USE'?5:9
  if(input.casterLevel<minimumLevel||input.casterLevel>character.level)throw new Error(`Exige conjurador de nível ${minimumLevel} ou maior.`)
  const tier=project.effectType==='BONUS'?project.effectCount:project.spellLevel
  if((character.workshopValue||0)<4000+2000*(tier-1))throw new Error('Valor da oficina insuficiente.')
  if(!project.hasFormula&&!project.hasSample&&!project.knowsEffect)throw new Error('É necessário conhecer o efeito ou possuir fórmula/amostra.')
  return {...costs,researchRateGp:rate,materialsPaidGp:costs.materialCostGp}
}

export function researchOutcome(project:any,character:any,input:any) {
  const supplied=input.components.reduce((s:number,c:any)=>s+c.quantity*c.valueGp,0)
  if(supplied<project.componentCostGp)throw new Error('Componentes insuficientes para concluir o projeto.')
  const inappropriate=input.components.filter((c:any)=>!c.appropriate).reduce((s:number,c:any)=>s+c.quantity*c.valueGp,0)
  const effectLevel=project.effectType==='BONUS'?[0,1,3,6][project.effectCount]!:project.spellLevel
  const penalty=Math.ceil(effectLevel*Math.min(1,inappropriate/Math.max(1,project.componentCostGp)))
  const formula=project.hasFormula&&!inappropriate
  const base=[18,16,15,14,13,12,11,10,9,8,7,6,5,4,3][project.casterLevel]!
  const target=base+effectLevel+penalty
  const bonus=abilityModifier(character.int)+input.engineeringRank+input.otherBonus+(project.hasSample?4:0)
  if(!formula&&(!Number.isInteger(input.roll)||input.roll<1||input.roll>20))throw new Error('Informe o resultado de 1d20.')
  return {formula,penalty,target,bonus,roll:input.roll,success:formula||(input.roll>3&&input.roll+bonus>=target),consumedValueGp:supplied}
}
