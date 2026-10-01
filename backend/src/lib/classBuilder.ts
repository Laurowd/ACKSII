import { DEFAULT_CLASSES } from '../utils/seedClasses'
import magicTables from '../data/customMagic.json'
import { GENERAL_PROFICIENCIES, normalized } from './gameRules'

export type ClassBuild = {
  name:string; race:'human'|'dwarf'|'elf'|'nobiran'|'zaharan'; racial:number;
  hd:number; fighting:number; thievery:number; divine:number; arcane:number;
  fightingVariant:'crusader'|'thief'; armorTrade:number; weaponTrade:number; styleTrade:number;
  damageTrade:'none'|'melee'|'missile'|'both'; thiefSkills:string[]; powers:string[];
  startingProficiency:string; proficiencies:string[]; keyAttributes:string[]; stronghold:string; smoothXp:boolean;
}
const raceCosts={human:[0],dwarf:[200,400,600,900,1250],elf:[125,750,1375,2000,2500],nobiran:[125,375,625,1125,2125],zaharan:[200,825,1450,2075,2700]}
const attr:Record<string,string[]>={Fighter:['str','con'],Thief:['dex','cha'],Crusader:['wil'],Mage:['int']}
export const THIEF_SKILLS=['Backstabbing','Climbing','Deciphering','Hiding','Listening','Lockpicking','Pickpocketing','Searching','Scrollreading','Shadowy Senses','Sneaking','Trapbreaking','Jack of All Trades']
export function buildClass(b:ClassBuild) {
  const fail=(message:string):never=>{throw Error(message)}
  const core=b.hd+b.fighting+b.thievery+b.divine+b.arcane,total=core+b.racial
  if(!Object.prototype.hasOwnProperty.call(raceCosts,b.race)||[b.hd,b.fighting,b.thievery,b.divine,b.arcane,b.racial].some(v=>!Number.isInteger(v)||v<0||v>4))fail('Valores de construção inválidos.')
  if(core>4||total<4||total>8||(b.race==='human'&&(core!==4||b.racial!==0)))fail('Humanos usam 4 pontos. Classes raciais usam até 4 pontos básicos e de 4 a 8 no total.')
  if(b.race==='dwarf'&&b.arcane)fail('Classes anãs não podem comprar Arcane.')
  if(b.race==='nobiran'&&b.divine)fail('Nobiranos compram magia divina pelo valor racial.')
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
  const powerBudget=b.armorTrade+weaponCredits+b.styleTrade+(b.damageTrade==='both'?2:b.damageTrade==='none'?0:1)+b.thievery*4-skillCost
  if(b.powers.length!==powerBudget)fail(`Atribua ${powerBudget} poderes iniciais às trocas e habilidades de ladrão convertidas.`)
  const startingName=normalized(b.startingProficiency.split('(')[0]!)
  if(!GENERAL_PROFICIENCIES.some(p=>normalized(p.split('(')[0]!)===startingName)) fail('Escolha uma proficiência geral como poder inicial gratuito.')
  if(new Set(b.proficiencies.map(normalized)).size!==b.proficiencies.length)fail('A lista de proficiências contém repetições.')
  const listSize=b.proficiencies.reduce((n,p)=>n+(/^(Art|Craft|Performance|Profession)\s*\(/.test(p)?0.5:1),0)
  if(listSize!==42-maxLevel)fail(`A lista deve somar ${42-maxLevel} proficiências; especializações de Art/Craft/Performance/Profession valem ½. Separe as outras opções em linhas individuais.`)
  const arcane=b.arcane+(['elf','zaharan'].includes(b.race)?b.racial:0),divine=b.race==='nobiran'?b.racial:b.divine
  const strongholds=[...(b.fighting?['Castle']:[]),...(b.thievery?['Hideout']:[]),...(divine>=2?['Fortified Church']:[]),...(divine>=3?['Cloister']:[]),...(arcane>=2?['Sanctum']:[]),...(b.race==='dwarf'?['Dwarven Vault']:[]),...(b.race==='elf'&&b.fighting>=2?['Elven Fastness']:[])]
  if(!strongholds.includes(b.stronghold))fail('A fortaleza escolhida não está disponível para esta construção.')
  const xpSecond=500*b.hd+500*b.fighting+250*b.thievery+[0,250,500,1000,2000][b.divine]!+625*b.arcane+raceCosts[b.race][b.racial]!-(b.race==='elf'&&b.arcane?125:0)+(b.fighting>=2?250*weaponCredits:0)
  const raceIncrement=b.race==='human'?0:b.race==='dwarf'?(savingClass==='Fighter'?10000:30000):b.race==='nobiran'?40000:50000
  const increment=(savingClass==='Mage'?150000:savingClass==='Fighter'?120000:100000)+raceIncrement
  const base=DEFAULT_CLASSES.find(c=>c.name===savingClass)!,hitDie=`1d${4+2*b.hd}`
  const hpAfter9=(['Fighter','Thief'].includes(savingClass)?2:1)+(b.race==='dwarf'?1:0),firstBonus=['elf','nobiran'].includes(b.race)?1:0
  const xpPerLevel:number[]=[0]
  for(let level=2;level<=maxLevel;level++){let xp=level===2?xpSecond:level<=8?xpPerLevel[level-2]!*2:xpPerLevel[level-2]!+increment;if(level===7&&b.smoothXp)xp=Math.round(xp/5000)*5000;xpPerLevel.push(xp)}
  const getMagic=(kind:string,value:number,index:number)=>{
    if(!value)return {slots:[0,0,0,0,0,0],casterLevel:0}
    const r=(magicTables as any)[kind+Math.min(4,value)][index]
    return {slots:r.slots.map((n:number)=>value>4?Math.round(n*(value===5?4/3:value===6?1.5:value===7?5/3:2)):n),casterLevel:r.casterLevel}
  }
  const savingThrows=base.savingThrows.slice(0,maxLevel).map(s=>Object.fromEntries(Object.entries(s).map(([key,value])=>[key,key==='level'?value:Number(value)-(b.race==='dwarf'?(key==='blast'?3:4):b.race==='nobiran'?2:b.race==='elf'&&['paralysis','spells'].includes(key)?1:0)])))
  const attackClass=b.fighting===2?'Fighter':b.fighting===1?'Thief':'Mage'
  const attackThrows=b.fighting<=2?DEFAULT_CLASSES.find(c=>c.name===attackClass)!.attackThrows.slice(0,maxLevel):Array.from({length:maxLevel},(_,i)=>10-Math.floor(i*(b.fighting===4?1.5:1)))
  const levels=xpPerLevel.map((xp,i)=>{const a=getMagic('arcane',arcane,i),d=getMagic('divine',divine,i),flat=firstBonus+Math.max(0,i-8)*hpAfter9;return {level:i+1,xp,hitDice:`${Math.min(i+1,9)}d${4+2*b.hd}${flat?'+'+flat:''}`,casterLevel:Math.max(a.casterLevel,d.casterLevel),arcaneCasterLevel:a.casterLevel,divineCasterLevel:d.casterLevel,spellSlots:arcane&&divine?[...a.slots,...d.slots]:arcane?a.slots:d.slots}})
  const minimumAttributes:Record<string,number>=Object.fromEntries(b.keyAttributes.map(a=>[a,9]))
  if(b.race==='dwarf')minimumAttributes.con=9
  if(b.race==='elf')minimumAttributes.int=9
  if(b.race==='zaharan')for(const a of ['int','wil','cha'])minimumAttributes[a]=9
  if(b.race==='nobiran')for(const a of ['str','int','dex','wil','con','cha'])minimumAttributes[a]=11
  const profile={initiative:0,alertness:false,damageProgression:b.fighting>=2&&b.damageTrade!=='both'?'fighter':'none',damageTrade:b.damageTrade,cleaveProgression:b.fighting>=2?'full':b.fighting===1?'half':'none'}
  const rules={page:290,proficiencies:b.proficiencies,bonusGeneral:b.race==='dwarf'?b.racial:0,proficiencyPeriod:savingClass==='Mage'?6:savingClass==='Fighter'?3:4,magic:arcane&&divine?'dual':arcane?'arcane':divine?'divine':'none',levels}
  const construction={keyAttributes:b.keyAttributes,minimumAttributes,spellcaster:!!(arcane||divine),build:b,ruleProfile:profile,rules}
  return {name:b.name.trim(),hitDie,conBonus:true,xpPerLevel,titles:levels.map(l=>`${b.name.trim()} ${l.level}`),attackThrows,savingThrows,creationRules:construction,
    summary:{savingClass,maxLevel,xpSecond,xpAfter8:increment,powerBudget,listSize,armor:['None','Very Light','Light','Medium','Heavy'][originalArmor-b.armorTrade],weapons:['Restricted','Narrow','Broad','Unrestricted'][originalWeapons-b.weaponTrade],optionalStyles:styles-b.styleTrade,mortalWoundsBonus:2*b.hd,strongholds,thiefSkills:b.thiefSkills}}
}
