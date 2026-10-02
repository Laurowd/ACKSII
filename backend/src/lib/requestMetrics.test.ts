import { expect, it } from 'vitest'
import { measureDatabase, metricsFields, newRequestMetrics, requestMetrics } from './requestMetrics'
it('isolates concurrent requests and counts failed database operations', async () => {
  const first = newRequestMetrics(), second = newRequestMetrics()
  await Promise.all([
    requestMetrics.run(first, async () => { await measureDatabase(async () => 1); await expect(measureDatabase(async () => { throw Error('db') })).rejects.toThrow('db') }),
    requestMetrics.run(second, async () => { await measureDatabase(async () => 2) }),
  ])
  expect(first.queries).toBe(2); expect(second.queries).toBe(1)
  expect(metricsFields(first).databaseMs).toBeGreaterThanOrEqual(0)
  await expect(measureDatabase(async () => 'outside request')).resolves.toBe('outside request')
})
