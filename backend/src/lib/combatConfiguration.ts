export const combatConfigurationSchema = {
  type: 'object', additionalProperties: false, required: ['powersEnabled', 'lightArmor', 'modifiers'],
  properties: {
    powersEnabled: { type: 'boolean' }, lightArmor: { type: 'boolean' },
    armorCategory: {type:'string',enum:['auto','none','very-light','light','medium','heavy']},
    armorCategoryFor: {type:'string',maxLength:1000},
    modifiers: { type: 'array', maxItems: 30, items: {
      type: 'object', additionalProperties: false, required: ['source', 'stat', 'value', 'active'], properties: {
        source: { type: 'string', minLength: 1, maxLength: 160 }, stat: { type: 'string', enum: ['ac', 'initiative'] },
        value: { type: 'integer', minimum: -30, maximum: 30 }, active: { type: 'boolean' }, itemId: { type: 'string', maxLength: 100 },
      },
    } },
  },
} as const
export function validateCombatConfiguration(value: any) {
  if (!value || typeof value.powersEnabled !== 'boolean' || typeof value.lightArmor !== 'boolean' || !Array.isArray(value.modifiers) || value.modifiers.length > 30) throw new Error('Configuração de combate inválida.')
  if(value.armorCategory!==undefined && !['auto','none','very-light','light','medium','heavy'].includes(value.armorCategory))throw new Error('Categoria de armadura inválida.')
  if(value.armorCategoryFor!==undefined && (typeof value.armorCategoryFor!=='string' || value.armorCategoryFor.length>1000))throw new Error('Referência de armadura inválida.')
  const seen = new Set<string>()
  for (const entry of value.modifiers) {
    if (!entry || typeof entry.source !== 'string' || !entry.source.trim() || entry.source.length > 160 || !['ac', 'initiative'].includes(entry.stat) || !Number.isInteger(entry.value) || Math.abs(entry.value) > 30 || typeof entry.active !== 'boolean' || (entry.itemId !== undefined && (typeof entry.itemId !== 'string' || entry.itemId.length > 100))) throw new Error('Informe origem, valor inteiro entre -30 e 30 e atributo válido para cada modificador.')
    const key = `${entry.stat}:${entry.itemId || entry.source.trim().toLocaleLowerCase()}`
    if (seen.has(key)) throw new Error('Uma mesma origem não pode ser contada duas vezes para o mesmo atributo.')
    seen.add(key)
  }
  return value
}
