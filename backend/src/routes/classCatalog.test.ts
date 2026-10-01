// Route unit tests isolate session storage; integration tests exercise the real guard.
vi.mock('../middleware/auth', () => ({ authGuard: async (request: any, reply: any) => {
  try { await request.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) }
} }))
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => ({ db: {
  campaign: { findUnique: vi.fn() }, campaignMember: { findUnique: vi.fn() },
  character: { create: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  customClass: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(),
} }))
vi.mock('../lib/prisma', () => ({ default: db }))
import { customClassesRoutes } from './classes'
import { characterCreationRoutes } from './characterCreation'
import { CLASS_CATALOG, progressionFields } from '../lib/classCatalog'

const classBody = { name: 'Guardião', hitDie: '1d8', conBonus: true, xpPerLevel: [0, 2000],
  titles: ['Recruta', 'Guardião'], attackThrows: [10, 9],
  savingThrows: [1, 2].map(level => ({ level, death: 14, paralysis: 13, blast: 15, implements: 16, spells: 17 })),
}
const sheetBody = { characterName: '  Ada  ', classKey: 'catalog:fighter', str: 12, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6 }

async function request(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: unknown, userId: string | null = 'u1') {
  const app = Fastify()
  app.register(jwt, { secret: 'catalog-test-secret' })
  app.register(customClassesRoutes, { prefix: '/api/classes' })
  app.register(characterCreationRoutes, { prefix: '/api/characters' })
  await app.ready()
  try {
    return await app.inject({ method, url, payload: payload as any,
      headers: userId ? { authorization: `Bearer ${app.jwt.sign({ id: userId, username: 'Tester', role: 'PLAYER' })}` } : {},
    })
  } finally { await app.close() }
}

describe('Class catalogue and guided creation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db))
    db.customClass.findMany.mockResolvedValue([])
    db.campaign.findUnique.mockResolvedValue({ id: 'camp1', masterId: 'u1' })
  })

  it('requires authentication for the catalogue', async () => {
    expect((await request('GET', '/api/classes/catalog', undefined, null)).statusCode).toBe(401)
  })
  it('offers base classes without a campaign or a database lookup', async () => {
    const res = await request('GET', '/api/classes/catalog')
    expect(res.statusCode).toBe(200)
    expect(res.json().some((c: any) => c.id === 'catalog:fighter' && c.source === 'catalog')).toBe(true)
    expect(db.customClass.findMany).not.toHaveBeenCalled()
    expect(new Set(CLASS_CATALOG.map(c => c.id)).size).toBe(CLASS_CATALOG.length)
  })
  it('lets the campaign master see custom classes without a membership row', async () => {
    db.customClass.findMany.mockResolvedValue([{ id: 'custom1', name: 'Guardião' }])
    const res = await request('GET', '/api/classes/catalog?campaignId=camp1')
    expect(res.statusCode).toBe(200)
    expect(res.json().at(-1)).toEqual({ id: 'custom1', name: 'Guardião', source: 'campaign' })
    expect(db.campaignMember.findUnique).not.toHaveBeenCalled()
  })
  it('rejects a pending member reading campaign classes', async () => {
    db.campaignMember.findUnique.mockResolvedValue({ status: 'PENDING' })
    expect((await request('GET', '/api/classes/catalog?campaignId=camp1', undefined, 'u2')).statusCode).toBe(403)
    expect(db.customClass.findMany).not.toHaveBeenCalled()
  })
  it('creates the sheet and initial choices together with class-derived values', async () => {
    db.character.create.mockResolvedValue({ id: 'new1' })
    const res = await request('POST', '/api/characters/guided', { ...sheetBody,
      items: [{ name: ' Corda ', quantity: 1, weight: 0.1 }],
      proficiencies: [{ name: ' Ofício ', category: 'general' }],
      level: 14, xp: 999999, saveDeath: 1, userId: 'intruder',
    })
    expect(res.statusCode).toBe(201)
    const data = db.character.create.mock.calls[0]![0].data
    expect(data).toMatchObject({ userId: 'u1', characterName: 'Ada', campaignId: null, level: 1, xp: 0, hpCurr: 6,
      className: 'Fighter', classKey: 'catalog:fighter', ...progressionFields(CLASS_CATALOG.find(c => c.id === 'catalog:fighter')!, 1),
      items: { create: [{ name: 'Corda', quantity: 1, weight: 0.1 }] },
      proficiencies: { create: [
        { name: 'Dungeonbashing', category: 'adventuring', throwTarget: 18 },
        { name: 'Climbing', category: 'adventuring', throwTarget: 8 },
        { name: 'Searching', category: 'adventuring', throwTarget: 18 },
        { name: 'Trapbreaking', category: 'adventuring', throwTarget: 18 },
        { name: 'Listening', category: 'adventuring', throwTarget: 18 },
        { name: 'Ofício', category: 'general' },
      ] },
    })
  })
  it('rejects an invalid attribute before creating anything', async () => {
    expect((await request('POST', '/api/characters/guided', { ...sheetBody, str: 19 })).statusCode).toBe(400)
    expect(db.character.create).not.toHaveBeenCalled()
  })
  it('checks key attributes, racial requirements and initial HP', async () => {
    for (const change of [{ str: 8 }, { hpMax: 1 }, { hpMax: 9 },
      { classKey: 'catalog:dwarven-vaultguard', con: 8 },
      { classKey: 'catalog:nobiran-wonderworker' }]) {
      expect((await request('POST', '/api/characters/guided', { ...sheetBody, ...change })).statusCode).toBe(400)
    }
    expect(db.character.create).not.toHaveBeenCalled()
  })
  it('applies WIL at creation and identifies casters', async () => {
    db.character.create.mockResolvedValue({ id: 'mage' })
    expect((await request('POST', '/api/characters/guided', { ...sheetBody, classKey: 'catalog:mage', hpMax: 4, wil: 18 })).statusCode).toBe(201)
    expect(db.character.create.mock.calls[0]![0].data).toMatchObject({ isSpellcaster: true, saveDeath: 10, saveSpells: 9 })
  })
  it('exposes the six racial level caps', () => {
    for (const [key, maximum] of Object.entries({ 'dwarven-craftpriest': 10, 'dwarven-vaultguard': 13,
      'elven-nightblade': 11, 'elven-spellsword': 10, 'nobiran-wonderworker': 12, 'zaharan-ruinguard': 12 })) {
      expect(JSON.parse(CLASS_CATALOG.find(c => c.id === `catalog:${key}`)!.xpPerLevel)).toHaveLength(maximum)
    }
  })
  it('rejects using a custom class without its campaign', async () => {
    expect((await request('POST', '/api/characters/guided', { ...sheetBody, classKey: 'custom1' })).statusCode).toBe(400)
    expect(db.character.create).not.toHaveBeenCalled()
  })
  it('scopes custom class selection to the campaign', async () => {
    db.customClass.findFirst.mockResolvedValue(null)
    expect((await request('POST', '/api/characters/guided', { ...sheetBody, campaignId: 'camp1', classKey: 'foreign-class' })).statusCode).toBe(400)
    expect(db.customClass.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign-class', campaignId: 'camp1' } })
    expect(db.character.create).not.toHaveBeenCalled()
  })
  it('rejects class editing through a different campaign ID', async () => {
    db.customClass.findFirst.mockResolvedValue(null)
    expect((await request('PUT', '/api/classes/camp1/foreign-class', classBody)).statusCode).toBe(404)
    expect(db.customClass.update).not.toHaveBeenCalled()
  })
  it('rejects inconsistent XP and incomplete progression', async () => {
    for (const bad of [{ xpPerLevel: [0, 0] }, { titles: ['Recruta'] }]) {
      expect((await request('POST', '/api/classes/camp1', { ...classBody, ...bad })).statusCode).toBe(400)
    }
    expect(db.customClass.create).not.toHaveBeenCalled()
  })
  it('blocks non-masters from creating classes', async () => {
    expect((await request('POST', '/api/classes/camp1', classBody, 'u2')).statusCode).toBe(403)
    expect(db.customClass.create).not.toHaveBeenCalled()
  })
  it('renames classes while binding both linked and legacy sheets in one transaction', async () => {
    db.customClass.findFirst.mockResolvedValueOnce({ id: 'custom1', name: 'Nome antigo' }).mockResolvedValueOnce(null)
    db.customClass.update.mockResolvedValue({ id: 'custom1', name: 'Guardião' })
    expect((await request('PUT', '/api/classes/camp1/custom1', classBody)).statusCode).toBe(200)
    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(db.character.updateMany).toHaveBeenCalledWith({ where: { campaignId: 'camp1', OR: [{ classKey: 'custom1' }, { classKey: '', className: 'Nome antigo' }] }, data: { classKey: 'custom1', className: 'Guardião' } })
  })
  it('blocks deletion of a class in use', async () => {
    db.customClass.findFirst.mockResolvedValue({ id: 'custom1', name: 'Guardião' })
    db.character.count.mockResolvedValue(1)
    expect((await request('DELETE', '/api/classes/camp1/custom1')).statusCode).toBe(409)
    expect(db.customClass.delete).not.toHaveBeenCalled()
  })
  it('blocks reducing the class maximum below an existing character level', async () => {
    db.customClass.findFirst.mockResolvedValue({ id: 'custom1', name: 'Guardião' })
    db.character.count.mockResolvedValue(1)
    expect((await request('PUT', '/api/classes/camp1/custom1', classBody)).statusCode).toBe(409)
    expect(db.customClass.update).not.toHaveBeenCalled()
  })
  it('keeps optional tables empty when a class does not use them', async () => {
    db.customClass.create.mockResolvedValue({ id: 'custom1' })
    expect((await request('POST', '/api/classes/camp1', classBody)).statusCode).toBe(201)
    expect(db.customClass.create.mock.calls[0]![0].data).toMatchObject({ thiefSkills: '[]', rebukingUndead: '[]' })
  })
  it('has complete base progressions through each class maximum', () => {
    for (const c of CLASS_CATALOG) {
      const xp = JSON.parse(c.xpPerLevel)
      expect(xp[0]).toBe(0)
      for (const field of ['titles', 'attackThrows', 'savingThrows'] as const) expect(JSON.parse(c[field]).length).toBe(xp.length)
      expect(xp.every((value: number, i: number) => i === 0 || value > xp[i - 1])).toBe(true)
      expect(progressionFields(c, xp.length).xpNext).toBe(0)
    }
  })
})
