import { Prisma } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import prisma from './prisma';

const versionProperty = { type: 'integer', minimum: 0, maximum: 2147483647 } as const;

/** Every manual relation editor shares the revision of its parent sheet. */
export function versionedBody(schema: Record<string, any> = { type: 'object', additionalProperties: false }) {
  return {
    ...schema,
    required: [...new Set([...(schema.required || []), 'version'])],
    ...(schema.minProperties ? { minProperties: schema.minProperties + 1 } : {}),
    properties: { ...schema.properties, version: versionProperty },
  };
}

export function relationFields(body: unknown): Record<string, unknown> {
  const { version: _version, ...fields } = body as Record<string, unknown>;
  return fields;
}

class MutationResult {
  constructor(public status: number, public payload: Record<string, any>) {}
}

class MutationError extends Error {
  constructor(public status: number, public payload: Record<string, any>) {
    super(String(payload.error || 'Character mutation failed'));
  }
}

/** Defer sending a response until the transaction has committed. */
export function mutationResponse(status: number, payload: Record<string, any>) {
  if (status >= 400) throw new MutationError(status, payload);
  return new MutationResult(status, payload);
}

const conflict = {
  code: 'CHARACTER_CONFLICT',
  error: 'A ficha foi alterada em outra sessão. Preserve suas alterações e recarregue a versão atual.',
};

export async function mutateCharacter(
  request: FastifyRequest,
  reply: FastifyReply,
  mutation: (tx: Prisma.TransactionClient) => Promise<MutationResult | Record<string, any>>,
) {
  const { characterId } = request.params as { characterId: string };
  const { version } = request.body as { version: number };
  const { id, role } = request.user;
  try {
    const result = await prisma.$transaction(async tx => {
      // The sheet lock serializes relation editors with scalar saves, rules,
      // purchases and assignment. A failed writer rolls back all its relations.
      await tx.$queryRaw`SELECT "id" FROM "Character" WHERE "id" = ${characterId} FOR UPDATE`;
      const character = await tx.character.findUnique({ where: { id: characterId } });
      if (!character) throw new MutationError(404, { error: 'Character not found' });
      if (character.userId !== id) {
        const campaign = role === 'MASTER' && character.campaignId
          ? await tx.campaign.findUnique({ where: { id: character.campaignId }, select: { masterId: true } })
          : null;
        if (campaign?.masterId !== id) throw new MutationError(403, { error: 'Forbidden' });
      }
      if (character.version !== version) throw new MutationError(409, conflict);

      const response = await mutation(tx);
      const status = response instanceof MutationResult ? response.status : 200;
      const payload = response instanceof MutationResult ? response.payload : response;
      let current = await tx.character.findUniqueOrThrow({ where: { id: characterId } });
      if (current.version === version) {
        // Existing trigger owns the revision. Only relation-only mutations need
        // a parent update; coin debits and maintenance already invoke it.
        current = await tx.character.update({ where: { id: characterId }, data: { updatedAt: new Date() } });
      }
      return {
        status,
        payload: {
          ...payload,
          version: current.version,
          character: payload.character
            ? { ...payload.character, ...current }
            : { id: current.id, version: current.version, updatedAt: current.updatedAt },
        },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return reply.code(result.status).send(result.payload);
  } catch (error) {
    if (error instanceof MutationError) return reply.code(error.status).send(error.payload);
    const databaseError = error as { code?: string; meta?: { code?: string } };
    if (['P2034', 'P2025'].includes(databaseError.code || '') ||
        (databaseError.code === 'P2010' && ['40001', '40P01'].includes(databaseError.meta?.code || ''))) {
      return reply.code(409).send(conflict);
    }
    throw error;
  }
}
