import { AsyncLocalStorage } from 'node:async_hooks'
import { performance } from 'node:perf_hooks'

export interface RequestMetrics { started: number; databaseMs: number; queries: number }
export const requestMetrics = new AsyncLocalStorage<RequestMetrics>()
export const newRequestMetrics = (): RequestMetrics => ({ started: performance.now(), databaseMs: 0, queries: 0 })
export async function measureDatabase<T>(query: () => PromiseLike<T>): Promise<T> {
  const metrics = requestMetrics.getStore()
  if (!metrics) return await query()
  const started = performance.now()
  try { return await query() }
  finally { metrics.queries++; metrics.databaseMs += performance.now() - started }
}
export function metricsFields(metrics: RequestMetrics) {
  return { durationMs: Math.round((performance.now() - metrics.started) * 10) / 10, databaseMs: Math.round(metrics.databaseMs * 10) / 10, queries: metrics.queries }
}
