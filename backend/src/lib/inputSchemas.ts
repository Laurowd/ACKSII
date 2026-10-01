import { Prisma } from '@prisma/client'

const excluded = new Set(['id', 'userId', 'characterId', 'campaignId', 'createdAt', 'updatedAt', 'version', 'rulesState', 'magicDetails'])
const nonnegative = /^(coin|xp|age$|hpMax$|armorWeight$|spellSlots|libraryValue$|workshopValue$|congregants$|researchTimeWeeks$|researchCostGp$|monthlyUpkeepGp$|range|encumbrance$|weight$|quantity$|daysToRest$|wage$|capacity$|treasureShare$|costGp$|remainingWeeks$|monthlyCostGp$|baseValueGp$)/

// Prisma's scalar metadata supplies types only; relation keys are never writable.
// Domain constraints below apply independently of database coercion.
export function scalarBody(modelName: string) {
  const model = Prisma.dmmf.datamodel.models.find(model => model.name === modelName)!
  const properties: Record<string, any> = {}
  for (const field of model.fields) {
    if (field.kind !== 'scalar' || excluded.has(field.name)) continue
    let schema: Record<string, any>
    if (field.type === 'String') schema = { type: 'string', maxLength: /notes|details|Features|spellbook|learnedSpells|researchQueue|magicResearch/i.test(field.name) ? 20000 : 1000 }
    else if (field.type === 'Boolean') schema = { type: 'boolean' }
    else if (field.type === 'Int' || field.type === 'Float') {
      schema = { type: field.type === 'Int' ? 'integer' : 'number', minimum: nonnegative.test(field.name) ? 0 : -2147483648, maximum: 2147483647 }
      if (['str', 'int', 'dex', 'wil', 'con', 'cha'].includes(field.name)) Object.assign(schema, { minimum: 1, maximum: 100 })
      if (['level', 'durationWeeks', 'distanceHexes', 'hp'].includes(field.name)) schema.minimum = 1
      if (['originMarketClass', 'destMarketClass', 'spellLevel'].includes(field.name)) Object.assign(schema, { minimum: 1, maximum: 6 })
    } else continue
    properties[field.name] = field.isRequired ? schema : { anyOf: [schema, { type: 'null' }] }
  }
  if (modelName === 'Character') {
    for (const key of ['spellbook', 'learnedSpells', 'researchQueue']) properties[key] = { anyOf: [properties[key], { type: 'array', maxItems: 1000, items: key === 'researchQueue' ? { type: 'object' } : { type: 'string', maxLength: 1000 } }] }
  }
  if (modelName === 'CharacterActivity') properties.status = { type: 'string', enum: ['QUEUED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] }
  if (modelName === 'MercantileVenture') properties.status = { type: 'string', enum: ['IN_TRANSIT', 'SOLD'] }
  if (modelName === 'Proficiency') properties.category = { type: 'string', enum: ['adventuring', 'class', 'general'] }
  return { type: 'object', additionalProperties: false, properties }
}

export const characterUpdateBody = {
  ...scalarBody('Character'), required: ['version'],
  properties: { ...scalarBody('Character').properties, version: { type: 'integer', minimum: 0, maximum: 2147483647 } },
}
export const characterCreateBody = {
  ...scalarBody('Character'),
  properties: { ...scalarBody('Character').properties, campaignId: { anyOf: [{ type: 'string', maxLength: 100 }, { type: 'null' }] } },
}
