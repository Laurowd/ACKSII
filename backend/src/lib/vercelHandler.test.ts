import Fastify from 'fastify'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { createVercelHandler } from './vercelHandler'

const instances: ReturnType<typeof Fastify>[] = []
function application() {
  const app = Fastify({ bodyLimit: 256 * 1024 })
  instances.push(app)
  app.get('/api/health', async () => ({ status: 'ok' }))
  app.post('/api/echo', { schema: { body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } }, async request => ({ body: request.body, ip: request.ip, authorization: request.headers.authorization }))
  app.get('/api/who', async request => ({ ip: request.ip, q: request.query }))
  return app
}
afterEach(async () => { await Promise.all(instances.splice(0).map(app => app.close())) })

async function call(handler: ReturnType<typeof createVercelHandler>, { method = 'GET', url = '/api/health', body, raw = '', headers = {} }: { method?: string; url?: string; body?: unknown; raw?: string; headers?: Record<string, string> } = {}) {
  const request = Readable.from(raw ? [Buffer.from(raw)] : []) as IncomingMessage & { body?: unknown }
  request.method = method
  request.url = url
  request.headers = headers
  if (body !== undefined) request.body = body
  Object.defineProperty(request, 'socket', { value: { remoteAddress: '127.0.0.1' } })
  const response = { statusCode: 0, headers: {} as Record<string, unknown>, data: Buffer.alloc(0),
    setHeader(name: string, value: unknown) { this.headers[name.toLowerCase()] = value },
    end(value: string | Buffer) { this.data = Buffer.from(value) } }
  await handler(request, response as unknown as ServerResponse)
  return { status: response.statusCode, headers: response.headers, body: JSON.parse(response.data.toString()) }
}

describe('Vercel HTTP adapter', () => {
  it('shares one ready application across concurrent warm requests', async () => {
    let created = 0
    const handler = createVercelHandler(() => { created++; return application() }, {})
    const responses = await Promise.all([call(handler), call(handler), call(handler)])
    expect(created).toBe(1)
    expect(responses.every(response => response.status === 200 && response.body.status === 'ok')).toBe(true)
  })

  it('preserves JSON, authorization, query paths and schema validation after platform body parsing', async () => {
    const handler = createVercelHandler(application, {})
    const headers = { 'content-type': 'application/json', authorization: 'Bearer test-token', 'content-length': '999' }
    const response = await call(handler, { method: 'POST', url: '/api/echo', body: { name: 'Hero' }, headers })
    expect(response.status).toBe(200)
    expect(response.body.body).toEqual({ name: 'Hero' })
    expect(response.body.authorization).toBe('Bearer test-token')
    expect((await call(handler, { method: 'POST', url: '/api/echo', body: {}, headers })).status).toBe(400)
    expect((await call(handler, { url: '/api/who?q=spell' })).body.q).toEqual({ q: 'spell' })
    expect((await call(handler, { url: '/api/unknown' })).status).toBe(404)
  })

  it('accepts a raw request stream when the platform has not parsed it', async () => {
    const response = await call(createVercelHandler(application, {}), { method: 'POST', url: '/api/echo', raw: '{"name":"Hero"}', headers: { 'content-type': 'application/json' } })
    expect(response.status).toBe(200)
    expect(response.body.body.name).toBe('Hero')
  })

  it('rejects oversized bodies before injecting them into Fastify', async () => {
    const handler = createVercelHandler(application, {})
    for (const input of [{ body: { name: 'x'.repeat(256 * 1024) } }, { raw: 'x'.repeat(256 * 1024 + 1) }]) {
      const response = await call(handler, { method: 'POST', url: '/api/echo', ...input })
      expect(response.status).toBe(413)
      expect(response.headers['cache-control']).toBe('no-store')
    }
  })

  it('uses edge-provided IPs only on Vercel and ignores invalid or spoofed local overrides', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.7' }
    expect((await call(createVercelHandler(application, {}), { url: '/api/who', headers })).body.ip).toBe('127.0.0.1')
    const handler = createVercelHandler(application, { VERCEL: '1' })
    expect((await call(handler, { url: '/api/who', headers })).body.ip).toBe('203.0.113.7')
    expect((await call(handler, { url: '/api/who', headers: { 'x-forwarded-for': 'bad, forged' } })).body.ip).toBe('127.0.0.1')
  })
})
