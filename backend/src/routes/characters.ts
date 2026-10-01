import { Prisma } from '@prisma/client';
import { scalarBody, characterUpdateBody, characterCreateBody } from '../lib/inputSchemas';
import { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import prisma from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { rateLimitByIp } from '../lib/rateLimit';
import { resolveClass, progressionFields } from '../lib/classCatalog';
import { findCompendiumEntry } from './compendium';
import { domainEconomy } from '../lib/domainEconomy';
import { researchData } from '../lib/magicResearch';
import { readState } from '../lib/gameRules';
import { defaultWeaponStyle } from '../lib/equipment';
import { abilityModifier } from '../lib/creationRules';
import { weaponCatalogValues } from '../lib/equipment';

function parseJsonSafe<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function applyClassProgression(characterId: string, db: Prisma.TransactionClient = prisma) {
  const character = await db.character.findUnique({ where: { id: characterId } });
  if (!character || !character.className) return character;
  if (character.campaignId) {
    const campaign = await db.campaign.findUnique({ where: { id: character.campaignId } });
    if (parseJsonSafe<Record<string, boolean>>(campaign?.optionalRules, {}).enableClassAutoProgression === false) return character;
  }
  const klass = await resolveClass(character.classKey || '', character.campaignId, character.className);
  if (!klass) return character;

  const level = Math.max(1, Number(character.level) || 1);
  const attackThrows = parseJsonSafe<number[]>(klass.attackThrows, []);
  const attackThrow = attackThrows[level - 1];
  const { saveDeath, saveParalysis, saveBlast, saveImplements, saveSpells, ...identity } = progressionFields(klass, level);

  const updated = await db.character.update({
    where: { id: characterId },
    data: {
      ...identity,
      classKey: klass.id, className: klass.name,
    }
  });

  if (attackThrow !== undefined) await db.weapon.updateMany({
    where: { characterId },
    data: { attackThrow }
  });

  return updated;
}

export async function characterRoutes(app: FastifyInstance) {
  const assignmentRateLimit = rateLimitByIp(40, 60_000, 'character-assignment');
  const assignmentBodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      campaignId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      userId: { type: 'string', minLength: 1 },
    },
  } as const;

  const treasureConversionBodySchema = {
    type: 'object',
    additionalProperties: false,
    required: ['awardId'],
    properties: {
      awardId: { type: 'string', minLength: 1, maxLength: 120 },
      source: { type: 'string', maxLength: 240 },
      gp: { type: 'integer', minimum: 0, maximum: 2147483647 },
      sp: { type: 'integer', minimum: 0, maximum: 2147483647 },
      cp: { type: 'integer', minimum: 0, maximum: 2147483647 },
    },
  } as const;

  const inventorySlots = [
    'backpack', 'worn', 'belt', 'pouch', 'hand_right', 'hand_left', 'head',
    'sack', 'hidden', 'mount', 'vehicle', 'stashed',
  ] as const;
  const itemProperties = {
    name: { type: 'string', minLength: 1, maxLength: 160 },
    quantity: { type: 'integer', minimum: 1, maximum: 1000000 },
    weight: { type: 'number', minimum: 0, maximum: 1000000 },
    slot: { type: 'string', enum: inventorySlots },
    notes: { type: 'string', maxLength: 4000 },
  } as const;
  const itemCreateBodySchema = {
    type: 'object', additionalProperties: false, required: ['name'], properties: itemProperties,
  } as const;
  const itemUpdateBodySchema = {
    type: 'object', additionalProperties: false, minProperties: 1, properties: itemProperties,
  } as const;
  const proficiencyUpdateBodySchema = {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 160 },
      throwTarget: { type: 'integer', minimum: -100, maximum: 100 },
      category: { type: 'string', enum: ['adventuring', 'class', 'general'] },
    },
  } as const;
  const purchaseBodySchema = {
    type: 'object',
    additionalProperties: false,
    required: ['entryId'],
    properties: { entryId: { type: 'string', minLength: 1, maxLength: 120 } },
  } as const;
  const domainBodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      strongholdName: { type: 'string', maxLength: 200 },
      peasantFamilies: { type: 'integer', minimum: 0, maximum: 2147483647 },
      revenuePerFamily: { type: 'number', minimum: 0, maximum: 1000000000 },
      taxRate: { type: 'number', minimum: 0, maximum: 100 },
      servicePerFamily: { type: 'number', minimum: 0, maximum: 1000000 },
      taxPerFamily: { type: 'number', minimum: 0, maximum: 1000000 },
      liturgiesCost: { type: 'number', minimum: 0, maximum: 1000000000000 },
      titheCost: { type: 'number', minimum: 0, maximum: 1000000000000 },
      landRevenue: { type: 'number', minimum: 0, maximum: 1000000000000 },
      garrisonCost: { type: 'number', minimum: 0, maximum: 1000000000000 },
      civilExpenses: { type: 'number', minimum: 0, maximum: 1000000000000 },
      constructionCosts: { type: 'number', minimum: 0, maximum: 1000000000000 },
      mercenaryPayroll: { type: 'number', minimum: 0, maximum: 1000000000000 },
      specialistPayroll: { type: 'number', minimum: 0, maximum: 1000000000000 },
      maintenanceCost: { type: 'number', minimum: 0, maximum: 1000000000000 },
      peasantMorale: { type: 'integer', minimum: -1000, maximum: 1000 },
      stability: { type: 'integer', minimum: -1000, maximum: 1000 },
      loyalty: { type: 'integer', minimum: -1000, maximum: 1000 },
      monthlyEvent: { type: 'string', maxLength: 4000 },
      eventModifier: { type: 'number', minimum: -1000000000000, maximum: 1000000000000 },
      treasury: { type: 'number', minimum: 0, maximum: 1000000000000 },
      consolidatedBalance: { type: 'number', minimum: -1000000000000, maximum: 1000000000000 },
      mercantileVentures: { type: 'string', maxLength: 20000 },
    },
  } as const;

  async function canAccessCharacter(
    character: { userId: string; campaignId: string | null },
    userId: string,
    role: string,
  ) {
    if (character.userId === userId) return true;
    if (role !== 'MASTER' || !character.campaignId) return false;

    const campaign = await prisma.campaign.findUnique({
      where: { id: character.campaignId },
      select: { masterId: true },
    });
    return campaign?.masterId === userId;
  }

  async function ensureCharacterAccess(characterId: string, userId: string, role: string) {
    const character = await prisma.character.findUnique({ where: { id: characterId } })
    if (!character) return { error: 'not_found' as const, character: null }
    if (!(await canAccessCharacter(character, userId, role))) {
      return { error: 'forbidden' as const, character: null }
    }
    return { error: null, character }
  }

  // List characters (MASTER sees own + campaigns they master, PLAYER sees own)
  app.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    const { id, role } = request.user as any;
    const where = role === 'MASTER' 
      ? {
          OR: [
            { userId: id },
            { campaign: { masterId: id } }
          ]
        } 
      : { 
          userId: id,
          OR: [
            { campaignId: null },
            { campaign: { members: { some: { userId: id, status: 'ACCEPTED' } } } }
          ]
        };
    const characters = await prisma.character.findMany({
      where,
      include: { user: { select: { username: true } }, weapons: true, proficiencies: true, items: true, spells: true, rituals: true, magicFormulae: true, henchmen: true, domain: true, scars: true, activities: true, armyUnits: true, magicItemResearch: true, mercantileVentures: true },
      orderBy: { updatedAt: 'desc' }
    });
    return reply.send({ characters });
  });

  // Get single character
  app.get('/:characterId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: { user: { select: { username: true } }, weapons: true, proficiencies: true, items: true, spells: true, rituals: true, magicFormulae: true, henchmen: true, domain: true, scars: true, activities: true, armyUnits: true, magicItemResearch: true, mercantileVentures: true }
    });

    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return reply.send({ character });
  });

  // Create character
  app.post('/', { preHandler: [authGuard], schema: { body: characterCreateBody } }, async (request, reply) => {
    const { id: userId, role } = request.user as any;
    const data = request.body as any;

    const requestedCampaignId = typeof data.campaignId === 'string' ? data.campaignId : null;
    if (requestedCampaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: requestedCampaignId },
        select: { masterId: true },
      });
      if (!campaign) return reply.status(404).send({ error: 'Campaign not found' });

      const isCampaignMaster = role === 'MASTER' && campaign.masterId === userId;
      if (!isCampaignMaster) {
        const membership = await prisma.campaignMember.findUnique({
          where: { campaignId_userId: { campaignId: requestedCampaignId, userId } },
        });
        if (!membership || membership.status !== 'ACCEPTED') {
          return reply.status(403).send({ error: 'You must be an accepted member of the campaign' });
        }
      }
    }

    const character = await prisma.character.create({
      data: {
        userId,
        campaignId: requestedCampaignId,
        chroniclesOf: data.chroniclesOf || '',
        characterName: data.characterName || '',
        birthplace: data.birthplace || '',
        className: data.className || '',
        subclass: data.subclass || '',
        title: data.title || '',
        alignment: data.alignment || '',
        age: data.age || 0,
        size: data.size || 'Medium',
        gender: data.gender || '',
        level: data.level || 1,
        xp: data.xp || 0,
        xpNext: data.xpNext || 0,
        hpMax: data.hpMax || 0,
        hpCurr: data.hpCurr || 0,
        hitDice: data.hitDice || '',
        str: data.str || 10,
        int: data.int || 10,
        dex: data.dex || 10,
        wil: data.wil || 10,
        con: data.con || 10,
        cha: data.cha || 10,
        acNoArmor: data.acNoArmor || 0,
        acNoShield: data.acNoShield || 0,
        acWithShield: data.acWithShield || 0,
        saveDeath: data.saveDeath || 14,
        saveImplements: data.saveImplements || 14,
        saveParalysis: data.saveParalysis || 14,
        saveBlast: data.saveBlast || 14,
        saveSpells: data.saveSpells || 14,
        moveExploration: data.moveExploration || 120,
        moveCombat: data.moveCombat || 40,
        moveCharge: data.moveCharge || 120,
        moveExpedition: data.moveExpedition || 24,
        moveStealth: data.moveStealth || 40,
        initiative: data.initiative || 0,
        surprise: data.surprise || 0,
        surpriseOthers: data.surpriseOthers ?? undefined,
        avoidSurprise: data.avoidSurprise ?? undefined,
        healingRate: data.healingRate || 0,
        mortalWounds: data.mortalWounds || 0,
        cleaves: data.cleaves || 0,
        notes: data.notes || '',
        classFeatures: data.classFeatures || '',
        languagesKnown: data.languagesKnown || '',
        coinPP: data.coinPP ?? 0,
        coinEP: data.coinEP ?? 0,
        coinGP: data.coinGP ?? 0,
        coinSP: data.coinSP ?? 0,
        coinCP: data.coinCP ?? 0,
        gemsJewelry: data.gemsJewelry || '',
        isSpellcaster: data.isSpellcaster === true,
        spellSlotsLevel1: data.spellSlotsLevel1 ?? 0,
        spellSlotsLevel2: data.spellSlotsLevel2 ?? 0,
        spellSlotsLevel3: data.spellSlotsLevel3 ?? 0,
        spellSlotsLevel4: data.spellSlotsLevel4 ?? 0,
        spellSlotsLevel5: data.spellSlotsLevel5 ?? 0,
        spellSlotsLevel6: data.spellSlotsLevel6 ?? 0,
        libraryValue: data.libraryValue ?? undefined,
        workshopValue: data.workshopValue ?? undefined,
        congregants: data.congregants ?? undefined,
        magicResearch: data.magicResearch || '',
        spellbook: JSON.stringify(data.spellbook || []),
        learnedSpells: JSON.stringify(data.learnedSpells || []),
        researchQueue: JSON.stringify(data.researchQueue || []),
        researchTimeWeeks: Number(data.researchTimeWeeks || 0),
        researchCostGp: Number(data.researchCostGp || 0),
        xpFromTreasure: Number(data.xpFromTreasure || 0),
        monthlyUpkeepGp: Number(data.monthlyUpkeepGp || 0),
      },
      include: { weapons: true, proficiencies: true, items: true, spells: true, rituals: true, magicFormulae: true, henchmen: true, domain: true, scars: true, activities: true, armyUnits: true, magicItemResearch: true, mercantileVentures: true }
    });

    return reply.status(201).send({ character });
  });

  // Assign campaign/owner explicitly (kept separate from generic updates)
  app.put('/:characterId/assignment', { preHandler: [authGuard, assignmentRateLimit], schema: { body: assignmentBodySchema } }, async (request, reply) => {
    const { characterId } = request.params as { characterId: string };
    const { id, role } = request.user as any;
    const body = request.body as { campaignId?: string | null; userId?: string };

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return reply.status(400).send({ error: 'Invalid assignment payload' });
    }
    if (body.userId !== undefined && (typeof body.userId !== 'string' || body.userId.trim().length === 0)) {
      return reply.status(400).send({ error: 'userId must be a non-empty string' });
    }
    if (body.campaignId !== undefined && body.campaignId !== null && typeof body.campaignId !== 'string') {
      return reply.status(400).send({ error: 'campaignId must be a string or null' });
    }

    const existing = await prisma.character.findUnique({ where: { id: characterId } });
    if (!existing) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(existing, id, role))) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    if (body.userId !== undefined && role !== 'MASTER') {
      return reply.status(403).send({ error: 'Only master can transfer character ownership' });
    }

    const nextUserId = body.userId ?? existing.userId;
  const nextCampaignId = body.campaignId === undefined ? existing.campaignId : body.campaignId;

    if (existing.classKey && !existing.classKey.startsWith('catalog:') && nextCampaignId !== existing.campaignId) {
      return reply.code(400).send({ error: 'Escolha uma classe do catálogo antes de transferir uma ficha com classe personalizada.' });
    }

    if (nextCampaignId !== null) {
      const targetCampaign = await prisma.campaign.findUnique({
        where: { id: nextCampaignId },
        select: { masterId: true },
      });
      if (!targetCampaign) return reply.status(404).send({ error: 'Campaign not found' });

      const actorOwnsCharacter = existing.userId === id;
      const actorMastersTarget = role === 'MASTER' && targetCampaign.masterId === id;
      if (!actorOwnsCharacter && !actorMastersTarget) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const ownerIsCampaignMaster = targetCampaign.masterId === nextUserId;
      if (!ownerIsCampaignMaster) {
        const membership = await prisma.campaignMember.findUnique({
          where: {
            campaignId_userId: {
              campaignId: nextCampaignId,
              userId: nextUserId,
            },
          },
        });
        if (!membership || membership.status !== 'ACCEPTED') {
          return reply.status(400).send({ error: 'Character owner must be an accepted member of the target campaign' });
        }
      }
    }

    const updated = await prisma.character.update({
      where: { id: characterId },
      data: {
        ...(body.userId !== undefined && { userId: nextUserId }),
        ...(body.campaignId !== undefined && { campaignId: nextCampaignId }),
      },
      include: {
        user: { select: { username: true } },
        weapons: true,
        proficiencies: true,
        items: true,
        spells: true,
        rituals: true,
        magicFormulae: true,
        henchmen: true,
        domain: true,
        scars: true,
        activities: true,
        armyUnits: true,
        magicItemResearch: true,
        mercantileVentures: true,
      },
    });

    const progressedAssignment = await applyClassProgression(characterId);

    try {
      if (updated.campaignId) {
        const details: string[] = [];
        if (body.campaignId !== undefined && body.campaignId !== existing.campaignId) {
          details.push(`Campanha(${String(existing.campaignId ?? 'Sem campanha')}->${String(body.campaignId ?? 'Sem campanha')})`);
        }
        if (body.userId !== undefined && body.userId !== existing.userId) {
          details.push(`Dono(${existing.userId}->${body.userId})`);
        }
        if (details.length > 0) {
          await prisma.auditLog.create({
            data: {
              characterId: updated.id,
              campaignId: updated.campaignId,
              userId: id,
              action: 'ATUALIZOU',
              details: details.join(', '),
            },
          });
        }
      }
    } catch (e) {
      request.log.error({ err: e, characterId }, 'Failed to write character assignment audit');
    }

    return reply.send({ character: progressedAssignment ? { ...updated, ...progressedAssignment } : updated });
  });

  // Update character
  app.put('/:characterId', { preHandler: [authGuard], schema: { body: characterUpdateBody } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;

    const existing = await prisma.character.findUnique({ where: { id: characterId } });
    if (!existing) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(existing, id, role))) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Whitelist allowed character fields to avoid invalid data
    const ALLOWED_KEYS = [
      'characterName', 'birthplace', 'className', 'classKey', 'subclass', 'title', 'alignment', 'age', 'size', 'gender',
      'level', 'xp', 'xpNext', 'hpMax', 'hpCurr', 'hitDice',
      'str', 'int', 'dex', 'wil', 'con', 'cha',
      'acNoArmor', 'acNoShield', 'acWithShield', 'armorName', 'armorAcBonus', 'armorWeight',
      'acAdjustment',
      'saveDeath', 'saveImplements', 'saveParalysis', 'saveBlast', 'saveSpells',
      'moveExploration', 'moveCombat', 'moveCharge', 'moveExpedition', 'moveStealth',
      'initiative', 'surprise', 'surpriseOthers', 'avoidSurprise', 'healingRate', 'mortalWounds', 'cleaves', 'notes',
      'chroniclesOf', 'classFeatures', 'languagesKnown', 'coinPP', 'coinEP', 'coinGP', 'coinSP', 'coinCP', 'gemsJewelry',
      'isSpellcaster', 'spellSlotsLevel1', 'spellSlotsLevel2', 'spellSlotsLevel3',
      'spellSlotsLevel4', 'spellSlotsLevel5', 'spellSlotsLevel6',
      'libraryValue', 'workshopValue', 'congregants', 'magicResearch',
      'spellbook', 'learnedSpells', 'researchQueue', 'researchTimeWeeks', 'researchCostGp',
      'xpFromTreasure', 'monthlyUpkeepGp'
    ] as const;
    const allowed: Record<string, unknown> = {};
    for (const k of ALLOWED_KEYS) {
      if (data[k] !== undefined) {
        const v = data[k];
        if (k === 'isSpellcaster') allowed[k] = v === true;
        else if (v === null) allowed[k] = null;
        else if ((k === 'spellbook' || k === 'learnedSpells' || k === 'researchQueue') && Array.isArray(v)) {
          allowed[k] = JSON.stringify(v);
        }
        else if (typeof v === 'number' && !Number.isNaN(v)) allowed[k] = v;
        else if (typeof v === 'string') allowed[k] = v;
      }
    }

    if (data.classKey !== undefined && typeof data.classKey !== 'string') return reply.code(400).send({ error: 'Identificador de classe inválido.' });
    const classKey = typeof allowed.classKey === 'string' ? allowed.classKey : existing.classKey;
    const klass = await resolveClass(classKey || '', existing.campaignId, String(allowed.className ?? existing.className));
    if (classKey || klass) {
      if (!klass) return reply.code(400).send({ error: 'Classe não disponível para esta ficha.' });
      const level = Number(allowed.level ?? existing.level);
      if (!Number.isInteger(level) || level < 1 || level > JSON.parse(klass.xpPerLevel).length) return reply.code(400).send({ error: 'Nível fora da progressão desta classe.' });
      allowed.className = klass.name;
      const campaign = existing.campaignId ? await prisma.campaign.findUnique({ where: { id: existing.campaignId } }) : null;
      if (parseJsonSafe<Record<string, boolean>>(campaign?.optionalRules, {}).enableClassAutoProgression !== false) {
        const previousClass = await resolveClass(existing.classKey || '', existing.campaignId, existing.className);
        const before = previousClass ? progressionFields(previousClass, existing.level, existing.wil) : null;
        const after = progressionFields(klass, level, Number(allowed.wil ?? existing.wil));
        for (const key of ['saveDeath', 'saveParalysis', 'saveBlast', 'saveImplements', 'saveSpells'] as const) {
          // Preserve explicit changes; otherwise carry the existing adjustment to the new base.
          if (after[key] !== undefined && (allowed[key] === undefined || allowed[key] === existing[key])) {
            allowed[key] = after[key]! + (before?.[key] !== undefined ? existing[key] - before[key]! : 0);
          }
        }
      }
    }

    const armor = Number(allowed.armorAcBonus ?? existing.armorAcBonus ?? 0);
    const dex = abilityModifier(Number(allowed.dex ?? existing.dex ?? 10));
    const adjustment = Number(allowed.acAdjustment ?? existing.acAdjustment ?? 0);
    Object.assign(allowed, { acNoArmor: dex + adjustment, acNoShield: armor + dex + adjustment, acWithShield: armor + dex + adjustment + 1 });
    if (existing.version !== data.version) return reply.code(409).send({ code: 'CHARACTER_CONFLICT', error: 'A ficha foi alterada em outra sessão. Exporte suas alterações e recarregue a versão atual.' });
    let character;
    try {
      character = await prisma.$transaction(async tx => {
        // The database trigger increments version for EVERY character update.
        let updated = await tx.character.update({
          where: { id: characterId, version: data.version, userId: existing.userId, campaignId: existing.campaignId },
          data: allowed as Record<string, unknown>,
          include: { user: { select: { username: true } }, weapons: true, proficiencies: true, items: true, spells: true, rituals: true, magicFormulae: true, henchmen: true, domain: true, scars: true, activities: true, magicItemResearch: true, mercantileVentures: true }
        });
        if (allowed.level !== undefined || allowed.className !== undefined || allowed.classKey !== undefined) {
          const progressed = await applyClassProgression(characterId, tx);
          if (progressed) updated = { ...updated, ...progressed };
        }
        return updated;
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') return reply.code(409).send({ code: 'CHARACTER_CONFLICT', error: 'A ficha mudou durante o salvamento. Exporte suas alterações e recarregue.' });
      throw error;
    }

    try {
      if (character.campaignId) {
        let changes: string[] = [];
        const prev = existing as any;
        
        // Let's systematically track important things
        const check = (key: string, label: string, format?: (val: any) => string) => {
          if (allowed[key] !== undefined && allowed[key] !== prev[key]) {
            const fromVal = format ? format(prev[key]) : prev[key];
            const toVal = format ? format(allowed[key]) : allowed[key];
            changes.push(`${label}(${fromVal}->${toVal})`);
          }
        };

        check('hpCurr', 'HP', (v) => `${v}/${character.hpMax}`);
        check('xp', 'XP');
        check('level', 'Nível');
        check('coinGP', 'PO');
        check('coinSP', 'PP');
        check('coinCP', 'PC');
        check('str', 'FOR');
        check('int', 'INT');
        check('dex', 'DES');
        check('wil', 'VON');
        check('con', 'CON');
        check('cha', 'CAR');
        check('characterName', 'Nome');
        check('className', 'Classe');

        // General fallback for anything else if changes is still empty and allowed has different keys
        if (changes.length === 0) {
           for (const k of Object.keys(allowed)) {
               if (k !== 'updatedAt' && k !== 'userId' && k !== 'campaignId' && allowed[k] !== prev[k]) {
                   changes.push(`Info(${k})`);
                   break; // Just put one so we know something changed
               }
           }
        }

        if (changes.length > 0) {
          // Truncate to avoid too large strings just in case
          const finalChanges = changes.join(', ').substring(0, 200);
          await prisma.auditLog.create({
            data: {
              characterId: character.id,
              campaignId: character.campaignId,
              userId: id,
              action: 'ATUALIZOU',
              details: finalChanges
            }
          });
        }
      }
    } catch (e) {
      request.log.error({ err: e, characterId }, 'Failed to write character update audit');
    }

    return reply.send({ character });
  });

  // Award XP for eligible treasure brought back from an adventure. The treasure
  // remains in the character's possession; awardId makes retries idempotent.
  app.post('/:characterId/treasure/convert-xp', {
    preHandler: [authGuard],
    schema: { body: treasureConversionBodySchema },
  }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const { awardId, source = '', gp = 0, sp = 0, cp = 0 } = request.body as {
      awardId: string; source?: string; gp?: number; sp?: number; cp?: number;
    };
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });
    const requestedGp = Number(gp);
    const requestedSp = Number(sp);
    const requestedCp = Number(cp);
    if (requestedGp + requestedSp + requestedCp === 0) {
      return reply.status(400).send({ error: 'At least one coin amount must be greater than zero' });
    }

    const xpGain = Math.floor(requestedGp + requestedSp / 10 + requestedCp / 100);
    if (xpGain < 1) {
      return reply.status(400).send({ error: 'Treasure must be worth at least 1 gp' });
    }
    if (xpGain > 2147483647) {
      return reply.status(400).send({ error: 'Treasure award is too large' });
    }

    const normalizedAwardId = awardId.trim().toLocaleLowerCase('en-US');
    if (!normalizedAwardId) return reply.code(400).send({ error: 'Informe uma identificação para o tesouro.' });
    const logId = `treasure-xp:${createHash('sha256')
      .update(`${characterId}\0${normalizedAwardId}`)
      .digest('hex')}`;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.auditLog.create({
          data: {
            id: logId,
            characterId,
            campaignId: access.character!.campaignId,
            userId: id,
            action: 'XP_TESOURO',
            details: JSON.stringify({
              awardId: awardId.trim(), source: source.trim(),
              eligibleTreasure: { gp: requestedGp, sp: requestedSp, cp: requestedCp },
              xpGain,
            }),
          },
        });
        return tx.character.update({
          where: { id: characterId },
          data: {
            xp: { increment: xpGain },
            xpFromTreasure: { increment: xpGain },
          },
        });
      });

      return reply.send({ xpGain, awardId: awardId.trim(), character: updated });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(409).send({ error: 'This treasure award has already been applied' });
      }
      throw error;
    }
  });

  // Recalculate monthly maintenance from domain + retainers
  app.post('/:characterId/maintenance/recalculate', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: { henchmen: true, domain: true }
    });
    if (!character) return reply.status(404).send({ error: 'Character not found' });

    const retainers = character.henchmen.reduce((sum, h) => sum + Number(h.wage || 0), 0);
    const domainMaintenance = Number(character.domain?.maintenanceCost || 0) + Number(character.domain?.garrisonCost || 0);
    const monthlyUpkeepGp = Math.round(retainers + domainMaintenance);

    const updated = await prisma.character.update({
      where: { id: characterId },
      data: { monthlyUpkeepGp }
    });

    return reply.send({ monthlyUpkeepGp, character: updated });
  });

  // Delete character
  app.delete('/:characterId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;

    const existing = await prisma.character.findUnique({ where: { id: characterId } });
    if (!existing) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(existing, id, role))) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    await prisma.character.delete({ where: { id: characterId } });
    return reply.send({ message: 'Character deleted' });
  });

  // ====== WEAPONS ======
  app.post('/:characterId/weapons', { preHandler: [authGuard], schema: { body: scalarBody('Weapon') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });

    const weapon = await prisma.weapon.create({
      data: { characterId, name: data.name || '', style: data.style || '', initBonus: data.initBonus || 0, attackThrow: data.attackThrow || 10, attackBonus: data.attackBonus || 0, damage: data.damage || '1d6', rangeShort: data.rangeShort || 0, rangeMed: data.rangeMed || 0, rangeLong: data.rangeLong || 0, encumbrance: data.encumbrance || 0 }
    });
    return reply.status(201).send({ weapon });
  });

  app.put('/:characterId/weapons/:weaponId', { preHandler: [authGuard], schema: { body: scalarBody('Weapon') } }, async (request, reply) => {
    const { characterId, weaponId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const existing = await prisma.weapon.findFirst({ where: { id: weaponId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Weapon not found' });
    let catalogDamage: string | undefined;
    if (data.automaticDamage ?? existing.automaticDamage) {
      try { catalogDamage = weaponCatalogValues(data.catalogId ?? existing.catalogId, data.style ?? existing.style).damage; }
      catch { return reply.code(400).send({ error: 'Selecione uma arma válida do catálogo.' }); }
    }
    const weapon = await prisma.weapon.update({
      where: { id: weaponId },
      data: {
        ...(data.name !== undefined && { name: String(data.name) }),
        ...(data.style !== undefined && { style: String(data.style) }),
        ...(data.initBonus !== undefined && { initBonus: Number(data.initBonus) }),
        ...(data.attackThrow !== undefined && { attackThrow: Number(data.attackThrow) }),
        ...(data.attackBonus !== undefined && { attackBonus: Number(data.attackBonus) }),
        ...(data.damage !== undefined && { damage: String(data.damage) }),
        ...(data.catalogId !== undefined && { catalogId: data.catalogId }),
        ...(data.automaticDamage !== undefined && { automaticDamage: data.automaticDamage }),
        ...(catalogDamage !== undefined && { damage: catalogDamage }),
        ...(data.rangeShort !== undefined && { rangeShort: Number(data.rangeShort) }),
        ...(data.rangeMed !== undefined && { rangeMed: Number(data.rangeMed) }),
        ...(data.rangeLong !== undefined && { rangeLong: Number(data.rangeLong) }),
        ...(data.encumbrance !== undefined && { encumbrance: Number(data.encumbrance) }),
      },
    });
    return reply.send({ weapon });
  });

  app.delete('/:characterId/weapons/:weaponId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, weaponId } = request.params as any;
    const { id, role } = request.user as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const weapon = await prisma.weapon.findFirst({ where: { id: weaponId, characterId } });
    if (!weapon) return reply.status(404).send({ error: 'Weapon not found' });
    await prisma.weapon.delete({ where: { id: weaponId } });
    return reply.send({ message: 'Weapon deleted' });
  });

  app.post('/:characterId/shop/purchase', { preHandler: [authGuard], schema: { body: purchaseBodySchema } }, async (request, reply) => {
    const { characterId } = request.params as { characterId: string };
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error) return reply.code(access.error === 'not_found' ? 404 : 403).send({ error: access.error });
    const entry = findCompendiumEntry((request.body as { entryId: string }).entryId);
    if (!entry || !['item', 'weapon'].includes(entry.type) || !Number.isFinite(entry.costGp) || entry.costGp! <= 0) {
      return reply.code(400).send({ error: 'Item indisponível para compra.' });
    }
    try {
      const result = await prisma.$transaction(async tx => {
        const current = await tx.character.findUniqueOrThrow({ where: { id: characterId } });
        // Compare-and-swap prevents concurrent purchases spending the same coins.
        const copper = current.coinGP * 100 + current.coinSP * 10 + current.coinCP - Math.round(entry.costGp! * 100);
        if (copper < 0) throw new Error('INSUFFICIENT_COINS');
        const coins = { coinGP: Math.floor(copper / 100), coinSP: Math.floor(copper % 100 / 10), coinCP: copper % 10 };
        const debit = await tx.character.updateMany({
          where: { id: characterId, coinGP: current.coinGP, coinSP: current.coinSP, coinCP: current.coinCP }, data: coins,
        });
        if (!debit.count) throw new Error('PURCHASE_CONFLICT');
        const klass = await resolveClass(current.classKey, current.campaignId, current.className);
        const attackThrow = klass ? parseJsonSafe<number[]>(klass.attackThrows, [10])[current.level - 1] ?? 10 : 10;
        if (entry.type === 'weapon') {
          const weapon = await tx.weapon.create({ data: { characterId, name: entry.name, damage: entry.damage ?? '1d6',
            catalogId:entry.id, automaticDamage:true, style:defaultWeaponStyle(entry.id),
            attackThrow, encumbrance: entry.encumbrance ?? 0, rangeShort: entry.rangeShort ?? 0,
            rangeMed: entry.rangeMed ?? 0, rangeLong: entry.rangeLong ?? 0 } });
          return { character: await tx.character.findUniqueOrThrow({ where: { id: characterId } }), weapon };
        }
        const slot = /horse|mule/i.test(entry.name) ? 'mount' : /cart|wagon/i.test(entry.name) ? 'vehicle' : 'backpack';
        const item = await tx.item.create({ data: { characterId, name: entry.name, quantity: 1,
          slot, weight: entry.encumbrance ?? 0, notes: entry.notes ?? '' } });
        return { character: await tx.character.findUniqueOrThrow({ where: { id: characterId } }), item };
      });
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof Error && ['INSUFFICIENT_COINS', 'PURCHASE_CONFLICT'].includes(error.message)) {
        return reply.code(409).send({ error: error.message === 'INSUFFICIENT_COINS' ? 'Saldo insuficiente em GP/SP/CP.' : 'O saldo mudou durante a compra. Atualize e tente novamente.' });
      }
      throw error;
    }
  });

  // ====== PROFICIENCIES ======
  app.put('/:characterId/proficiencies/:profId', { preHandler: [authGuard], schema: { body: proficiencyUpdateBodySchema } }, async (request, reply) => {
    const { characterId, profId } = request.params as { characterId: string; profId: string };
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error) return reply.code(access.error === 'not_found' ? 404 : 403).send({ error: access.error });
    const existing = await prisma.proficiency.findFirst({ where: { id: profId, characterId } });
    if (!existing) return reply.code(404).send({ error: 'Proficiency not found' });
    const data = request.body as { name?: string; category?: string; throwTarget?: number };
    if (data.name !== undefined && !data.name.trim()) return reply.code(400).send({ error: 'Informe o nome da proficiência.' });
    return { proficiency: await prisma.proficiency.update({ where: { id: profId }, data }) };
  });
  app.post('/:characterId/proficiencies', { preHandler: [authGuard], schema: { body: scalarBody('Proficiency') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const proficiency = await prisma.proficiency.create({
      data: { characterId, name: data.name || '', throwTarget: data.throwTarget || 11, category: data.category || 'general' }
    });
    return reply.status(201).send({ proficiency });
  });

  app.delete('/:characterId/proficiencies/:profId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, profId } = request.params as any;
    const { id, role } = request.user as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const proficiency = await prisma.proficiency.findFirst({ where: { id: profId, characterId } });
    if (!proficiency) return reply.status(404).send({ error: 'Proficiency not found' });
    await prisma.proficiency.delete({ where: { id: profId } });
    return reply.send({ message: 'Proficiency deleted' });
  });

  // ====== ITEMS ======
  app.post('/:characterId/items', { preHandler: [authGuard], schema: { body: itemCreateBodySchema } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const name = String(data.name).trim();
    if (!name) return reply.status(400).send({ error: 'Item name cannot be blank' });
    const item = await prisma.item.create({
      data: {
        characterId,
        name,
        quantity: data.quantity ?? 1,
        weight: data.weight ?? 0,
        slot: data.slot ?? 'backpack',
        notes: data.notes ?? '',
      }
    });
    return reply.status(201).send({ item });
  });

  app.put('/:characterId/items/:itemId', { preHandler: [authGuard], schema: { body: itemUpdateBodySchema } }, async (request, reply) => {
    const { characterId, itemId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const existing = await prisma.item.findFirst({ where: { id: itemId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Item not found' });
    const { name, quantity, weight, slot, notes } = data;
    const normalizedName = name === undefined ? undefined : String(name).trim();
    if (normalizedName !== undefined && !normalizedName) {
      return reply.status(400).send({ error: 'Item name cannot be blank' });
    }
    const item = await prisma.item.update({
      where: { id: itemId },
      data: {
        ...(normalizedName !== undefined && { name: normalizedName }),
        ...(quantity !== undefined && { quantity }),
        ...(weight !== undefined && { weight }),
        ...(slot !== undefined && { slot }),
        ...(notes !== undefined && { notes }),
      },
    });
    return reply.send({ item });
  });

  app.delete('/:characterId/items/:itemId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, itemId } = request.params as any;
    const { id, role } = request.user as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const item = await prisma.item.findFirst({ where: { id: itemId, characterId } });
    if (!item) return reply.status(404).send({ error: 'Item not found' });
    await prisma.item.delete({ where: { id: itemId } });
    return reply.send({ message: 'Item deleted' });
  });

  // ====== SPELLS (spellcasters only) ======
  app.post('/:characterId/spells', { preHandler: [authGuard], schema: { body: scalarBody('Spell') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const level = Math.min(6, Math.max(1, Number(data.level) || 1));
    const spell = await prisma.spell.create({
      data: { characterId, level, name: data.name || '' }
    });
    return reply.status(201).send({ spell });
  });

  app.put('/:characterId/spells/:spellId', { preHandler: [authGuard], schema: { body: scalarBody('Spell') } }, async (request, reply) => {
    const { characterId, spellId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const existing = await prisma.spell.findFirst({ where: { id: spellId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Spell not found' });
    const spell = await prisma.spell.update({
      where: { id: spellId },
      data: { name: data.name !== undefined ? String(data.name) : undefined },
    });
    return reply.send({ spell });
  });

  app.delete('/:characterId/spells/:spellId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, spellId } = request.params as any;
    const { id, role } = request.user as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const spell = await prisma.spell.findFirst({ where: { id: spellId, characterId } });
    if (!spell) return reply.status(404).send({ error: 'Spell not found' });
    await prisma.spell.delete({ where: { id: spellId } });
    return reply.send({ message: 'Spell deleted' });
  });

  // ====== RITUALS ======
  app.post('/:characterId/rituals', { preHandler: [authGuard], schema: { body: scalarBody('Ritual') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const ritual = await prisma.ritual.create({
      data: { characterId, name: data.name || '' }
    });
    return reply.status(201).send({ ritual });
  });

  app.put('/:characterId/rituals/:ritualId', { preHandler: [authGuard], schema: { body: scalarBody('Ritual') } }, async (request, reply) => {
    const { characterId, ritualId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const existing = await prisma.ritual.findFirst({ where: { id: ritualId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Ritual not found' });
    const ritual = await prisma.ritual.update({
      where: { id: ritualId },
      data: { name: data.name !== undefined ? String(data.name) : undefined },
    });
    return reply.send({ ritual });
  });

  app.delete('/:characterId/rituals/:ritualId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, ritualId } = request.params as any;
    const { id, role } = request.user as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const ritual = await prisma.ritual.findFirst({ where: { id: ritualId, characterId } });
    if (!ritual) return reply.status(404).send({ error: 'Ritual not found' });
    await prisma.ritual.delete({ where: { id: ritualId } });
    return reply.send({ message: 'Ritual deleted' });
  });

  // ====== MAGIC FORMULAE ======
  app.post('/:characterId/magic-formulae', { preHandler: [authGuard], schema: { body: scalarBody('MagicFormula') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const formula = await prisma.magicFormula.create({
      data: { characterId, name: data.name || '' }
    });
    return reply.status(201).send({ formula });
  });

  app.put('/:characterId/magic-formulae/:formulaId', { preHandler: [authGuard], schema: { body: scalarBody('MagicFormula') } }, async (request, reply) => {
    const { characterId, formulaId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const existing = await prisma.magicFormula.findFirst({ where: { id: formulaId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Magic formula not found' });
    const formula = await prisma.magicFormula.update({
      where: { id: formulaId },
      data: { name: data.name !== undefined ? String(data.name) : undefined },
    });
    return reply.send({ formula });
  });

  app.delete('/:characterId/magic-formulae/:formulaId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, formulaId } = request.params as any;
    const { id, role } = request.user as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    const formula = await prisma.magicFormula.findFirst({ where: { id: formulaId, characterId } });
    if (!formula) return reply.status(404).send({ error: 'Magic formula not found' });
    await prisma.magicFormula.delete({ where: { id: formulaId } });
    return reply.send({ message: 'Magic formula deleted' });
  });

  // ====== MAGIC ITEM RESEARCH ======
  app.post('/:characterId/magic-research', { preHandler: [authGuard], schema: { body: scalarBody('MagicItemResearch') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    
    let values;
    try { values = researchData(data, character); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
    const research = await prisma.magicItemResearch.create({ data: { ...values, characterId } });
    return reply.status(201).send({ research });
  });

  app.put('/:characterId/magic-research/:researchId', { preHandler: [authGuard], schema: { body: scalarBody('MagicItemResearch') } }, async (request, reply) => {
    const { characterId, researchId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    
    const existing = await prisma.magicItemResearch.findFirst({ where: { id: researchId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Magic research not found' });
    
    let values;
    if (readState(character.rulesState).research?.[researchId]) return reply.code(409).send({error:'Este projeto é acompanhado em Evolução & Regras. Use esse fluxo para registrar trabalho ou cancelamento.'});
    try { values = researchData(data, character, existing); }
    catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
    const research = await prisma.magicItemResearch.update({ where: { id: researchId }, data: values });
    return reply.send({ research });
  });

  app.delete('/:characterId/magic-research/:researchId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, researchId } = request.params as any;
    const { id, role } = request.user as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    
    const existing = await prisma.magicItemResearch.findFirst({ where: { id: researchId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Magic research not found' });
    
    if (readState(character.rulesState).research?.[researchId]) return reply.code(409).send({error:'Cancele o projeto em Evolução & Regras para preservar o histórico.'});
    await prisma.magicItemResearch.delete({ where: { id: researchId } });
    return reply.send({ message: 'Magic research deleted' });
  });

  // ====== MERCANTILE VENTURES ======
  app.post('/:characterId/mercantile', { preHandler: [authGuard], schema: { body: scalarBody('MercantileVenture') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    
    const venture = await prisma.mercantileVenture.create({
      data: { 
        characterId, 
        cargoName: data.cargoName || 'Cargo',
        baseValueGp: Number(data.baseValueGp) || 100,
        originMarketClass: Math.max(1, Math.min(6, Number(data.originMarketClass) || 3)),
        destMarketClass: Math.max(1, Math.min(6, Number(data.destMarketClass) || 3)),
        distanceHexes: Math.max(1, Number(data.distanceHexes) || 1),
        status: data.status || 'IN_TRANSIT',
        profitGp: Number(data.profitGp) || 0
      }
    });
    return reply.status(201).send({ venture });
  });

  app.put('/:characterId/mercantile/:ventureId', { preHandler: [authGuard], schema: { body: scalarBody('MercantileVenture') } }, async (request, reply) => {
    const { characterId, ventureId } = request.params as any;
    const { id, role } = request.user as any;
    const data = request.body as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    
    const existing = await prisma.mercantileVenture.findFirst({ where: { id: ventureId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Mercantile venture not found' });
    
    const venture = await prisma.mercantileVenture.update({
      where: { id: ventureId },
      data: {
        ...(data.cargoName !== undefined && { cargoName: String(data.cargoName) }),
        ...(data.baseValueGp !== undefined && { baseValueGp: Number(data.baseValueGp) }),
        ...(data.originMarketClass !== undefined && { originMarketClass: Math.max(1, Math.min(6, Number(data.originMarketClass))) }),
        ...(data.destMarketClass !== undefined && { destMarketClass: Math.max(1, Math.min(6, Number(data.destMarketClass))) }),
        ...(data.distanceHexes !== undefined && { distanceHexes: Math.max(1, Number(data.distanceHexes)) }),
        ...(data.status !== undefined && { status: String(data.status) }),
        ...(data.profitGp !== undefined && { profitGp: Number(data.profitGp) })
      },
    });
    return reply.send({ venture });
  });

  // Settlement and the coin credit must succeed together, including retries.
  app.post('/:characterId/mercantile/:ventureId/sell', {
    preHandler: [authGuard],
    schema: { body: { type: 'object', additionalProperties: false, required: ['version'], properties: { version: { type: 'integer', minimum: 0 } } } },
  }, async (request, reply) => {
    const { characterId, ventureId } = request.params as { characterId: string; ventureId: string };
    const { version } = request.body as { version: number };
    const { id, role } = request.user;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error) return reply.code(access.error === 'not_found' ? 404 : 403).send({ error: access.error });
    const logId = `mercantile-sale:${ventureId}`;
    try {
      return await prisma.$transaction(async tx => {
        const venture = await tx.mercantileVenture.findFirst({ where: { id: ventureId, characterId } });
        if (!venture) throw new Error('VENTURE_NOT_FOUND');
        if (venture.status === 'SOLD' || await tx.auditLog.findUnique({ where: { id: logId } })) throw new Error('VENTURE_SOLD');
        // Existing simplified market model: equal markets have no modifier.
        const modifier = (venture.originMarketClass - venture.destMarketClass) * 10;
        const proceeds = Math.floor(venture.baseValueGp * (1 + modifier / 100));
        const changed = await tx.character.updateMany({ where: { id: characterId, version }, data: { coinGP: { increment: proceeds }, version: { increment: 1 } } });
        if (changed.count !== 1) throw new Error('SALE_CONFLICT');
        const sold = await tx.mercantileVenture.update({ where: { id: ventureId }, data: { status: 'SOLD', profitGp: proceeds - venture.baseValueGp } });
        await tx.auditLog.create({ data: { id: logId, characterId, campaignId: access.character!.campaignId, userId: id, action: 'MERCANTILE_SALE', details: JSON.stringify({ ventureId, proceeds, modifier }) } });
        const character = await tx.character.findUniqueOrThrow({ where: { id: characterId }, select: { coinGP: true, version: true } });
        return { venture: sold, character };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'VENTURE_NOT_FOUND') return reply.code(404).send({ error: 'Carga não encontrada.' });
      if (message === 'VENTURE_SOLD') return reply.code(409).send({ error: 'Esta carga já foi vendida.' });
      if (message === 'SALE_CONFLICT') return reply.code(409).send({ error: 'A ficha mudou. Atualize antes de vender a carga.' });
      throw error;
    }
  });

  app.delete('/:characterId/mercantile/:ventureId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, ventureId } = request.params as any;
    const { id, role } = request.user as any;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return reply.status(404).send({ error: 'Character not found' });
    if (!(await canAccessCharacter(character, id, role))) return reply.status(403).send({ error: 'Forbidden' });
    
    const existing = await prisma.mercantileVenture.findFirst({ where: { id: ventureId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Mercantile venture not found' });
    
    await prisma.mercantileVenture.delete({ where: { id: ventureId } });
    return reply.send({ message: 'Mercantile venture deleted' });
  });

  // --- SCARS ---
  app.post('/:characterId/scars', { preHandler: [authGuard], schema: { body: scalarBody('Scar') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const scar = await prisma.scar.create({
      data: { characterId, description: '', daysToRest: 0, debuff: '' }
    });
    return reply.send({ scar });
  });

  app.put('/:characterId/scars/:scarId', { preHandler: [authGuard], schema: { body: scalarBody('Scar') } }, async (request, reply) => {
    const { characterId, scarId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const existing = await prisma.scar.findFirst({ where: { id: scarId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Scar not found' });

    const data = request.body as any;
    const scar = await prisma.scar.update({
      where: { id: scarId },
      data: {
        description: data.description,
        daysToRest: data.daysToRest,
        debuff: data.debuff
      }
    });
    return reply.send({ scar });
  });

  app.delete('/:characterId/scars/:scarId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, scarId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const existing = await prisma.scar.findFirst({ where: { id: scarId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Scar not found' });

    await prisma.scar.delete({ where: { id: scarId } });
    return reply.send({ message: 'Scar deleted' });
  });

  // --- HENCHMEN ---
  app.post('/:characterId/henchmen', { preHandler: [authGuard], schema: { body: scalarBody('Henchman') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const henchman = await prisma.henchman.create({
      data: { characterId, name: '', className: '', level: 1, wage: 0, morale: 0, loyalty: 0, treasureShare: 0, notes: '' }
    });
    return reply.send({ henchman });
  });

  app.put('/:characterId/henchmen/:henchmanId', { preHandler: [authGuard], schema: { body: scalarBody('Henchman') } }, async (request, reply) => {
    const { characterId, henchmanId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const existing = await prisma.henchman.findFirst({ where: { id: henchmanId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Henchman not found' });

    const data = request.body as any;
    const henchman = await prisma.henchman.update({
      where: { id: henchmanId },
      data: {
        name: data.name,
        className: data.className,
        roleType: data.roleType,
        level: data.level,
        wage: data.wage,
        capacity: data.capacity,
        explorationImpact: data.explorationImpact,
        warImpact: data.warImpact,
        domainImpact: data.domainImpact,
        treasureShare: data.treasureShare,
        morale: data.morale,
        loyalty: data.loyalty,
        notes: data.notes
      }
    });
    return reply.send({ henchman });
  });

  app.delete('/:characterId/henchmen/:henchmanId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, henchmanId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const existing = await prisma.henchman.findFirst({ where: { id: henchmanId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Henchman not found' });

    await prisma.henchman.delete({ where: { id: henchmanId } });
    return reply.send({ message: 'Henchman deleted' });
  });

  // --- DOMAIN ---
  app.put('/:characterId/domain', { preHandler: [authGuard], schema: { body: domainBodySchema } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const data = request.body as any;
    const previous = await prisma.domain.findUnique({ where: { characterId } });
    data.landRevenue = domainEconomy({ ...previous, ...data }).land;
    const domain = await prisma.domain.upsert({
      where: { characterId },
      update: {
        peasantFamilies: data.peasantFamilies,
        revenuePerFamily: data.revenuePerFamily,
        taxRate: data.taxRate,
        servicePerFamily: data.servicePerFamily,
        taxPerFamily: data.taxPerFamily,
        liturgiesCost: data.liturgiesCost,
        titheCost: data.titheCost,
        strongholdName: data.strongholdName,
        landRevenue: data.landRevenue,
        garrisonCost: data.garrisonCost,
        civilExpenses: data.civilExpenses,
        constructionCosts: data.constructionCosts,
        mercenaryPayroll: data.mercenaryPayroll,
        specialistPayroll: data.specialistPayroll,
        maintenanceCost: data.maintenanceCost,
        peasantMorale: data.peasantMorale,
        stability: data.stability,
        loyalty: data.loyalty,
        monthlyEvent: data.monthlyEvent,
        eventModifier: data.eventModifier,
        treasury: data.treasury,
        consolidatedBalance: data.consolidatedBalance,
        mercantileVentures: data.mercantileVentures
      },
      create: {
        characterId,
        peasantFamilies: data.peasantFamilies ?? 0,
        revenuePerFamily: data.revenuePerFamily ?? 3,
        taxRate: data.taxRate ?? 20,
        servicePerFamily: data.servicePerFamily ?? 4,
        taxPerFamily: data.taxPerFamily ?? 2,
        liturgiesCost: data.liturgiesCost ?? 0,
        titheCost: data.titheCost ?? 0,
        strongholdName: data.strongholdName || '',
        landRevenue: data.landRevenue || 0,
        garrisonCost: data.garrisonCost || 0,
        civilExpenses: data.civilExpenses || 0,
        constructionCosts: data.constructionCosts || 0,
        mercenaryPayroll: data.mercenaryPayroll || 0,
        specialistPayroll: data.specialistPayroll || 0,
        maintenanceCost: data.maintenanceCost || 0,
        peasantMorale: data.peasantMorale || 0,
        stability: data.stability || 0,
        loyalty: data.loyalty || 0,
        monthlyEvent: data.monthlyEvent || '',
        eventModifier: data.eventModifier || 0,
        treasury: data.treasury || 0,
        consolidatedBalance: data.consolidatedBalance || 0,
        mercantileVentures: data.mercantileVentures || ''
      }
    });
    return reply.send({ domain });
  });

  // --- ACTIVITIES ---
  app.post('/:characterId/activities', { preHandler: [authGuard], schema: { body: scalarBody('CharacterActivity') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const data = request.body as any;
    const activity = await prisma.characterActivity.create({
      data: {
        characterId,
        type: data.type || 'downtime',
        title: data.title || 'Nova Atividade',
        details: data.details || '',
        costGp: Number(data.costGp || 0),
        durationWeeks: Math.max(1, Number(data.durationWeeks || 1)),
        remainingWeeks: Math.max(1, Number(data.remainingWeeks || 1)),
        status: data.status || 'QUEUED'
      }
    });
    return reply.status(201).send({ activity });
  });

  app.put('/:characterId/activities/:activityId', { preHandler: [authGuard], schema: { body: scalarBody('CharacterActivity') } }, async (request, reply) => {
    const { characterId, activityId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const existing = await prisma.characterActivity.findFirst({ where: { id: activityId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Activity not found' });

    const data = request.body as any;
    const activity = await prisma.characterActivity.update({
      where: { id: activityId },
      data: {
        type: data.type !== undefined ? String(data.type) : undefined,
        title: data.title !== undefined ? String(data.title) : undefined,
        details: data.details !== undefined ? String(data.details) : undefined,
        costGp: data.costGp !== undefined ? Number(data.costGp) : undefined,
        durationWeeks: data.durationWeeks !== undefined ? Number(data.durationWeeks) : undefined,
        remainingWeeks: data.remainingWeeks !== undefined ? Number(data.remainingWeeks) : undefined,
        status: data.status !== undefined ? String(data.status) : undefined
      }
    });
    return reply.send({ activity });
  });

  app.delete('/:characterId/activities/:activityId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, activityId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const existing = await prisma.characterActivity.findFirst({ where: { id: activityId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Activity not found' });

    await prisma.characterActivity.delete({ where: { id: activityId } });
    return reply.send({ message: 'Activity deleted' });
  });

  // --- ARMY UNITS ---
  app.post('/:characterId/armyUnits', { preHandler: [authGuard], schema: { body: scalarBody('ArmyUnit') } }, async (request, reply) => {
    const { characterId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const data = request.body as any;
    const unit = await prisma.armyUnit.create({
      data: {
        characterId,
        name: data.name || '',
        troopType: data.troopType || 'Light Infantry',
        ac: Number(data.ac || 0),
        damage: data.damage || '1d6',
        movement: Number(data.movement || 120),
        morale: Number(data.morale || 0),
        hp: Math.max(1, Number(data.hp || 1)),
        monthlyCostGp: Number(data.monthlyCostGp || 0),
        equipment: data.equipment || '',
        notes: data.notes || ''
      }
    });
    return reply.status(201).send({ unit });
  });

  app.put('/:characterId/armyUnits/:unitId', { preHandler: [authGuard], schema: { body: scalarBody('ArmyUnit') } }, async (request, reply) => {
    const { characterId, unitId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const existing = await prisma.armyUnit.findFirst({ where: { id: unitId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Army Unit not found' });

    const data = request.body as any;
    const unit = await prisma.armyUnit.update({
      where: { id: unitId },
      data: {
        name: data.name !== undefined ? String(data.name) : undefined,
        troopType: data.troopType !== undefined ? String(data.troopType) : undefined,
        ac: data.ac !== undefined ? Number(data.ac) : undefined,
        damage: data.damage !== undefined ? String(data.damage) : undefined,
        movement: data.movement !== undefined ? Number(data.movement) : undefined,
        morale: data.morale !== undefined ? Number(data.morale) : undefined,
        hp: data.hp !== undefined ? Math.max(1, Number(data.hp)) : undefined,
        monthlyCostGp: data.monthlyCostGp !== undefined ? Number(data.monthlyCostGp) : undefined,
        equipment: data.equipment !== undefined ? String(data.equipment) : undefined,
        notes: data.notes !== undefined ? String(data.notes) : undefined
      }
    });
    return reply.send({ unit });
  });

  app.delete('/:characterId/armyUnits/:unitId', { preHandler: [authGuard] }, async (request, reply) => {
    const { characterId, unitId } = request.params as any;
    const { id, role } = request.user as any;
    const access = await ensureCharacterAccess(characterId, id, role);
    if (access.error === 'not_found') return reply.status(404).send({ error: 'Character not found' });
    if (access.error === 'forbidden') return reply.status(403).send({ error: 'Forbidden' });

    const existing = await prisma.armyUnit.findFirst({ where: { id: unitId, characterId } });
    if (!existing) return reply.status(404).send({ error: 'Army Unit not found' });

    await prisma.armyUnit.delete({ where: { id: unitId } });
    return reply.send({ message: 'Army Unit deleted' });
  });
}

