import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { rateLimitByIp } from '../lib/rateLimit';
import { hashResetToken, sendPasswordReset } from '../lib/passwordReset';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

const registerBodySchema = {
  type: 'object',
  required: ['username', 'email', 'password'],
  additionalProperties: false,
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 40 },
    email: { type: 'string', minLength: 5, maxLength: 160 },
    password: { type: 'string', minLength: 8, maxLength: 200 },
    role: { type: 'string', enum: ['MASTER', 'PLAYER'] },
  },
} as const;

const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', minLength: 5, maxLength: 160 },
    password: { type: 'string', minLength: 1, maxLength: 200 },
  },
} as const;

export async function authRoutes(app: FastifyInstance) {
  const registerRateLimit = rateLimitByIp(10, 60_000, 'auth-register');
  const loginRateLimit = rateLimitByIp(20, 60_000, 'auth-login');
  const meRateLimit = rateLimitByIp(120, 60_000, 'auth-me');

  // Register
  app.post('/register', {
    schema: { body: registerBodySchema },
    preHandler: [registerRateLimit],
  }, async (request, reply) => {
    const { username, email, password, role } = request.body as any;
    const normalizedUsername = normalizeString(username);
    const normalizedEmail = normalizeString(email).toLowerCase();
    const rawPassword = typeof password === 'string' ? password : '';

    if (!normalizedUsername || !normalizedEmail || !rawPassword) {
      return reply.status(400).send({ error: 'username, email and password are required' });
    }
    if (normalizedUsername.length < 3 || normalizedUsername.length > 40) {
      return reply.status(400).send({ error: 'username must be between 3 and 40 characters' });
    }
    if (!EMAIL_RE.test(normalizedEmail)) {
      return reply.status(400).send({ error: 'invalid email format' });
    }
    if (rawPassword.length < 8) {
      return reply.status(400).send({ error: 'password must be at least 8 characters' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] }
    });

    if (existing) {
      return reply.status(409).send({ error: 'User already exists' });
    }

    if (Buffer.byteLength(rawPassword, 'utf8') > 72) return reply.code(400).send({ error: 'A senha deve ter no máximo 72 bytes em UTF-8.' });
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        role: role === 'MASTER' ? 'MASTER' : 'PLAYER',
      },
    });

    const token = app.jwt.sign(
      { id: user.id, username: user.username, role: user.role, sessionVersion: user.sessionVersion },
      { expiresIn: '12h' }
    );

    return reply.status(201).send({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  });

  // Login
  app.post('/login', {
    schema: { body: loginBodySchema },
    preHandler: [loginRateLimit],
  }, async (request, reply) => {
    const { email, password } = request.body as any;
    const normalizedEmail = normalizeString(email).toLowerCase();
    const rawPassword = typeof password === 'string' ? password : '';

    if (!normalizedEmail || !rawPassword) {
      return reply.status(400).send({ error: 'email and password are required' });
    }
    if (!EMAIL_RE.test(normalizedEmail)) {
      return reply.status(400).send({ error: 'invalid email format' });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign(
      { id: user.id, username: user.username, role: user.role, sessionVersion: user.sessionVersion },
      { expiresIn: '12h' }
    );

    return reply.send({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  });

  app.post('/logout', { preHandler: [authGuard] }, async (request, reply) => {
    await prisma.user.update({ where: { id: request.user.id }, data: { sessionVersion: { increment: 1 } } });
    return reply.code(204).send();
  });

  app.post('/forgot-password', {
    schema: { body: { type: 'object', additionalProperties: false, required: ['email'], properties: { email: { type: 'string', minLength: 5, maxLength: 160 } } } },
    preHandler: [rateLimitByIp(5, 15 * 60_000, 'forgot-password')],
  }, async (request, reply) => {
    const email = normalizeString((request.body as { email: string }).email).toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      try { await sendPasswordReset(user.id, user.email); }
      catch { request.log.error('password reset delivery failed; check SMTP configuration'); }
    }
    return reply.code(202).send({ message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' });
  });

  app.post('/reset-password', {
    schema: { body: { type: 'object', additionalProperties: false, required: ['token', 'password'], properties: {
      token: { type: 'string', pattern: '^[a-f0-9]{64}$' }, password: { type: 'string', minLength: 8, maxLength: 72 },
    } } }, preHandler: [rateLimitByIp(10, 15 * 60_000, 'reset-password')],
  }, async (request, reply) => {
    const { token, password } = request.body as { token: string; password: string };
    if (Buffer.byteLength(password, 'utf8') > 72) return reply.code(400).send({ error: 'Senha longa demais.' });
    const tokenHash = hashResetToken(token);
    const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!reset || reset.expiresAt <= new Date()) return reply.code(400).send({ error: 'Link inválido ou expirado.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const changed = await prisma.$transaction(async tx => {
      const consumed = await tx.passwordReset.deleteMany({ where: { tokenHash, expiresAt: { gt: new Date() } } });
      if (!consumed.count) return false;
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      return true;
    });
    if (!changed) return reply.code(400).send({ error: 'Link inválido ou expirado.' });
    return { message: 'Senha atualizada. Entre novamente.' };
  });

  // Get current user
  app.get('/me', { preHandler: [authGuard, meRateLimit] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: (request.user as any).id },
      select: { id: true, username: true, email: true, role: true, createdAt: true }
    });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return reply.send({ user });
  });
}
