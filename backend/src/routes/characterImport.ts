import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { resolveClass } from '../lib/classCatalog';
import { CharacterImportError, assertCharacterImportFields, characterImportBody, importedRelations, prepareCharacterImport } from '../lib/characterImport';

export async function characterImportRoutes(app: FastifyInstance) {
  app.post('/import', {
    preValidation: async (request, reply) => {
      try { assertCharacterImportFields(request.body); }
      catch (error) { if (error instanceof CharacterImportError) return reply.code(400).send({ error: error.message }); throw error; }
    },
    preHandler: [authGuard], schema: { body: characterImportBody },
  }, async (request, reply) => {
    const { document, campaignId = null } = request.body as { document: { character: Record<string, any> }; campaignId?: string | null };
    const userId = request.user.id;
    try {
      const prepared = prepareCharacterImport(document.character);
      const result = await prisma.$transaction(async tx => {
        if (campaignId) {
          const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, select: { masterId: true } });
          const membership = campaign?.masterId === userId ? null : await tx.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId } } });
          if (!campaign || (campaign.masterId !== userId && membership?.status !== 'ACCEPTED')) return null;
        }
        let klass = await resolveClass(prepared.fields.classKey || '', campaignId, prepared.fields.className || '');
        if (!klass && prepared.fields.className) klass = await resolveClass('', campaignId, prepared.fields.className);
        if (klass) {
          prepared.fields.classKey = klass.id;
          prepared.fields.className = klass.name;
        } else {
          prepared.fields.classKey = '';
          if (prepared.fields.className) prepared.warnings.push('A classe não está disponível no catálogo ou na campanha escolhida. Seu nome e valores foram preservados como classe manual; revise a progressão com o mestre.');
        }
        const character = await tx.character.create({
          data: { ...prepared.fields, ...prepared.relations, userId, campaignId } as Prisma.CharacterUncheckedCreateInput,
          include: { ...Object.fromEntries(Object.keys(importedRelations).map(name => [name, true])), domain: true },
        });
        await tx.auditLog.create({ data: { characterId: character.id, campaignId, userId, action: 'CHARACTER_IMPORTED', details: JSON.stringify({ format: 'acks-ii-character', version: 1, warnings: prepared.warnings }) } });
        return { character, warnings: prepared.warnings };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (!result) return reply.code(403).send({ error: 'Você precisa ser mestre ou membro aceito da campanha para importar uma ficha nela.' });
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof CharacterImportError) return reply.code(400).send({ error: error.message });
      if ((error as { code?: string }).code === 'P2034') return reply.code(409).send({ error: 'A campanha mudou durante a importação. Tente novamente.' });
      throw error;
    }
  });
}
