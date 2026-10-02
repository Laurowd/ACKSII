const assert = require('node:assert/strict');
const { test } = require('node:test');
const { checkApplication, checkBackup } = require('./monitor-production.cjs');
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
function applicationFetch(overrides = {}) {
  return async input => {
    const pathname = new URL(input).pathname;
    if (overrides[pathname]) return overrides[pathname]();
    return pathname === '/login'
      ? new Response('<div id="app"></div>', { headers: { 'content-type': 'text/html', 'x-content-type-options': 'nosniff' } })
      : new Response(JSON.stringify(pathname === '/api/characters' ? { error: 'Unauthorized' } : { status: 'ok' }), { status: pathname === '/api/characters' ? 401 : 200, headers });
  };
}
test('accepts a healthy application and rejects unavailable DB, public characters and API-to-SPA routing regressions', async () => {
  await checkApplication('https://acksii.vercel.app', applicationFetch());
  for (const overrides of [
    { '/api/ready': () => new Response('{"status":"unavailable"}', { status: 503, headers }) },
    { '/api/characters': () => new Response('[]', { status: 200, headers }) },
    { '/api/health': () => new Response('<div id="app"></div>', { headers: { ...headers, 'content-type': 'text/html' } }) },
    { '/api/health': () => new Response('{"status":"ok"}', { headers: { ...headers, 'cache-control': 'public' } }) },
  ]) await assert.rejects(checkApplication('https://acksii.vercel.app', applicationFetch(overrides)));
});
test('refuses insecure or malformed monitor origins before making requests', async () => {
  const failFetch = () => { throw new Error('Should not request'); };
  for (const url of ['http://acksii.vercel.app', 'https://acksii.vercel.app/', 'https://user:secret@acksii.vercel.app']) await assert.rejects(checkApplication(url, failFetch), /HTTPS origin/);
});

test('returns endpoint latencies and rejects sustained slow responses', async () => {
  let time = 0;
  const measurements = await checkApplication('https://acksii.vercel.app', applicationFetch(), { clock: () => (time += 25), maxDurationMs: 100 });
  assert.equal(measurements.length, 4);
  assert.equal(measurements[1].pathname, '/api/ready');
  assert.equal(measurements[1].durationMs, 25);
  await assert.rejects(checkApplication('https://acksii.vercel.app', applicationFetch(), { clock: () => (time += 101), maxDurationMs: 100 }), /limit 100 ms/);
});
test('accepts a recent verified backup but rejects stale runs, expired artifacts and unavailable metadata', async () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  const env = { GITHUB_TOKEN: 'test-token', GITHUB_REPOSITORY: 'Laurowd/ACKSII' };
  function fetcher({ age = 1, artifact = true, expired = false, status = 200 } = {}) {
    return async (url, options) => {
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return new Response(JSON.stringify(url.includes('/artifacts')
        ? { artifacts: artifact ? [{ name: 'neon-encrypted-1-1', expired, size_in_bytes: 123, expires_at: new Date(now + 24 * 60 * 60 * 1000).toISOString() }] : [] }
        : { workflow_runs: [{ id: 1, created_at: new Date(now - age * 60 * 60 * 1000).toISOString() }] }), { status });
    };
  }
  await checkBackup(env, fetcher(), now);
  for (const options of [{ age: 37 }, { artifact: false }, { expired: true }, { status: 403 }]) await assert.rejects(checkBackup(env, fetcher(options), now));
});
