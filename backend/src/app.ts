import Fastify, { FastifyError, LogController } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import prisma from './lib/prisma'
import { readConfig } from './lib/config'
import { authRoutes } from './routes/auth'
import { characterRoutes } from './routes/characters'
import { characterCreationRoutes } from './routes/characterCreation'
import { campaignsRoutes } from './routes/campaigns'
import { campaignSpellsRoutes } from './routes/campaignSpells'
import { customClassesRoutes } from './routes/classes'
import { compendiumRoutes } from './routes/compendium'
import { rulesRoutes } from './routes/rules'
import { gameRulesRoutes } from './routes/gameRules'
import { campaignRuleRoutes } from './routes/campaignRules'
import { classBuilderRoutes } from './routes/classBuilder'
import { sessionRoutes } from './routes/session'
import { characterImportRoutes } from './routes/characterImport'
import { requestMetrics, newRequestMetrics, metricsFields, type RequestMetrics } from './lib/requestMetrics'

export function buildApp(config = readConfig(), logger = true) {
  const app = Fastify({
    logController: new LogController({ disableRequestLogging: true }),
    logger: logger ? { redact: ['req.headers.authorization', 'req.headers.cookie'], level: process.env.LOG_LEVEL || 'info' } : false,
    trustProxy: config.trustProxy, bodyLimit: 256 * 1024, requestTimeout: 30_000, connectionTimeout: 10_000,
    ajv: { customOptions: { coerceTypes: false } },
  })
  app.register(cors, { origin: config.origin })
  app.register(jwt, { secret: config.secret })
  const measurements = new WeakMap<object, RequestMetrics>()
  app.addHook('onRequest', (request, _reply, done) => {
    const metrics = newRequestMetrics()
    measurements.set(request, metrics)
    requestMetrics.run(metrics, done)
  })
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff').header('Cache-Control', 'no-store')
    const metrics = measurements.get(request)
    if (metrics) {
      const { durationMs, databaseMs } = metricsFields(metrics)
      reply.header('Server-Timing', `app;dur=${durationMs}, db;dur=${databaseMs}`)
    }
  })
  app.addHook('onResponse', async (request, reply) => {
    const metrics = measurements.get(request)
    if (!metrics) return
    const fields = { event: 'request_metrics', route: request.routeOptions.url || 'unmatched', method: request.method, statusCode: reply.statusCode, requestId: request.id, ...metricsFields(metrics) }
    if (fields.durationMs >= 1000 || fields.statusCode >= 500) request.log.warn(fields, 'slow or failed request')
    else request.log.info(fields, 'request metrics')
    measurements.delete(request)
  })
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.code === 'P2034') return reply.code(409).send({ code: 'CHARACTER_CONFLICT', error:'Houve uma alteração concorrente. Atualize a ficha e tente novamente.' })
    if (error.code === 'P2002') return reply.code(409).send({ error: 'Este registro já existe.' })
    if (error.code === 'P2025') return reply.code(404).send({ error: 'Registro não encontrado.' })
    if (error.validation) return reply.code(400).send({ error: 'Dados inválidos.', message: error.message })
    const status = error.statusCode || 500
    if (status >= 500) {
      request.log.error({ err: error, requestId: request.id }, 'request failed')
      return reply.code(500).send({ error: 'Erro interno. Tente novamente.', requestId: request.id })
    }
    return reply.code(status).send({ error: error.message, ...(error.code ? { code: error.code } : {}) })
  })
  app.get('/api/health', async () => ({ status: 'ok' }))
  app.get('/api/ready', async (request, reply) => {
    try { await prisma.$queryRaw`SELECT 1`; return { status: 'ok' } }
    catch (error) { request.log.error({ err: error }, 'database unavailable'); return reply.code(503).send({ status: 'unavailable' }) }
  })
  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(characterRoutes, { prefix: '/api/characters' })
  app.register(characterCreationRoutes, { prefix: '/api/characters' })
  app.register(characterImportRoutes, { prefix: '/api/characters' })
  app.register(campaignsRoutes, { prefix: '/api/campaigns' })
  app.register(campaignSpellsRoutes, { prefix: '/api/campaigns' })
  app.register(customClassesRoutes, { prefix: '/api/classes' })
  app.register(compendiumRoutes, { prefix: '/api/compendium' })
  app.register(rulesRoutes, { prefix: '/api/rules' })
  app.register(gameRulesRoutes, { prefix: '/api/game-rules' })
  app.register(campaignRuleRoutes, { prefix: '/api/campaign-rules' })
  app.register(classBuilderRoutes, { prefix: '/api/class-builder' })
  app.register(sessionRoutes, { prefix: '/api/session' })
  // Fastify drains active requests before running onClose.
  app.addHook('onClose', async () => { await prisma.$disconnect() })
  return app
}
