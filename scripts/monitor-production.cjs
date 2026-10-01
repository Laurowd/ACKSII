const { setTimeout: delay } = require('node:timers/promises');

async function checkApplication(origin, fetcher = fetch) {
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.origin !== origin || base.username || base.password) throw new Error('Use the exact public HTTPS origin.');
  for (const [pathname, expected] of [['/api/health', 200], ['/api/ready', 200], ['/api/characters', 401], ['/login', 200]]) {
    const response = await fetcher(new URL(pathname, base), { signal: AbortSignal.timeout(20_000), redirect: 'error' });
    if (response.status !== expected) throw new Error(`${pathname}: expected HTTP ${expected}, got ${response.status}.`);
    if (response.headers.get('x-content-type-options') !== 'nosniff') throw new Error(`${pathname}: missing security header.`);
    if (pathname.startsWith('/api/')) {
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(`${pathname}: invalid API content type.`);
      if (response.headers.get('cache-control') !== 'no-store') throw new Error(`${pathname}: API response must not be cached.`);
      const body = await response.json();
      if (expected === 200 && body.status !== 'ok') throw new Error(`${pathname}: service is not ready.`);
    } else if (!(await response.text()).includes('<div id="app">')) throw new Error('Frontend document is unavailable.');
  }
}
async function checkBackup(env = process.env, fetcher = fetch, now = Date.now()) {
  if (!env.GITHUB_TOKEN || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY || '')) throw new Error('Configure the GitHub token and repository for backup freshness checks.');
  async function get(endpoint) {
    const response = await fetcher(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${endpoint}`, { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(20_000), redirect: 'error' });
    if (!response.ok) throw new Error(`Backup metadata unavailable: GitHub HTTP ${response.status}.`);
    return response.json();
  }
  const runs = await get('/actions/workflows/production-backup.yml/runs?status=success&branch=master&per_page=1');
  const run = runs.workflow_runs?.[0];
  const age = now - Date.parse(run?.created_at || '');
  if (!run || !Number.isFinite(age) || age < 0 || age > 36 * 60 * 60 * 1000) throw new Error('No successful backup from the last 36 hours.');
  const artifacts = await get(`/actions/runs/${run.id}/artifacts`);
  if (!artifacts.artifacts?.some(artifact => artifact.name.startsWith('neon-encrypted-') && !artifact.expired && artifact.size_in_bytes > 0 && Date.parse(artifact.expires_at) > now)) throw new Error('The latest backup has no available encrypted artifact.');
}
async function main(env = process.env) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await checkApplication(env.ACKS_MONITOR_URL || 'https://acksii.vercel.app');
      if (env.ACKS_CHECK_BACKUP === 'true') await checkBackup(env);
      console.log('Production API, Neon connection, anonymous access guard and frontend: OK.');
      if (env.ACKS_CHECK_BACKUP === 'true') console.log('Encrypted, verified backup available from the last 36 hours.');
      return;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt}/3 failed: ${error.message}`);
      if (attempt < 3) await delay(15_000);
    }
  }
  throw lastError;
}
if (require.main === module) main().catch(() => { console.error('Production monitoring failed after three consecutive checks.'); process.exitCode = 1; });
module.exports = { checkApplication, checkBackup };
