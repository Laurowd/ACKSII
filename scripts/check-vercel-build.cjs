// Loads the actual Vercel entrypoint after compilation. Uses only a dummy local
// DB URL; health and unauthenticated requests never open a database connection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { randomBytes } = require('node:crypto');
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/acks_test';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.CORS_ORIGIN = 'https://build-check.invalid';
process.env.PUBLIC_APP_URL = process.env.CORS_ORIGIN;
const handler = require('../api/index.js');
const root = path.resolve(__dirname, '..');

async function request(url) {
  const input = Readable.from([]);
  input.method = 'GET'; input.url = url; input.headers = {};
  Object.defineProperty(input, 'socket', { value: { remoteAddress: '127.0.0.1' } });
  const result = { statusCode: 0, headers: {}, setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = JSON.parse(body.toString()); } };
  await handler(input, result);
  return result;
}
async function main() {
  assert.ok(fs.existsSync(path.join(root, 'frontend/dist/index.html')), 'Frontend build is missing');
  assert.ok(fs.readdirSync(path.join(root, 'frontend/dist/assets')).some(file => file.endsWith('.js')), 'Frontend scripts are missing');
  const health = await request('/api/health');
  assert.equal(health.statusCode, 200);
  assert.equal(health.body.status, 'ok');
  assert.equal(health.headers['cache-control'], 'no-store');
  assert.equal((await request('/api/characters')).statusCode, 401);
  assert.equal((await request('/api/nonexistent')).statusCode, 404);
  console.log('Vercel entrypoint, static build, health, authorization and API routing: OK. No database was contacted.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
