const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ORIGIN, configuration } = require('./production-load-config.cjs');
test('production load requires exact acknowledgement and bounded request budget', () => {
  for (const env of [{}, { ACKS_PRODUCTION_LOAD_ACK: 'true' }, { ACKS_PRODUCTION_LOAD_ACK: 'https://other.vercel.app' }]) assert.throws(() => configuration(env), /acknowledgement/);
  const ack = { ACKS_PRODUCTION_LOAD_ACK: ORIGIN };
  assert.equal(configuration(ack).origin, ORIGIN);
  for (const settings of [{ LOAD_SECONDS: '90' }, { LOAD_RATES: '41' }, { LOAD_SESSION_VUS: '41' }, { LOAD_SECONDS: '60' }, { LOAD_PROFILES: 'unbounded' }, { LOAD_RATES: '1,NaN' }]) assert.throws(() => configuration({ ...ack, ...settings }), /configuration|budget/);
});
