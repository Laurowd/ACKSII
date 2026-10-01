const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseEnv, validate } = require('./preflight.cjs');

const valid = {
  APP_DOMAIN: 'sheet.acks-ci.net',
  ACME_EMAIL: 'ops@acks-ci.net',
  RELEASE_TAG: '2026.10.01-1',
  POSTGRES_PASSWORD: 'a1'.repeat(32),
  JWT_SECRET: 'b2'.repeat(32),
  SMTP_HOST: 'smtp.acks-ci.net',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_FROM: 'ACKS <noreply@acks-ci.net>',
  SMTP_USER: 'mailer',
  SMTP_PASS: 'test-only',
};

test('accepts a complete production configuration', () => {
  assert.deepEqual(validate(valid), []);
});

test('rejects placeholders, reused secrets and incomplete SMTP credentials without echoing values', () => {
  const secret = 'c3'.repeat(32);
  const errors = validate({
    ...valid,
    APP_DOMAIN: 'sheet.example.com',
    ACME_EMAIL: 'admin@example.com',
    POSTGRES_PASSWORD: secret,
    JWT_SECRET: secret,
    SMTP_USER: 'mailer',
    SMTP_PASS: '',
  });
  assert.ok(errors.length >= 4);
  assert.equal(errors.join('\n').includes(secret), false);
});

test('parses comments and reports duplicate keys', () => {
  const parsed = parseEnv('APP_DOMAIN=sheet.acks-ci.net # comment\nAPP_DOMAIN=duplicate\nSMTP_SECURE="false"\n');
  assert.equal(parsed.values.APP_DOMAIN, 'sheet.acks-ci.net');
  assert.equal(parsed.values.SMTP_SECURE, 'false');
  assert.equal(parsed.errors.length, 1);
});
