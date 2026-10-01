import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma';

export const authGuard = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const token = request.user as { id: string; sessionVersion?: number; role: string; username: string };
  const user = await prisma.user.findUnique({ where: { id: token.id }, select: { sessionVersion: true, role: true } });
  if (!user || token.sessionVersion !== user.sessionVersion) return reply.code(401).send({ error: 'Sessão expirada ou revogada.' });
  token.role = user.role;
};
