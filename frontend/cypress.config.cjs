const { defineConfig } = require('cypress')
const { createRequire } = require('node:module')
const { randomUUID } = require('node:crypto')
const { readFileSync } = require('node:fs')
const backend = createRequire(require('node:path').resolve(__dirname, '../backend/package.json'))

module.exports = defineConfig({
  viewportWidth: 1440,
  viewportHeight: 1000,
  defaultCommandTimeout: 10000,
  requestTimeout: 15000,
  video: false,
  screenshotOnRunFailure: true,
  retries: 0,
  reporter: 'junit',
  reporterOptions: { mochaFile: 'cypress/results/results-[hash].xml', toConsole: false },
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on) {
      const url = new URL(process.env.TEST_DATABASE_URL || 'http://missing')
      if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
          !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test' || !process.env.JWT_SECRET) {
        throw new Error('Execute npm run test:cypress com TEST_DATABASE_URL local; não aponte o Cypress para dados reais.')
      }
      const { PrismaClient } = backend('@prisma/client')
      const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } })
      const sign = backend('fast-jwt').createSigner({ key: process.env.JWT_SECRET, expiresIn: '1h' })
      const bcrypt = backend('bcrypt')
      on('task', {
        async user(role = 'PLAYER') {
          const suffix = randomUUID().slice(0, 12)
          const password = 'Cypress-test-password1'
          const user = await prisma.user.create({ data: {
            username: `cy_${suffix}`, email: `cy_${suffix}@test.invalid`, role,
            passwordHash: await bcrypt.hash(password, 4),
          }, select: { id: true, username: true, email: true, role: true, sessionVersion: true } })
          return { user, password, token: sign(user) }
        },
        resetLink(email) {
          const messages = JSON.parse(readFileSync(require('node:path').resolve(__dirname, 'cypress/.runtime/mail.json'), 'utf8'))
          const message = messages.findLast(message => message.to.includes(email))
          if (!message) throw new Error('Nenhum e-mail recebido pelo SMTP local para este usuário.')
          const raw = message.raw.replace(/=\r?\n/g, '').replace(/=3D/g, '=')
          const link = raw.match(/http:\/\/127\.0\.0\.1:\d+\/reset-password#[a-f0-9]{64}/)?.[0]
          if (!link) throw new Error('E-mail local não contém link de recuperação válido.')
          return link
        },
      })
      on('after:run', () => prisma.$disconnect())
    },
  },
})
