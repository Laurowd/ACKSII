// Route unit tests isolate session storage; integration tests exercise the real guard.
vi.mock('../middleware/auth', () => ({ authGuard: async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) }
} }))
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcrypt'

const { prismaMock } = vi.hoisted(() => ({ prismaMock: {
  $transaction: vi.fn(),
  character: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  campaignMember: {
    findUnique: vi.fn(),
  },
  customClass: {
    findFirst: vi.fn(),
  },
  weapon: {
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  campaign: {
    findUnique: vi.fn(),
  },
  campaignActivity: {
    create: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
} as any }))

vi.mock('../lib/prisma', () => ({
  default: prismaMock,
}))

import { characterRoutes } from './characters'
import { campaignsRoutes } from './campaigns'
import { authRoutes } from './auth'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

describe('Routes validation/authz', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback(prismaMock))
  })

  async function buildApp() {
    const app = Fastify()
    app.register(jwt, { secret: 'test-secret' })
    app.register(authRoutes, { prefix: '/api/auth' })
    app.register(characterRoutes, { prefix: '/api/characters' })
    app.register(campaignsRoutes, { prefix: '/api/campaigns' })
    await app.ready()
    return app
  }

  function authHeader(app: Awaited<ReturnType<typeof buildApp>>, user: { id: string; username: string; role: string }) {
    const token = app.jwt.sign(user)
    return { authorization: `Bearer ${token}` }
  }

  it('rejects invalid assignment payload', async () => {
    const app = await buildApp()
    const headers = authHeader(app, { id: 'u1', username: 'user1', role: 'PLAYER' })

    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/ch1/assignment',
      headers,
      payload: [],
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().message).toContain('must be object')
    await app.close()
  })

  it('blocks non-master owner transfer', async () => {
    prismaMock.character.findUnique.mockResolvedValueOnce({
      id: 'ch1',
      userId: 'u1',
      campaignId: null,
    })

    const app = await buildApp()
    const headers = authHeader(app, { id: 'u1', username: 'user1', role: 'PLAYER' })

    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/ch1/assignment',
      headers,
      payload: { userId: 'u2' },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json().error).toBe('Only master can transfer character ownership')
    await app.close()
  })

  it('rejects assignment when target membership is not accepted', async () => {
    prismaMock.character.findUnique.mockResolvedValueOnce({
      id: 'ch1',
      userId: 'u1',
      campaignId: null,
    })
    prismaMock.campaignMember.findUnique.mockResolvedValueOnce(null)
    prismaMock.campaign.findUnique.mockResolvedValueOnce({ id: 'camp1', masterId: 'm1' })

    const app = await buildApp()
    const headers = authHeader(app, { id: 'u1', username: 'user1', role: 'PLAYER' })

    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/ch1/assignment',
      headers,
      payload: { campaignId: 'camp1' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Character owner must be an accepted member of the target campaign')
    await app.close()
  })

  it('rejects join code with invalid format', async () => {
    const app = await buildApp()
    const headers = authHeader(app, { id: 'u1', username: 'user1', role: 'PLAYER' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/campaigns/join',
      headers,
      payload: { joinCode: 'abc' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().message).toContain('joinCode')
    await app.close()
  })

  it('rejects invalid optionalRules payload on settings update', async () => {
    prismaMock.campaign.findUnique.mockResolvedValueOnce({ id: 'camp1', masterId: 'm1' })

    const app = await buildApp()
    const headers = authHeader(app, { id: 'm1', username: 'master', role: 'MASTER' })

    const res = await app.inject({
      method: 'PUT',
      url: '/api/campaigns/camp1/settings',
      headers,
      payload: { optionalRules: { enableDomainEconomy: 'yes' } },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().message).toContain('enableDomainEconomy')
    await app.close()
  })

  it('rejects invalid activity type', async () => {
    prismaMock.campaign.findUnique.mockResolvedValueOnce({ id: 'camp1', masterId: 'm1' })

    const app = await buildApp()
    const headers = authHeader(app, { id: 'm1', username: 'master', role: 'MASTER' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/campaigns/camp1/activities',
      headers,
      payload: { title: 'Tarefa', type: 'hack', durationWeeks: 2 },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Invalid activity type')
    await app.close()
  })

  it('registers a user with normalized email', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)
    ;(bcrypt.hash as any).mockResolvedValueOnce('hashed-pass')
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'u10',
      username: 'player10',
      email: 'player10@email.com',
      role: 'PLAYER',
    })

    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'player10',
        email: 'Player10@Email.com',
        password: '12345678',
      },
    })

    expect(res.statusCode).toBe(201)
    const createCall = prismaMock.user.create.mock.calls[0]?.[0]
    expect(createCall.data.email).toBe('player10@email.com')
    await app.close()
  })

  it('rejects login with invalid body format', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'bad-format', password: '12345678' },
    })

    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('updates assignment when membership is accepted', async () => {
    prismaMock.character.findUnique.mockResolvedValueOnce({
      id: 'ch1',
      userId: 'u1',
      campaignId: null,
    })
    prismaMock.campaignMember.findUnique.mockResolvedValueOnce({
      campaignId: 'camp1',
      userId: 'u1',
      status: 'ACCEPTED',
    })
    prismaMock.campaign.findUnique.mockResolvedValueOnce({ id: 'camp1', masterId: 'm1' })
    prismaMock.character.update.mockResolvedValueOnce({
      id: 'ch1',
      userId: 'u1',
      campaignId: 'camp1',
    })

    const app = await buildApp()
    const headers = authHeader(app, { id: 'u1', username: 'user1', role: 'PLAYER' })

    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/ch1/assignment',
      headers,
      payload: { campaignId: 'camp1' },
    })

    expect(res.statusCode, res.body).toBe(200)
    expect(prismaMock.character.update).toHaveBeenCalled()
    await app.close()
  })

  it('blocks a master from reading a character from another campaign', async () => {
    prismaMock.character.findUnique.mockResolvedValueOnce({
      id: 'ch1',
      userId: 'u1',
      campaignId: 'camp1',
    })
    prismaMock.campaign.findUnique.mockResolvedValueOnce({ id: 'camp1', masterId: 'm1' })

    const app = await buildApp()
    const headers = authHeader(app, { id: 'm2', username: 'other-master', role: 'MASTER' })
    const res = await app.inject({
      method: 'GET',
      url: '/api/characters/ch1',
      headers,
    })

    expect(res.statusCode).toBe(403)
    await app.close()
  })

  it('allows the campaign master to read a campaign character', async () => {
    prismaMock.character.findUnique.mockResolvedValueOnce({
      id: 'ch1',
      userId: 'u1',
      campaignId: 'camp1',
    })
    prismaMock.campaign.findUnique.mockResolvedValueOnce({ id: 'camp1', masterId: 'm1' })

    const app = await buildApp()
    const headers = authHeader(app, { id: 'm1', username: 'master', role: 'MASTER' })
    const res = await app.inject({
      method: 'GET',
      url: '/api/characters/ch1',
      headers,
    })

    expect(res.statusCode, res.body).toBe(200)
    await app.close()
  })

  it('requires an award identifier to prevent duplicate treasure XP', async () => {
    prismaMock.character.findUnique.mockResolvedValueOnce({
      id: 'ch1',
      userId: 'u1',
      campaignId: null,
    })
    prismaMock.character.updateMany.mockResolvedValueOnce({ count: 0 })

    const app = await buildApp()
    const headers = authHeader(app, { id: 'u1', username: 'user1', role: 'PLAYER' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/characters/ch1/treasure/convert-xp',
      headers,
      payload: { gp: 1000 },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().message).toContain('awardId')
    await app.close()
  })

  it('looks up class progression by class name', async () => {
    const existing = {
      version: 0,
      id: 'ch1',
      userId: 'u1',
      campaignId: 'camp1',
      className: 'Old Class',
      level: 2,
    }
    prismaMock.character.findUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({ ...existing, className: 'Fighter', title: 'Veteran' })
    prismaMock.character.update.mockResolvedValueOnce({ ...existing, className: 'Fighter' })
    prismaMock.customClass.findFirst.mockResolvedValueOnce(null)

    const app = await buildApp()
    const headers = authHeader(app, { id: 'u1', username: 'user1', role: 'PLAYER' })
    const res = await app.inject({
      method: 'PUT',
      url: '/api/characters/ch1',
      headers,
      payload: { className: 'Fighter', version: 0 },
    })

    expect(res.statusCode, res.body).toBe(200)
    expect(prismaMock.customClass.findFirst).toHaveBeenCalledWith({
      where: { campaignId: 'camp1', name: 'Fighter' },
    })
    await app.close()
  })
})
