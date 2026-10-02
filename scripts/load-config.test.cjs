const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configuration } = require('./run-load.cjs');
const local = { TEST_DATABASE_URL: 'postgresql://acks_test:local@127.0.0.1:55439/acks_test' };
test('load runner refuses remote or implicit databases, including production credentials', () => {
  for (const env of [{}, { DATABASE_URL: local.TEST_DATABASE_URL }, { TEST_DATABASE_URL: 'postgresql://user:pass@production.neon.tech/acks_test' }, { TEST_DATABASE_URL: 'postgresql://user:pass@127.0.0.1/neondb' }, { TEST_DATABASE_URL: 'https://127.0.0.1/acks_test' }]) assert.throws(() => configuration(env), /explicit local PostgreSQL/);
  assert.equal(configuration(local).pool, 3);
});
test('load settings limit actors, rates, duration and pool size before writing fixtures', () => {
  for (const env of [{ LOAD_MAX_VUS: '1000' }, { LOAD_READ_MAX_VUS: '501' }, { LOAD_SECONDS: '0' }, { LOAD_WARMUP_SECONDS: '0' }, { LOAD_POOL: '100' }, { LOAD_API_PORT: '70000' }, { LOAD_PROFILES: 'production' }, { LOAD_RATES: '10,5000' }, { LOAD_SESSION_VUS: '201' }]) assert.throws(() => configuration({ ...local, ...env }), /Invalid/);
  assert.deepEqual(configuration({ ...local, LOAD_PROFILES: 'read,mixed' }).profiles, ['read', 'mixed']);
});
