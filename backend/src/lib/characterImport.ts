import { Prisma } from '@prisma/client';
import { scalarBody } from './inputSchemas';
import { abilityModifier } from './creationRules';

export const importedRelations = {
  weapons: 'Weapon', proficiencies: 'Proficiency', items: 'Item', spells: 'Spell', rituals: 'Ritual',
  magicFormulae: 'MagicFormula', henchmen: 'Henchman', scars: 'Scar', activities: 'CharacterActivity',
  armyUnits: 'ArmyUnit', magicItemResearch: 'MagicItemResearch', mercantileVentures: 'MercantileVenture',
} as const;

const jsonValue = { anyOf: [{ type: 'string', maxLength: 20000 }, { type: 'object', maxProperties: 100 }] };
const slots = ['backpack', 'worn', 'belt', 'pouch', 'hand_right', 'hand_left', 'head', 'sack', 'hidden', 'mount', 'vehicle', 'stashed'];

function importScalarBody(modelName: string) {
  const schema = scalarBody(modelName);
  const model = Prisma.dmmf.datamodel.models.find(model => model.name === modelName)!;
  const required = model.fields.filter(field => field.kind === 'scalar' && field.isRequired && !field.hasDefaultValue && schema.properties[field.name]).map(field => field.name);
  if (modelName === 'Item') {
    schema.properties.quantity = { type: 'integer', minimum: 1, maximum: 1000000 };
    schema.properties.slot = { type: 'string', enum: slots };
    schema.properties.magicDetails = jsonValue;
  }
  if (modelName === 'Spell') {
    schema.properties.level = { type: 'integer', minimum: 1, maximum: 6 };
    schema.properties.tradition = { type: 'string', enum: ['', 'arcane', 'divine'] };
  }
  return { ...schema, ...(required.length ? { required } : {}) };
}

const characterSchema = importScalarBody('Character');
export const characterImportBody = {
  type: 'object', additionalProperties: false, required: ['document'],
  properties: {
    campaignId: { anyOf: [{ type: 'string', minLength: 1, maxLength: 100 }, { type: 'null' }] },
    document: {
      type: 'object', additionalProperties: false, required: ['format', 'version', 'character'],
      properties: {
        format: { const: 'acks-ii-character' }, version: { const: 1 },
        exportedAt: { type: 'string', maxLength: 100 },
        classDefinition: { anyOf: [{ type: 'object', maxProperties: 100 }, { type: 'null' }] },
        computed: { type: 'object', maxProperties: 100 },
        character: {
          ...characterSchema, required: ['characterName'],
          properties: {
            ...characterSchema.properties,
            characterName: { type: 'string', minLength: 1, maxLength: 1000 },
            // Older exports included the revision; it never belongs to the new sheet.
            version: { type: 'integer', minimum: 0, maximum: 2147483647 },
            rulesState: jsonValue,
            ...Object.fromEntries(Object.entries(importedRelations).map(([name, model]) => [name, { type: 'array', maxItems: 500, items: importScalarBody(model) }])),
            domain: { anyOf: [importScalarBody('Domain'), { type: 'null' }] },
          },
        },
      },
    },
  },
};

export class CharacterImportError extends Error {}

/** Fastify otherwise strips additional fields; portable imports reject them. */
export function assertCharacterImportFields(body: unknown) {
  const check = (value: unknown, properties: Record<string, any>, label: string) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    for (const key of Object.keys(value)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) throw new CharacterImportError(`${label}: campo não permitido (${key}).`);
    }
  };
  check(body, characterImportBody.properties, 'Importação');
  const document = (body as any)?.document;
  check(document, characterImportBody.properties.document.properties, 'Documento');
  const character = document?.character;
  check(character, characterImportBody.properties.document.properties.character.properties, 'Ficha');
  if (!character || typeof character !== 'object') return;
  for (const [key, model] of Object.entries(importedRelations)) {
    if (Array.isArray(character[key])) {
      for (const entry of character[key]) check(entry, importScalarBody(model).properties, key);
    }
  }
  check(character.domain, importScalarBody('Domain').properties, 'Domínio');
}

function jsonObject(value: unknown, label: string): Record<string, any> {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); }
    catch { throw new CharacterImportError(`${label}: JSON inválido.`); }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || JSON.stringify(parsed).length > 20000) {
    throw new CharacterImportError(`${label}: informe um objeto JSON com até 20.000 caracteres.`);
  }
  return parsed as Record<string, any>;
}

function restoredRulesState(value: unknown, warnings: string[]) {
  if (value === undefined) return '{}';
  const state = jsonObject(value, 'Estado de regras');
  const restored: Record<string, any> = {};
  if (state.used !== undefined) {
    const used = jsonObject(state.used, 'Usos de magia');
    for (const [key, amount] of Object.entries(used)) {
      if (!/^(arcane|divine):[1-6]$/.test(key) || !Number.isInteger(amount) || amount < 0 || amount > 2147483647) {
        throw new CharacterImportError('Os usos de magia devem indicar tradição, nível e uma quantidade inteira não negativa.');
      }
    }
    restored.used = used;
  }
  if (state.lastRestDay !== undefined) {
    if (state.lastRestDay !== null && (!Number.isInteger(state.lastRestDay) || state.lastRestDay < 0 || state.lastRestDay > 2147483647)) {
      throw new CharacterImportError('O dia do último descanso deve ser um inteiro não negativo.');
    }
    restored.lastRestDay = state.lastRestDay;
  }
  if (Object.keys(state).some(key => !['used', 'lastRestDay'].includes(key))) {
    warnings.push('O histórico de aventuras, meses e projetos não foi importado; seus registros dependem dos identificadores da ficha original. Saldos e XP atuais foram preservados, sem reaplicar operações.');
  }
  return JSON.stringify(restored);
}

export function prepareCharacterImport(source: Record<string, any>) {
  const warnings: string[] = [];
  const { version: _version, rulesState, domain, ...fields } = source;
  const relations: Record<string, any> = {};
  for (const key of Object.keys(importedRelations)) {
    const values = fields[key] || [];
    delete fields[key];
    if (values.length) relations[key] = { create: values.map((entry: Record<string, any>) => {
      const values = { ...entry };
      if (key === 'items' && values.magicDetails !== undefined) {
        const details = jsonObject(values.magicDetails, 'Dados do item mágico');
        if (details.charges != null && (!Number.isInteger(details.charges) || details.charges < 0 || details.charges > 1000000)) {
          throw new CharacterImportError('As cargas do item mágico devem ser um inteiro entre zero e 1.000.000.');
        }
        if (details.charges != null && (values.quantity ?? 1) !== 1) {
          throw new CharacterImportError('Um item com cargas deve estar em uma entrada com quantidade um.');
        }
        delete details.researchId;
        values.magicDetails = JSON.stringify(details);
      }
      return values;
    }) };
  }
  if (!fields.characterName.trim()) throw new CharacterImportError('Informe o nome do personagem.');
  fields.characterName = fields.characterName.trim();
  for (const key of ['spellbook', 'learnedSpells', 'researchQueue']) {
    if (Array.isArray(fields[key])) fields[key] = JSON.stringify(fields[key]);
  }
  const modifier = abilityModifier(fields.dex ?? 10), adjustment = fields.acAdjustment ?? 0, armor = fields.armorAcBonus ?? 0;
  Object.assign(fields, { acNoArmor: modifier + adjustment, acNoShield: armor + modifier + adjustment, acWithShield: armor + modifier + adjustment + 1 });
  if (source.rulesState !== undefined) {
    const state = jsonObject(source.rulesState, 'Estado de regras');
    if (state.research && typeof state.research === 'object' && Object.keys(state.research).length && (source.magicItemResearch || []).some((project: any) => ['IN_PROGRESS', 'READY'].includes(project.status))) {
      warnings.push('Projetos acompanhados em andamento foram preservados como registros manuais, com seu estado e prazo atuais. Acompanhe a continuação com o mestre; materiais já pagos não foram cobrados novamente.');
    }
  }
  const normalizedFields: Record<string, any> = { ...fields, rulesState: restoredRulesState(rulesState, warnings) };
  return {
    fields: normalizedFields,
    relations: { ...relations, ...(domain ? { domain: { create: domain } } : {}) },
    warnings,
  };
}
