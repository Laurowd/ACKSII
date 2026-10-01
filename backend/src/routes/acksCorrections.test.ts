// Route unit tests isolate session storage; integration tests exercise the real guard.
vi.mock('../middleware/auth', () => ({ authGuard: async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) }
} }))
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const { db } = vi.hoisted(() => ({ db: {
  character: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  campaign: { findUnique: vi.fn() }, customClass: { findFirst: vi.fn() }, auditLog: { create: vi.fn() },
  weapon: { create: vi.fn(), updateMany: vi.fn() }, item: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  proficiency: { findFirst: vi.fn(), update: vi.fn() }, domain: { findUnique: vi.fn(), upsert: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn(),
} }))
vi.mock('../lib/prisma', () => ({ default: db }))
import { characterRoutes } from './characters'
const character = { version: 0, id: 'c', userId: 'u', campaignId: null, classKey: 'catalog:fighter', className: 'Fighter', level: 1,
  str: 10, dex: 10, wil: 10, acAdjustment: 0, coinGP: 20, coinSP: 0, coinCP: 0, xp: 0, xpFromTreasure: 0,
  saveDeath: 14, saveParalysis: 13, saveBlast: 15, saveImplements: 16, saveSpells: 17 }
async function request(method: 'POST' | 'PUT', url: string, payload: any, userId = 'u') {
  const app = Fastify()
  app.register(jwt, { secret: 'acks-regression' })
  app.register(characterRoutes, { prefix: '/api/characters' })
  await app.ready()
  try { return await app.inject({ method, url: '/api/characters/c' + url, payload: { version: 0, ...payload },
    headers: { authorization: `Bearer ${app.jwt.sign({ id: userId, role: 'PLAYER' })}` } }) }
  finally { await app.close() }
}
describe('ACKS II corrections through the API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    db.character.findUnique.mockResolvedValue({ ...character })
    db.character.findUniqueOrThrow.mockResolvedValue({ ...character })
    db.character.update.mockImplementation(async ({ data }: any) => ({ ...character, ...data }))
    db.character.updateMany.mockResolvedValue({ count: 1 })
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db))
  })
  it('directs legacy treasure awards to adventure settlement without changing XP', async () => {
    const response = await request('POST', '/treasure/convert-xp', { awardId: 'session-1', gp: 100 })
    expect(response.statusCode).toBe(409)
    expect(response.json().code).toBe('USE_ADVENTURE_SETTLEMENT')
    expect(db.character.update).not.toHaveBeenCalled()
  })
  it('buys an item with integer coin change at the server price', async () => {
    db.item.create.mockResolvedValue({ id: 'item' })
    db.character.findUniqueOrThrow.mockResolvedValueOnce({ ...character }).mockResolvedValue({ ...character, coinGP: 19, coinSP: 9, version: 1 })
    const res = await request('POST', '/shop/purchase', { entryId: 'i-torch' })
    expect(res.statusCode).toBe(201)
    expect(res.json().character).toMatchObject({ coinGP: 19, coinSP: 9, coinCP: 0 })
    expect(db.item.create).toHaveBeenCalledOnce()
    expect(db.$transaction).toHaveBeenCalledOnce()
  })
  it('does not create inventory after insufficient balance or a concurrent debit', async () => {
    db.character.findUniqueOrThrow.mockResolvedValueOnce({ ...character, coinGP: 0 })
    expect((await request('POST', '/shop/purchase', { entryId: 'w-sword' })).statusCode).toBe(409)
    db.character.updateMany.mockResolvedValueOnce({ count: 0 })
    expect((await request('POST', '/shop/purchase', { entryId: 'w-sword' })).statusCode).toBe(409)
    expect(db.weapon.create).not.toHaveBeenCalled()
  })
  it('scopes proficiency edits to the character and saves zero throw values', async () => {
    db.proficiency.findFirst.mockResolvedValueOnce(null)
    expect((await request('PUT', '/proficiencies/foreign', { name: 'Test' })).statusCode).toBe(404)
    db.proficiency.findFirst.mockResolvedValueOnce({ id: 'p' })
    expect((await request('PUT', '/proficiencies/p', { name: 'Test', throwTarget: 0, category: 'class' })).statusCode).toBe(200)
    expect(db.proficiency.update).toHaveBeenCalledWith({ where: { id: 'p' }, data: { name: 'Test', throwTarget: 0, category: 'class' } })
    expect((await request('PUT', '/proficiencies/p', { name: 'Test' }, 'other')).statusCode).toBe(403)
  })
  it('persists domain family parameters, zero taxes and server-calculated land', async () => {
    db.domain.findUnique.mockResolvedValue(null)
    db.domain.upsert.mockImplementation(async ({ create }: any) => create)
    const res = await request('PUT', '/domain', { peasantFamilies: 100, revenuePerFamily: 6, taxPerFamily: 0, taxRate: 0, landRevenue: 999 })
    expect(res.statusCode).toBe(200)
    expect(res.json().domain).toMatchObject({ peasantFamilies: 100, revenuePerFamily: 6, taxPerFamily: 0, taxRate: 0, landRevenue: 600 })
  })
  it('preserves manual saves on unrelated updates and applies a WIL delta once', async () => {
    db.character.findUnique.mockResolvedValue({ ...character, saveDeath: 12 })
    expect((await request('PUT', '', { notes: 'new', level: 1, classKey: 'catalog:fighter', saveDeath: 12 })).statusCode).toBe(200)
    expect(db.character.update.mock.calls[0]![0].data.saveDeath).toBe(12)
    db.character.update.mockClear()
    expect((await request('PUT', '', { wil: 18, saveDeath: 12 })).statusCode).toBe(200)
    expect(db.character.update.mock.calls[0]![0].data.saveDeath).toBe(9)
  })
})
