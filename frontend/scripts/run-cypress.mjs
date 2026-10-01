import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { preview } from 'vite'

const root = fileURLToPath(new URL('../../', import.meta.url))
// Editors built on Electron may export this; Cypress needs Electron's browser mode.
delete process.env.ELECTRON_RUN_AS_NODE
const { default: cypress } = await import('cypress')
const frontend = resolve(root, 'frontend')
const requireBackend = createRequire(resolve(root, 'backend/package.json'))
const database = new URL(process.env.TEST_DATABASE_URL || 'http://missing')
if (!['postgres:', 'postgresql:'].includes(database.protocol) ||
    !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/acks_test') {
  throw new Error('Defina TEST_DATABASE_URL para um PostgreSQL local com banco acks_test. O Cypress nunca usa backend/.env.')
}
const apiPort = Number(process.env.CYPRESS_API_PORT || 3210)
const webPort = Number(process.env.CYPRESS_WEB_PORT || 4276)
const baseUrl = `http://127.0.0.1:${webPort}`
Object.assign(process.env, {
  DATABASE_URL: database.toString(), NODE_ENV: 'test', JWT_SECRET: randomBytes(32).toString('hex'),
  CORS_ORIGIN: baseUrl, PUBLIC_APP_URL: baseUrl, TRUST_PROXY: '',
  PORT: String(apiPort), TEST_API_PORT: String(apiPort),
})
const mailboxPath = resolve(frontend, 'cypress/.runtime/mail.json')
mkdirSync(resolve(frontend, 'cypress/.runtime'), { recursive: true })
const messages = []
writeFileSync(mailboxPath, '[]')
const { SMTPServer } = requireBackend('smtp-server')
const smtp = new SMTPServer({
  authOptional: true, disabledCommands: ['STARTTLS'],
  onData(stream, session, callback) {
    let raw = ''
    stream.on('data', chunk => { raw += chunk.toString() })
    stream.on('end', () => {
      messages.push({ to: session.envelope.rcptTo.map(to => to.address), raw })
      writeFileSync(mailboxPath, JSON.stringify(messages))
      callback()
    })
  },
})
let app, web
try {
  await new Promise((resolve, reject) => { smtp.once('error', reject); smtp.listen(0, '127.0.0.1', resolve) })
  Object.assign(process.env, {
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.server.address().port),
    SMTP_SECURE: 'false', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'test@cypress.invalid',
  })
  const migration = spawnSync(process.execPath, [requireBackend.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
    { cwd: resolve(root, 'backend'), env: process.env, stdio: 'inherit' })
  if (migration.status !== 0) throw new Error('Falha ao preparar as migrations do banco local de testes.')
  app = requireBackend('./dist/app.js').buildApp(undefined, false)
  await app.listen({ host: '127.0.0.1', port: apiPort })
  web = await preview({ root: frontend, preview: { host: '127.0.0.1', port: webPort, strictPort: true } })
  const options = { project: frontend, config: { baseUrl }, env: { apiUrl: `http://127.0.0.1:${apiPort}` } }
  if (process.argv.includes('--open')) await cypress.open(options)
  else {
    const spec = process.argv.find(arg => arg.startsWith('--spec='))?.slice(7)
    const result = await cypress.run({ ...options, browser: process.env.CYPRESS_BROWSER || 'electron', ...(spec ? { spec } : {}) })
    if (!result || result.status === 'failed' || !result.totalTests) throw new Error('Cypress não executou testes. Verifique o log de inicialização.')
    const summary = { date: new Date().toISOString(), browser: result.browserName, version: result.browserVersion,
      tests: result.totalTests, passed: result.totalPassed, failed: result.totalFailed,
      pending: result.totalPending, skipped: result.totalSkipped,
      specs: result.runs.map(run => ({ file: run.spec.relative, tests: run.tests.map(test => ({
        name: test.title.join(' > '), state: test.state, error: test.displayError?.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 1600),
      })) })),
    }
    writeFileSync(resolve(frontend, 'cypress/results/run-summary.json'), JSON.stringify(summary, null, 2))
    process.exitCode = result.totalFailed || result.totalSkipped || result.totalPending ? 1 : 0
  }
} finally {
  if (web) await new Promise(resolve => web.httpServer.close(resolve))
  if (app) await app.close()
  await new Promise(resolve => smtp.close(resolve))
  rmSync(mailboxPath, { force: true })
}
