import dotenv from 'dotenv'
import path from 'node:path'
import prisma from './lib/prisma'
import { buildApp } from './app'
import { readConfig } from './lib/config'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
const config = readConfig()
const app = buildApp(config)
let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  const timeout = setTimeout(() => process.exit(1), 25_000)
  timeout.unref()
  try { await app.close() }
  catch (error) { app.log.error(error); process.exitCode = 1 }
  finally { clearTimeout(timeout) }
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
async function start() {
  try {
    await prisma.$connect()
    await app.listen({ port: config.port, host: '0.0.0.0' })
  } catch (error) {
    app.log.error(error)
    await app.close()
    process.exitCode = 1
  }
}
void start()
