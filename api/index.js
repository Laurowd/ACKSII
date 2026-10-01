process.env.NODE_ENV = 'production'
const { buildApp } = require('../backend/dist/app')
const { readConfig } = require('../backend/dist/lib/config')
const { createVercelHandler } = require('../backend/dist/lib/vercelHandler')

// Vercel's edge supplies the client IP; the handler passes it directly to
// Fastify. No generic trust in client-supplied proxy headers is enabled.
module.exports = createVercelHandler(() => buildApp({ ...readConfig(), trustProxy: false }))
