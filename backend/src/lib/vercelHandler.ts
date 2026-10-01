import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import type { FastifyInstance, InjectOptions } from 'fastify'

type PlatformRequest = IncomingMessage & { body?: unknown }
const bodyLimit = 256 * 1024

async function payload(request: PlatformRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method || 'GET')) return undefined
  if (request.body !== undefined) {
    const body = Buffer.isBuffer(request.body) ? request.body : typeof request.body === 'string' ? Buffer.from(request.body) : Buffer.from(JSON.stringify(request.body))
    if (body.length > bodyLimit) throw Object.assign(new Error('Payload too large'), { statusCode: 413 })
    return body
  }
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > bodyLimit) throw Object.assign(new Error('Payload too large'), { statusCode: 413 })
    chunks.push(buffer)
  }
  return size ? Buffer.concat(chunks) : undefined
}

export function createVercelHandler(createApp: () => FastifyInstance, environment: NodeJS.ProcessEnv = process.env) {
  let application: Promise<FastifyInstance> | undefined
  return async function handler(request: PlatformRequest, response: ServerResponse) {
    try {
      // One instance/connection pool per warm function, shared by concurrent calls.
      if (!application) application = Promise.resolve().then(async () => {
        const app = createApp()
        await app.ready()
        return app
      }).catch(error => { application = undefined; throw error })
      const app = await application
      let remoteAddress = request.socket?.remoteAddress || '127.0.0.1'
      // Vercel overwrites this header at its trusted edge. Local callers cannot
      // supply an IP override unless the process actually runs on Vercel.
      const forwarded = request.headers['x-forwarded-for']
      const candidate = typeof forwarded === 'string' ? forwarded.trim() : ''
      if (environment.VERCEL === '1' && isIP(candidate)) remoteAddress = candidate
      const headers = { ...request.headers }
      delete headers['x-forwarded-for']
      delete headers['x-real-ip']
      delete headers['forwarded']
      delete headers['content-length']
      delete headers['transfer-encoding']
      const result = await app.inject({ method: (request.method || 'GET') as InjectOptions['method'],
        url: request.url || '/', headers, payload: await payload(request), remoteAddress })
      response.statusCode = result.statusCode
      for (const [name, value] of Object.entries(result.headers)) if (value !== undefined) response.setHeader(name, value)
      response.end(result.rawPayload)
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode === 413 ? 413 : 500
      if (statusCode === 500) console.error('Vercel request failed', error)
      response.statusCode = statusCode
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      response.end(JSON.stringify({ error: statusCode === 413 ? 'Dados enviados excedem o limite permitido.' : 'Erro interno. Tente novamente.' }))
    }
  }
}
