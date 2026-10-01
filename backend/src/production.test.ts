import { beforeEach, describe, expect, it, vi } from 'vitest'
const { db } = vi.hoisted(() => ({ db: {
  $queryRaw: vi.fn(), $disconnect: vi.fn(),
  user: { findUnique: vi.fn() }, character: { findUnique: vi.fn(), update: vi.fn() },
} }))
vi.mock('./lib/prisma', () => ({ default: db }))
import { buildApp } from './app'
import { readConfig } from './lib/config'
const config = readConfig({ DATABASE_URL: 'postgresql://unused', JWT_SECRET: 'unit-test-secret' })

describe('Production boundaries', () => {
  beforeEach(() => vi.resetAllMocks())
  it('rejects weak production secrets and unrestricted proxy trust', () => {
    expect(() => readConfig({ NODE_ENV: 'production', JWT_SECRET: 'short' })).toThrow()
    expect(() => readConfig({ DATABASE_URL: 'postgresql://unused', JWT_SECRET: 'unit-test-secret', TRUST_PROXY: 'true' })).toThrow()
  })
  it('keeps liveness available and reports database failures as not ready', async () => {
    const app = buildApp(config, false)
    db.$queryRaw.mockRejectedValue(new Error('private connection details'))
    expect((await app.inject('/api/health')).statusCode).toBe(200)
    const response = await app.inject('/api/ready')
    expect(response.statusCode).toBe(503)
    expect(response.body).not.toContain('private')
    await app.close()
    expect(db.$disconnect).toHaveBeenCalledOnce()
  })
  it('rejects revoked tokens and masks internal errors', async () => {
    const app = buildApp(config, false)
    await app.ready()
    const token = app.jwt.sign({ id: 'u', username: 'test', role: 'PLAYER', sessionVersion: 0 })
    db.user.findUnique.mockResolvedValue({ sessionVersion: 1, role: 'PLAYER' })
    expect((await app.inject({ url: '/api/auth/me', headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(401)
    db.user.findUnique.mockRejectedValue(new Error('secret SQL and credentials'))
    const response = await app.inject({ url: '/api/auth/me', headers: { authorization: `Bearer ${token}` } })
    expect(response.statusCode).toBe(500)
    expect(response.body).not.toContain('secret SQL')
    await app.close()
  })
  it('validates sheet versions and rejects malformed values before writing', async () => {
    const app = buildApp(config, false)
    await app.ready()
    const headers = { authorization: `Bearer ${app.jwt.sign({ id: 'u', username: 'test', role: 'PLAYER', sessionVersion: 0 })}` }
    db.user.findUnique.mockResolvedValue({ sessionVersion: 0, role: 'PLAYER' })
    for (const payload of [{ notes: 'missing version' }, { version: 0, str: -5 }, { version: 0, coinGP: 'not a number' }, { version: 0, hpMax: null }]) {
      expect((await app.inject({ method: 'PUT', url: '/api/characters/c', headers, payload })).statusCode).toBe(400)
    }
    expect(db.character.update).not.toHaveBeenCalled()
    await app.close()
  })
})
