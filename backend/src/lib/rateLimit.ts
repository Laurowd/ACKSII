import { FastifyReply, FastifyRequest } from 'fastify'
import { createHash } from 'node:crypto'
import prisma from './prisma'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let nextCleanup = 0

function getKey(request: FastifyRequest, key: string) {
  return createHash('sha256').update(`${key}:${request.ip}`).digest('hex')
}

export function rateLimitByIp(maxRequests: number, windowMs: number, key: string) {
  return async function limiter(request: FastifyRequest, reply: FastifyReply) {
    const now = Date.now()
    const bucketKey = getKey(request, key)
    if (process.env.NODE_ENV === 'production') {
      try {
        const [bucket] = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
          INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt")
          VALUES (${bucketKey}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond')
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= NOW() THEN 1 ELSE LEAST("RateLimitBucket"."count" + 1, ${maxRequests + 1}) END,
            "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= NOW() THEN NOW() + ${windowMs} * INTERVAL '1 millisecond' ELSE "RateLimitBucket"."expiresAt" END
          RETURNING "count", "expiresAt"`
        if (now >= nextCleanup) {
          nextCleanup = now + 60_000
          await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(now) } } })
        }
        if (bucket.count > maxRequests) {
          reply.header('Retry-After', String(Math.max(1, Math.ceil((bucket.expiresAt.getTime() - now) / 1000))))
          return reply.code(429).send({ error: 'Muitas requisições. Aguarde e tente novamente.' })
        }
        return
      } catch (error) {
        request.log.error({ err: error }, 'rate limit storage unavailable')
        return reply.code(503).send({ error: 'Serviço temporariamente indisponível.' })
      }
    }
    if (now >= nextCleanup || buckets.size >= 10000) {
      for (const [id, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(id)
      nextCleanup = now + 60_000
    }
    if (!buckets.has(bucketKey) && buckets.size >= 10000) return reply.code(429).send({ error: 'Muitas requisições.' })
    const current = buckets.get(bucketKey)

    if (!current || current.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs })
      return
    }

    if (current.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
      reply.header('Retry-After', String(retryAfterSec))
      return reply.status(429).send({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      })
    }

    current.count += 1
    buckets.set(bucketKey, current)
  }
}
