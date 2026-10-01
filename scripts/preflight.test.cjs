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

const neon = {
  ...valid,
  POSTGRES_PASSWORD: undefined,
  DATABASE_URL: 'postgresql://test:sample@ep-test-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  DIRECT_DATABASE_URL: 'postgresql://test:sample@ep-test.us-east-1.aws.neon.tech/neondb?sslmode=require',
};

test('accepts Neon with pooled runtime and direct migration URLs without a local database password', () => {
  assert.deepEqual(validate(neon, { neon: true }), []);
});

test('rejects insecure Neon URLs, a pooled migration URL and mismatched endpoints', () => {
  for (const DIRECT_DATABASE_URL of [
    neon.DATABASE_URL,
    neon.DIRECT_DATABASE_URL.replace('?sslmode=require', ''),
    neon.DIRECT_DATABASE_URL.replace('ep-test.', 'ep-other.'),
    neon.DIRECT_DATABASE_URL.replace('/neondb?', '/other?'),
    'postgresql://private-password@',
  ]) {
    const errors = validate({ ...neon, DIRECT_DATABASE_URL }, { neon: true });
    assert.ok(errors.length > 0);
    assert.equal(errors.join('\n').includes('private-password'), false);
    assert.equal(errors.join('\n').includes(DIRECT_DATABASE_URL), false);
  }
});

test('validates Vercel runtime settings without local database, ACME or migration credentials', () => {
  const settings = { ...valid, APP_DOMAIN: undefined, ACME_EMAIL: undefined, RELEASE_TAG: undefined, POSTGRES_PASSWORD: undefined,
    DATABASE_URL: neon.DATABASE_URL, CORS_ORIGIN: 'https://acks-app.vercel.app', PUBLIC_APP_URL: 'https://acks-app.vercel.app' };
  assert.deepEqual(validate(settings, { vercel: true }), []);
  for (const PUBLIC_APP_URL of ['http://acks-app.vercel.app', 'https://other.vercel.app', 'https://acks-app.vercel.app/']) {
    assert.ok(validate({ ...settings, PUBLIC_APP_URL }, { vercel: true }).length > 0);
  }
});
