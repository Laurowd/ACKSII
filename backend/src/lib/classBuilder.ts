import { DEFAULT_CLASSES } from '../utils/seedClasses'
import magicTables from '../data/customMagic.json'
import { GENERAL_PROFICIENCIES, SPELL_LIST, normalized } from './gameRules'
import { PowerChoice, resolvePowerChoice } from './classPowerPlan'
import { racialClassPowers } from './racialClassPowers'
import skillTables from '../data/customClassSkills.json'
import { skillDescription } from './classSkillDescriptions'

export type ClassBuild = {
  name:string; race:'human'|'dwarf'|'elf'|'halfling'|'nobiran'|'zaharan'; racial:number;
  hd:number; fighting:number; thievery:number; divine:number; arcane:number;
  fightingVariant:'crusader'|'thief'; armorTrade:number; weaponTrade:number; styleTrade:number;
  damageTrade:'none'|'melee'|'missile'|'both'; thiefSkills:string[]; powers:string[];
  startingProficiency:string; proficiencies:string[]; keyAttributes:string[]; stronghold:string; smoothXp:boolean;
  powerSelections?:PowerChoice[]; thiefSelections?:PowerChoice[]; halflingSkills?:string[];
  delayedArcane?:boolean; tradeRebuking?:boolean; codeOfBehavior?:string;
  startingDescription?:string; strongholdPower?:string; strongholdDescription?:string;
  fightingStyles?:string[]; weaponSelection?:string; titles?:string[];
  divineSpellList?:{name:string;level:number;tradition:'divine'}[];
}
export const raceCosts={human:[0],dwarf:[200,400,600,900,1250],elf:[125,750,1375,2000,2500],halfling:[-450,-375,-300,-225,-150],nobiran:[125,375,625,1125,2125],zaharan:[200,825,1450,2075,2700]}
const attr:Record<string,string[]>={Fighter:['str','con'],Thief:['dex','cha'],Crusader:['wil'],Mage:['int']}
export const THIEF_SKILLS=['Backstabbing','Climbing','Deciphering','Hiding','Listening','Lockpicking','Pickpocketing','Searching','Scrollreading','Shadowy Senses','Sneaking','Trapbreaking','Jack of All Trades']
export const HALFLING_SKILLS=['Hiding','Listening','Lockpicking','Searching','Sneaking','Trapbreaking','Natural Stealth','Evasion','Arcane Dabbling','Beast Friendship','Magical Music','Passing Without Trace','Precise Shooting','Running','Skirmishing','Swashbuckling','Placating']
export function buildClass(b:ClassBuild) {
  const fail=(message:string):never=>{throw Error(message)}
  if(!b.name.trim()||[b.armorTrade,b.weaponTrade,b.styleTrade].some(v=>!Number.isInteger(v)||v<0))fail('Nome e valores de trocas inválidos.')
  const core=b.hd+b.fighting+b.thievery+b.divine+b.arcane,total=core+b.racial
  if(!Object.prototype.hasOwnProperty.call(raceCosts,b.race)||[b.hd,b.fighting,b.thievery,b.divine,b.arcane,b.racial].some(v=>!Number.isInteger(v)||v<0||v>4))fail('Valores de construção inválidos.')
  if(core>4||total<4||total>8||(b.race==='human'&&(core!==4||b.racial!==0)))fail('Humanos usam 4 pontos. Classes raciais usam até 4 pontos básicos e de 4 a 8 no total.')
  if(b.race==='dwarf'&&b.arcane)fail('Classes anãs não podem comprar Arcane.')
  if(b.race==='nobiran'&&b.divine)fail('Nobiranos compram magia divina pelo valor racial.')
  if(b.race==='halfling'&&(b.arcane||b.fighting>2))fail('Halflings não podem comprar Arcane nem Fighting acima de 2.')
  const arcane=b.arcane+(['elf','zaharan'].includes(b.race)?b.racial:0),divine=b.race==='nobiran'?b.racial:b.divine
  if(b.delayedArcane&&(!arcane||arcane>3))fail('A magia arcana adiada exige valor arcano efetivo de 1 a 3.')
  if(b.tradeRebuking&&!divine)fail('A troca de afastar mortos-vivos exige magia divina.')
  if(divine&&!b.codeOfBehavior?.trim())fail('Registre o código de conduta exigido pela magia divina.')
  if(divine&&!b.divineSpellList)fail('Defina o repertório religioso desta classe antes de conferir a construção.')
  if(b.divineSpellList) {
    const limit=[0,5,10,12,15][divine]!
    if(!divine&&b.divineSpellList.length)fail('Esta classe não tem repertório divino.')
    if(new Set(b.divineSpellList.map(s=>`${s.level}:${normalized(s.name)}`)).size!==b.divineSpellList.length||b.divineSpellList.some(s=>!SPELL_LIST.some(entry=>entry.tradition==='divine'&&entry.level===s.level&&normalized(entry.name)===normalized(s.name))))fail('O repertório divino contém magias inválidas ou repetidas.')
    if(divine&&[1,2,3,4,5].some(level=>b.divineSpellList!.filter(s=>s.level===level).length!==limit))fail(`O repertório religioso precisa de ${limit} magias de cada nível, de 1 a 5.`)
  }
  const maxLevel=b.race==='human'?14:({4:13,5:12,6:11,7:10,8:8} as any)[total]+(b.race==='nobiran'?1:0)
  const categories=[{name:'Mage',value:b.arcane},{name:'Crusader',value:b.divine},{name:'Fighter',value:b.fighting},{name:'Thief',value:b.thievery}]
  const savingClass=[...categories].sort((a,z)=>z.value-a.value)[0]!.name
  for(const c of categories.filter(c=>c.name===savingClass||c.value>=2))if(!attr[c.name]!.some(a=>b.keyAttributes.includes(a)))fail(`Escolha um atributo-chave de ${c.name}: ${attr[c.name]!.join(' ou ')}.`)
  const originalArmor=b.fighting>=2||b.fighting===1&&b.fightingVariant==='crusader'?4:b.fighting===1?2:0
  const originalWeapons=b.fighting>=2?3:b.fighting===1?(b.fightingVariant==='thief'?2:1):0
  const styles=b.fighting>=2?3:b.fighting===1?2:1
  if(b.armorTrade>originalArmor||b.weaponTrade>originalWeapons||b.styleTrade>styles||b.fighting<2&&b.damageTrade!=='none')fail('Uma troca excede as capacidades de combate da classe.')
  const weaponCredits=[0,1,3,4][originalWeapons]!-[0,1,3,4][originalWeapons-b.weaponTrade]!
  const skillCost=b.thiefSkills.reduce((n,s)=>n+(s==='Backstabbing'?2:1),0)
  if(new Set(b.thiefSkills).size!==b.thiefSkills.length||b.thiefSkills.some(s=>!THIEF_SKILLS.includes(s))||skillCost>b.thievery*4)fail('Seleção de habilidades de ladrão inválida ou acima do orçamento.')
  const powerBudget=b.armorTrade+weaponCredits+b.styleTrade+(b.damageTrade==='both'?2:b.damageTrade==='none'?0:1)+b.thievery*4-skillCost+(b.tradeRebuking?divine:0)
  const customPlans=(b.powerSelections||[]).map(p=>resolvePowerChoice(p,1,maxLevel,THIEF_SKILLS))
  const thiefPlans=(b.thiefSelections||[]).map(p=>resolvePowerChoice(p,1,maxLevel,THIEF_SKILLS))
  if(customPlans.some(p=>p.powers.some(power=>power.kind==='skill')))fail('Habilidades de ladrão só podem usar escolhas de Thievery.')
  const thiefPlanCost=thiefPlans.reduce((n,p)=>n+p.cost,0)
  if(thiefPlanCost>b.thievery*4-skillCost)fail('As habilidades futuras excedem as escolhas de Thievery.')
  if(b.powers.length+customPlans.reduce((n,p)=>n+p.cost,0)+thiefPlanCost!==powerBudget)fail(`Atribua ${powerBudget} poderes iniciais às trocas e habilidades de ladrão convertidas.`)
  const halflingSkills=b.halflingSkills||[]
  if(halflingSkills.length!==(b.race==='halfling'?b.racial:0)||new Set(halflingSkills).size!==halflingSkills.length||halflingSkills.some(s=>!HALFLING_SKILLS.includes(s)))fail('Escolha uma habilidade halfling distinta por ponto racial.')
  const startingName=normalized(b.startingProficiency.split('(')[0]!)
  if(b.startingDescription!==undefined&&!b.startingDescription.trim())fail('Descreva o efeito da proficiência concedida como poder inicial.')
  if(!GENERAL_PROFICIENCIES.some(p=>normalized(p.split('(')[0]!)===startingName)) fail('Escolha uma proficiência geral como poder inicial gratuito.')
  if(new Set(b.proficiencies.map(normalized)).size!==b.proficiencies.length)fail('A lista de proficiências contém repetições.')
  const listSize=b.proficiencies.reduce((n,p)=>n+(/^(Art|Craft|Performance|Profession)\s*\(/.test(p)?0.5:1),0)
  if(listSize!==42-maxLevel)fail(`A lista deve somar ${42-maxLevel} proficiências; especializações de Art/Craft/Performance/Profession valem ½. Separe as outras opções em linhas individuais.`)
  const strongholds=[...(b.fighting?['Castle']:[]),...(b.thievery?['Hideout']:[]),...(divine>=2?['Fortified Church']:[]),...(divine>=3?['Cloister']:[]),...(arcane>=2?['Sanctum']:[]),...(b.race==='dwarf'?['Dwarven Vault']:[]),...(b.race==='elf'&&b.fighting>=2?['Elven Fastness']:[])]
  if(!strongholds.length)strongholds.push('None')
  if(!strongholds.includes(b.stronghold))fail('A fortaleza escolhida não está disponível para esta construção.')
  const xpSecond=500*b.hd+500*b.fighting+250*b.thievery+[0,250,500,1000,2000][b.divine]!+625*b.arcane+raceCosts[b.race][b.racial]!-(b.race==='elf'&&b.arcane?125:0)+(b.fighting>=2?250*weaponCredits:0)
  if(xpSecond<=0)fail('A construção precisa de um custo de XP positivo. Revise os valores básicos.')
  const raceIncrement=['human','halfling'].includes(b.race)?0:b.race==='dwarf'?(savingClass==='Fighter'?10000:30000):b.race==='nobiran'?40000:50000
  const increment=(savingClass==='Mage'?150000:savingClass==='Fighter'?120000:100000)+raceIncrement
  const sides=4+2*b.hd-(b.race==='halfling'?2:0)
  const base=DEFAULT_CLASSES.find(c=>c.name===savingClass)!,hitDie=`1d${sides}`
  const hpAfter9=(['Fighter','Thief'].includes(savingClass)?2:1)+(b.race==='dwarf'?1:0),firstBonus=['elf','nobiran'].includes(b.race)?1:0
  const xpPerLevel:number[]=[0]
  for(let level=2;level<=maxLevel;level++){let xp=level===2?xpSecond:level<=8?xpPerLevel[level-2]!*2:xpPerLevel[level-2]!+increment;if(level===7&&b.smoothXp)xp=Math.round(xp/5000)*5000;xpPerLevel.push(xp)}
  const getMagic=(kind:string,value:number,index:number)=>{
    if(!value)return {slots:[0,0,0,0,0,0],casterLevel:0}
    const r=(magicTables as any)[kind+Math.min(4,value)+(kind==='arcane'&&b.delayedArcane?'Delayed':'')][index]
    return {slots:r.slots.map((n:number)=>value>4?Math.round(n*(value===5?4/3:value===6?1.5:value===7?5/3:2)):n),casterLevel:r.casterLevel}
  }
  const savingThrows=base.savingThrows.slice(0,maxLevel).map(s=>Object.fromEntries(Object.entries(s).map(([key,value])=>[key,key==='level'?value:Number(value)-(b.race==='dwarf'?(key==='blast'?3:4):b.race==='nobiran'?2:['elf','halfling'].includes(b.race)&&['paralysis','spells'].includes(key)?1:0)])))
  const attackClass=b.fighting===2?'Fighter':b.fighting===1?'Thief':'Mage'
  const attackThrows=b.fighting<=2?DEFAULT_CLASSES.find(c=>c.name===attackClass)!.attackThrows.slice(0,maxLevel):Array.from({length:maxLevel},(_,i)=>10-Math.floor(i*(b.fighting===4?1.5:1)))
  const levels=xpPerLevel.map((xp,i)=>{const a=getMagic('arcane',arcane,i),d=getMagic('divine',divine,i),flat=firstBonus+Math.max(0,i-8)*hpAfter9;return {level:i+1,xp,hitDice:`${Math.min(i+1,9)}d${sides}${flat?'+'+flat:''}`,casterLevel:Math.max(a.casterLevel,d.casterLevel),arcaneCasterLevel:a.casterLevel,divineCasterLevel:d.casterLevel,spellSlots:arcane&&divine?[...a.slots,...d.slots]:arcane?a.slots:d.slots}})
  const minimumAttributes:Record<string,number>=Object.fromEntries(b.keyAttributes.map(a=>[a,9]))
  if(b.race==='dwarf')minimumAttributes.con=9
  if(b.race==='elf')minimumAttributes.int=9
  if(b.race==='halfling')minimumAttributes.dex=9
  if(b.race==='zaharan')for(const a of ['int','wil','cha'])minimumAttributes[a]=9
  if(b.race==='nobiran')for(const a of ['str','int','dex','wil','con','cha'])minimumAttributes[a]=11
  const powers=[{name:b.startingProficiency,description:b.startingDescription||'Proficiência geral concedida pela classe; não consome uma escolha do personagem.',minimumLevel:1,kind:'power'},
    ...b.powers.map(name=>({name,description:'Poder definido pelo mestre.',minimumLevel:1,kind:'power'})),...customPlans.flatMap(p=>p.powers),...thiefPlans.flatMap(p=>p.powers),
    ...b.thiefSkills.map(name=>({name,description:skillDescription(name),minimumLevel:1,kind:'skill'})),
    ...halflingSkills.map(name=>({name,description:skillDescription(name),minimumLevel:1,kind:THIEF_SKILLS.includes(name)?'skill':'power'})),...racialClassPowers(b.race)]
  if(divine&&!b.tradeRebuking)powers.push({name:'Rebuking Undead',description:'Afastar mortos-vivos conforme o nível de conjuração divina. Mortos-vivos afetados e resultado dependem do teste da tabela do Rulebook, p. 37.',minimumLevel:1,kind:'power'})
  if(b.fighting>=1&&(b.stronghold==='Castle'||['Dwarven Vault','Elven Fastness'].includes(b.stronghold)&&!arcane&&!divine))powers.push({name:b.strongholdPower||'Battlefield Prowess',description:b.strongholdDescription||'Benefício de moral da fortaleza. O mestre define o poder aplicável à classe (Judge’s Journal, p. 298).',minimumLevel:5,kind:'power'})
  if(b.stronghold==='Fortified Church')powers.push({name:'Fortified Church',description:'Ao estabelecer a fortaleza: metade do custo; seguidores associados recebem +4 de lealdade e moral.',minimumLevel:1,kind:'power'})
  const constructLevel=b.race==='dwarf'?levels.find(row=>row.divineCasterLevel>=9)?.level:undefined
  if(constructLevel)powers.push({name:'Dwarven Constructs',description:'Pode criar construtos como um crusader de nível 11 ao alcançar conjuração divina de nível 9.',minimumLevel:constructLevel,kind:'power'})
  const placating=powers.find(p=>p.name==='Placating')
  if(placating)placating.description='Pode tentar apaziguar oponentes enquanto não ataca e se move até metade da velocidade. Não funciona se algum halfling do grupo já atacou no encontro. Quem tentar atacá-lo faz um salvamento contra Spells: falha obriga a atacar outra criatura naquele turno. Efeitos de área ainda o atingem; criaturas sem mente ou fantásticas de inteligência animal são imunes.'
  const allSkills=powers.filter(p=>p.kind==='skill')
  for(const skill of allSkills)if(!skill.description||skill.description.startsWith('Habilidade racial halfling'))skill.description=skillDescription(skill.name)
  if(new Set(allSkills.map(s=>s.name)).size!==allSkills.length)fail('Uma habilidade de ladrão não pode ser escolhida duas vezes.')
  const skillNames=['Climbing','Hiding','Listening','Lockpicking','Pickpocketing','Searching','Sneaking','Trapbreaking']
  const thiefSkills=levels.map((row,i)=>Object.fromEntries(allSkills.filter(s=>s.minimumLevel<=row.level&&skillNames.includes(s.name)).map(s=>{
    let bonus=b.race==='dwarf'?b.racial:0
    if(b.race==='dwarf')bonus+=s.name==='Searching'?4:s.name==='Listening'?2:0
    if(b.race==='elf')bonus+=s.name==='Searching'?2:s.name==='Listening'?4:0
    return [s.name,Number(skillTables.thief[i]![skillNames.indexOf(s.name)]!.replace('+',''))-bonus]
  })))
  const undeadNames=['skeleton','zombie','ghoul','wight','wraith','mummy','spectre','vampire','incarnation']
  const rebukingUndead=divine&&!b.tradeRebuking?levels.map(row=>Object.fromEntries(undeadNames.map((name,i)=>[name,row.divineCasterLevel?skillTables.rebuking[Math.min(14,row.divineCasterLevel)-1]![i]:'-']))):[]
  if(b.fightingStyles&&(b.fightingStyles.length!==styles-b.styleTrade||new Set(b.fightingStyles).size!==b.fightingStyles.length||b.fightingStyles.some(s=>!['Dual Weapon','Two-Handed Weapon','Weapon and Shield'].includes(s))||originalArmor-b.armorTrade===0&&b.fightingStyles.includes('Weapon and Shield')))fail('Selecione os estilos opcionais disponíveis; classes sem armadura não usam escudo.')
  if(b.titles&&(b.titles.length!==maxLevel||b.titles.some(t=>!t.trim())))fail('Informe um título por nível da classe.')
  const profile={initiative:0,alertness:false,perceptive:['elf','dwarf'].includes(b.race),race:b.race,racialValue:b.racial,proficiencyBonus:b.race==='dwarf'?b.racial:0,fightingStyles:b.fightingStyles,optionalStyles:styles-b.styleTrade,mortalWoundsBonus:2*b.hd,powers,damageProgression:b.fighting>=2&&b.damageTrade!=='both'?'fighter':'none',damageTrade:b.damageTrade,cleaveProgression:b.fighting>=2?'full':b.fighting===1?'half':'none'}
  const rules={page:290,proficiencies:b.proficiencies,bonusGeneral:b.race==='dwarf'?b.racial:0,proficiencyPeriod:savingClass==='Mage'?6:savingClass==='Fighter'?3:4,magic:arcane&&divine?'dual':arcane?'arcane':divine?'divine':'none',levels,...(b.divineSpellList?{divineSpellList:b.divineSpellList}:{})}
  const construction={keyAttributes:b.keyAttributes,minimumAttributes,spellcaster:!!(arcane||divine),build:b,ruleProfile:profile,rules,powers}
  return {name:b.name.trim(),hitDie,conBonus:true,xpPerLevel,titles:b.titles||levels.map(l=>`${b.name.trim()} ${l.level}`),attackThrows,savingThrows,thiefSkills,rebukingUndead,creationRules:construction,
    summary:{savingClass,maxLevel,xpSecond,xpAfter8:increment,powerBudget,listSize,armor:['None','Very Light','Light','Medium','Heavy'][originalArmor-b.armorTrade],weapons:['Restricted','Narrow','Broad','Unrestricted'][originalWeapons-b.weaponTrade],optionalStyles:styles-b.styleTrade,mortalWoundsBonus:2*b.hd,strongholds,thiefSkills:b.thiefSkills}}
}
