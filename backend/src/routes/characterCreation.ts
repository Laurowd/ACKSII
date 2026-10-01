import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { canReadCampaign, resolveClass, progressionFields } from '../lib/classCatalog'
import { creationRules, initialAdventuring, abilityModifier, ATTRIBUTE_KEYS } from '../lib/creationRules'
import { rulesFor, proficiencyIssues, spellIssues, magicPools } from '../lib/gameRules'
import { findCompendiumEntry } from './compendium'
import { defaultWeaponStyle } from '../lib/equipment'

const attribute = { type: 'integer', minimum: 3, maximum: 18 }
const text = { type: 'string', maxLength: 200 }
const body = {
  type: 'object', additionalProperties: false,
  required: ['characterName', 'classKey', 'str', 'int', 'dex', 'wil', 'con', 'cha', 'hpMax'],
  properties: {
    rulesMode: { type: 'string', enum: ['standard','manual'] }, exceptionReason: { type: 'string', maxLength: 1000 },
    startingGoldGp: { type:'integer', minimum:30, maximum:180 },
    purchases: { type:'array', maxItems:100, items:{type:'object',additionalProperties:false,required:['entryId','quantity'],properties:{entryId:text,quantity:{type:'integer',minimum:1,maximum:100}}} },
    spells: { type:'array', maxItems:100, items:{type:'object',additionalProperties:false,required:['name','level','tradition'],properties:{name:text,level:{type:'integer',minimum:1,maximum:6},tradition:{type:'string',enum:['arcane','divine']}}} },
    characterName: { ...text, minLength: 1 }, classKey: { ...text, minLength: 1 },
    campaignId: { anyOf: [text, { type: 'null' }] },
    str: attribute, int: attribute, dex: attribute, wil: attribute, con: attribute, cha: attribute,
    birthplace: text, alignment: { type: 'string', enum: ['', 'Lawful', 'Neutral', 'Chaotic'] },
    subclass: text, languagesKnown: { type: 'string', maxLength: 2000 },
    notes: { type: 'string', maxLength: 10000 }, isSpellcaster: { type: 'boolean' },
    hpMax: { type: 'integer', minimum: 1, maximum: 1000 }, coinGP: { type: 'integer', minimum: 0, maximum: 2147483647 },
    proficiencies: { type: 'array', maxItems: 50, items: {
      type: 'object', additionalProperties: false, required: ['name', 'category'],
      properties: { name: { ...text, minLength: 1 }, category: { type: 'string', enum: ['adventuring', 'class', 'general'] } },
    } },
    items: { type: 'array', maxItems: 100, items: {
      type: 'object', additionalProperties: false, required: ['name', 'quantity', 'weight'],
      properties: { name: { ...text, minLength: 1 }, quantity: { type: 'integer', minimum: 1, maximum: 10000 }, weight: { type: 'number', minimum: 0, maximum: 10000 } },
    } },
  },
}

interface CreationBody {
  rulesMode?: 'standard'|'manual'; exceptionReason?: string; startingGoldGp?: number;
  purchases?: {entryId:string;quantity:number}[]; spells?:{name:string;level:number;tradition:string}[];
  characterName: string; classKey: string; campaignId?: string | null;
  str: number; int: number; dex: number; wil: number; con: number; cha: number;
  hpMax: number; coinGP?: number; birthplace?: string; alignment?: string; subclass?: string;
  languagesKnown?: string; notes?: string; isSpellcaster?: boolean;
  proficiencies?: { name: string; category: string }[];
  items?: { name: string; quantity: number; weight: number }[];
}

export async function characterCreationRoutes(app: FastifyInstance) {
  app.post('/guided', { preHandler: [authGuard], schema: { body } }, async (request, reply) => {
    const data = request.body as CreationBody
    const userId = (request.user as { id: string }).id
    const campaignId = data.campaignId || null
    if (campaignId && !(await canReadCampaign(campaignId, userId))) return reply.code(403).send({ message: 'Você precisa participar desta campanha.' })
    const klass = await resolveClass(data.classKey, campaignId)
    if (!klass) return reply.code(400).send({ message: 'Escolha uma classe disponível nesta campanha.' })
    const official = klass.id.startsWith('catalog:')
    const rules = official ? creationRules(klass.name) : JSON.parse((klass as any).creationRules || '{}')
    {
      rules.minimumAttributes ??= {}
      for (const key of rules.keyAttributes ?? []) rules.minimumAttributes[key] = Math.max(9, rules.minimumAttributes[key] ?? 3)
      const missing = ATTRIBUTE_KEYS.filter(k => data[k] < (rules.minimumAttributes[k] ?? 3))
      if (missing.length) return reply.code(400).send({ message: `Requisitos da classe: ${missing.map(k => `${k.toUpperCase()} ≥ ${rules.minimumAttributes[k]}`).join(', ')}.` })
    }
    if (official || rulesFor(klass)) {
      const con = klass.conBonus ? abilityModifier(data.con) : 0
      const racial = Number(rulesFor(klass)?.levels[0]?.hitDice.match(/\+(\d+)/)?.[1] || 0)
      const max = Number(klass.hitDie.slice(2)) + con + racial
      if (data.rulesMode !== 'manual' && (data.hpMax < Math.max(1, 4 + con) + racial || data.hpMax > max)) return reply.code(400).send({ message: `PV iniciais devem estar entre ${Math.max(1, 4 + con) + racial} e ${max} para esta classe (regra padrão).` })
    }
    if (!data.characterName.trim() || data.items?.some(i => !i.name.trim()) || data.proficiencies?.some(p => !p.name.trim())) return reply.code(400).send({ message: 'Preencha os nomes do personagem e das escolhas adicionadas.' })
    const { classKey, items, proficiencies, rulesMode, exceptionReason, startingGoldGp, purchases, spells, ...fields } = data
    const ruleData = rulesFor(klass)
    if (rulesMode === 'standard') {
      if (!ruleData) return reply.code(400).send({message:'Classe livre: selecione o modo manual e registre a decisão do mestre.'})
      const issues = [...proficiencyIssues(ruleData,data,proficiencies || []),...spellIssues(ruleData,data,spells || [])]
      for (const category of ['class','general']) if (!proficiencies?.some(p=>p.category===category)) issues.push(`Escolha ao menos uma proficiência ${category}.`)
      for (const pool of magicPools(ruleData,data)) if (pool.studious && pool.slots[0] && !spells?.some(s=>s.tradition===pool.tradition && s.level===1)) issues.push(`Escolha sua primeira magia ${pool.tradition}.`)
      if (issues.length) return reply.code(400).send({message:issues.join(' ')})
    }
    if (rulesMode === 'manual' && !exceptionReason?.trim()) return reply.code(400).send({message:'Registre a decisão do mestre para as escolhas manuais.'})
    const purchasedItems: any[] = [], purchasedWeapons: any[] = []
    let coins: any = {}
    if (purchases?.length && startingGoldGp === undefined) return reply.code(400).send({message:'Informe o orçamento inicial.'})
    if (startingGoldGp !== undefined) {
      if (startingGoldGp % 10) return reply.code(400).send({message:'O orçamento de 3d6 × 10 deve ser múltiplo de 10.'})
      let copper = startingGoldGp * 100
      for (const purchase of purchases || []) {
        const entry = findCompendiumEntry(purchase.entryId)
        if (!entry || !['weapon','item'].includes(entry.type) || entry.costGp == null) return reply.code(400).send({message:'Equipamento inválido.'})
        copper -= Math.round(entry.costGp * 100) * purchase.quantity
        if (entry.type === 'weapon') for(let n=0;n<purchase.quantity;n++) purchasedWeapons.push({name:entry.name,catalogId:entry.id,automaticDamage:true,damage:entry.damage,style:defaultWeaponStyle(entry.id),encumbrance:entry.encumbrance,rangeShort:entry.rangeShort||0,rangeMed:entry.rangeMed||0,rangeLong:entry.rangeLong||0,attackThrow:JSON.parse(klass.attackThrows)[0]})
        else purchasedItems.push({name:entry.name,quantity:purchase.quantity,weight:entry.encumbrance||0,notes:entry.notes||''})
      }
      if (copper < 0) return reply.code(400).send({message:'As compras excedem o ouro inicial.'})
      coins={coinGP:Math.floor(copper/100),coinSP:Math.floor(copper%100/10),coinCP:copper%10}
    }
    // Nested create commits the sheet and all initial choices together.
    const character = await prisma.character.create({ data: {
      ...fields, ...coins, userId, campaignId, characterName: data.characterName.trim(),
      rulesState: JSON.stringify({creationMode:rulesMode||'legacy',exceptionReason:exceptionReason||''}),
      classKey: klass.id, className: klass.name, classFeatures: klass.classFeatures,
      isSpellcaster: rules.spellcaster ?? data.isSpellcaster ?? false,
      level: 1, xp: 0, hpCurr: data.hpMax, ...progressionFields(klass, 1, data.wil),
      ...(ruleData ? Object.fromEntries(Array.from({length:6},(_,i)=>[`spellSlotsLevel${i+1}`,magicPools(ruleData,data).reduce((sum,p)=>sum+p.slots[i]!,0)])) : {}),
      items: { create: [...(items ?? []).map(i => ({ name: i.name.trim(), quantity: i.quantity, weight: i.weight })),...purchasedItems] },
      weapons:{create:purchasedWeapons}, spells:{create:spells||[]},
      proficiencies: { create: [...initialAdventuring(data.str, official ? klass.name : ''), ...(proficiencies ?? []).filter(p => p.category !== 'adventuring').map(p => ({ name: p.name.trim(), category: p.category }))] },
    } })
    return reply.code(201).send({ character })
  })
}
