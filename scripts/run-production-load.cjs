const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { configuration } = require('./production-load-config.cjs');
const { parseEnv } = require('./preflight.cjs');
const { checkApplication } = require('./monitor-production.cjs');
const { writeProductionReport } = require('./production-load-report.cjs');
const root = path.resolve(__dirname, '..');

async function main() {
  const config = configuration();
  const version = spawnSync(config.k6, ['version'], { encoding: 'utf8', windowsHide: true });
  if (version.status !== 0) throw new Error('Install k6 or set K6_BIN.');
  await checkApplication(config.origin);
  // Only the existing database credential is consumed, in memory. No Vercel secret export.
  const databaseLine = fs.readFileSync(path.join(root, 'backend/.env'), 'utf8').split(/\r?\n/).filter(line => /^\s*DATABASE_URL\s*=/.test(line)).join('\n');
  const database = new URL(parseEnv(databaseLine).values.DATABASE_URL);
  if (database.protocol !== 'postgresql:' || database.hostname !== 'ep-ancient-voice-adcgrd68-pooler.c-2.us-east-1.aws.neon.tech') throw new Error('Expected the configured ACKSII Neon database.');
  database.searchParams.set('connection_limit', '1'); database.searchParams.set('pool_timeout', '20'); database.searchParams.set('sslmode', 'require');
  const { PrismaClient } = require('../backend/node_modules/@prisma/client');
  const db = new PrismaClient({ datasourceUrl: database.href });
  const marker = `k6_prod_${randomBytes(6).toString('hex')}`;
  const directory = path.join(root, '.audit-tools', 'production-load', new Date().toISOString().replace(/[:.]/g, '-') + '-' + marker);
  fs.mkdirSync(directory, { recursive: true });
  const fixture = path.join(directory, 'fixture.json');
  const password = randomBytes(24).toString('base64url');
  const accounts = Array.from({ length: 10 }, (_, index) => ({ id: randomUUID(), username: `${marker}_${index}`, email: `${marker}_${index}@test.invalid` }));
  const campaigns = accounts.map((user, index) => ({ id: randomUUID(), name: `K6 temporary ${marker} ${index}`, joinCode: `${marker}_${index}`, masterId: user.id }));
  const characters = accounts.flatMap((user, index) => Array.from({ length: 4 }, (_, j) => ({ id: randomUUID(), userId: user.id, campaignId: campaigns[index].id, characterName: `K6 temporary ${index}-${j}`, className: j === 1 ? 'Mage' : 'Fighter', classKey: j === 1 ? 'catalog:mage' : 'catalog:fighter', level: 3, hpMax: 20, hpCurr: 20, str: 12, int: 12, dex: 12, xp: j === 1 ? 5000 : 4000, isSpellcaster: j === 1 })));
  const userIds = accounts.map(u => u.id), campaignIds = campaigns.map(c => c.id), characterIds = characters.map(c => c.id);
  fs.writeFileSync(path.join(directory, 'cleanup-identifiers.json'), JSON.stringify({ marker, userIds, campaignIds, characterIds }), { mode: 0o600 });
  const run = { date: new Date().toISOString(), origin: config.origin, k6: version.stdout.trim(), config: { seconds: config.seconds, rates: config.rates, sessions: config.sessions, profiles: config.profiles, maxVUs: 40, readMaxVUs: 80 }, dataset: { temporaryMasters: 10, temporaryCampaigns: 10, temporarySheets: 40, itemsPerSheet: 16, classesPerCampaign: 21 }, phases: [], cleanup: { complete: false } };
  let activeChild, cancelled = false;
  const cancel = () => { cancelled = true; activeChild?.kill(); };
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  async function request(endpoint, options = {}) {
    const response = await fetch(config.origin + endpoint, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
    return response.json();
  }
  async function counts() { return { users: await db.user.count(), campaigns: await db.campaign.count(), characters: await db.character.count() }; }
  async function phase(profile, amount, seconds, label = `${profile}-${amount}`) {
    if (cancelled) throw new Error('Load cancelled.');
    const summaryPath = path.join(directory, label + '.json'), log = fs.openSync(path.join(directory, label + '.log'), 'w');
    console.log(`k6 ${label}: ${amount} ${profile === 'sessions' ? 'VUs' : 'op/s'}, ${seconds}s.`);
    let exitCode;
    try {
      exitCode = await new Promise((resolve, reject) => {
        activeChild = spawn(config.k6, ['run', '--quiet', '--no-usage-report', path.join(root, 'load/api.k6.js')], { cwd: root, windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env,
          LOAD_TARGET: 'production', ACKS_PRODUCTION_LOAD_ACK: config.origin, LOAD_BASE_URL: config.origin, LOAD_FIXTURE: fixture, LOAD_PROFILE: profile, LOAD_AMOUNT: String(amount), LOAD_DURATION: `${seconds}s`, LOAD_MAX_VUS: profile === 'read' ? '80' : '40', LOAD_SUMMARY: summaryPath, K6_NO_USAGE_REPORT: 'true', K6_NEW_MACHINE_READABLE_SUMMARY: 'false', LOAD_DEBUG: 'false' } });
        activeChild.once('error', reject); activeChild.once('close', resolve);
      });
    } finally { fs.closeSync(log); activeChild = null; }
    if (!fs.existsSync(summaryPath)) throw new Error('k6 did not produce a summary; inspect the phase log.');
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8')), m = summary.metrics;
    console.log(`  ${exitCode ? 'LIMIT' : 'PASS'}: ${m.http_reqs.values.rate.toFixed(1)} req/s; p95=${m.http_req_duration.values['p(95)'].toFixed(1)}ms; errors=${(100 * m.http_req_failed.values.rate).toFixed(2)}%; dropped=${m.dropped_iterations?.values.count || 0}.`);
    return { profile, amount, exitCode, summary };
  }
  try {
    run.before = await counts();
    const passwordHash = await require('../backend/node_modules/bcrypt').hash(password, 12);
    const { RAW_DEFAULT_CLASSES } = require('../backend/dist/utils/seedClasses');
    console.log('Preparing 10 temporary masters, 10 campaigns and 40 sheets; no migrations or schema changes.');
    await db.$transaction(async tx => {
      await tx.user.createMany({ data: accounts.map(user => ({ ...user, role: 'MASTER', passwordHash })) });
      await tx.campaign.createMany({ data: campaigns });
      await tx.campaignMember.createMany({ data: accounts.map((user, index) => ({ userId: user.id, campaignId: campaigns[index].id, status: 'ACCEPTED' })) });
      await tx.customClass.createMany({ data: campaigns.flatMap(campaign => RAW_DEFAULT_CLASSES.map(c => ({ ...c, campaignId: campaign.id, ...Object.fromEntries(['xpPerLevel', 'titles', 'attackThrows', 'savingThrows'].map(key => [key, JSON.stringify(c[key])])) }))) });
      await tx.character.createMany({ data: characters });
      await tx.item.createMany({ data: characters.flatMap(c => Array.from({ length: 16 }, (_, n) => ({ characterId: c.id, name: `K6 equipment ${n}`, quantity: 1, weight: 1 / 6 }))) });
      await tx.weapon.createMany({ data: characters.flatMap(c => [{ characterId: c.id, name: 'Sword', damage: '1d6', catalogId: 'w-sword' }, { characterId: c.id, name: 'Dagger', damage: '1d4', catalogId: 'w-dagger' }]) });
      await tx.proficiency.createMany({ data: characters.flatMap(c => [{ characterId: c.id, name: 'Caving', category: 'general' }, { characterId: c.id, name: c.isSpellcaster ? 'Alchemy' : 'Combat Reflexes', category: 'class' }]) });
      await tx.spell.createMany({ data: characters.filter(c => c.isSpellcaster).flatMap(c => [{ characterId: c.id, name: 'Arcane Armor', level: 1, tradition: 'arcane' }, { characterId: c.id, name: 'Slumber', level: 1, tradition: 'arcane' }]) });
    }, { maxWait: 10000, timeout: 90000 });
    const tokens = new Map();
    for (const account of accounts) {
      if (cancelled) throw new Error('Load cancelled.');
      const login = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password }) });
      if (login.user?.id !== account.id || typeof login.token !== 'string') throw new Error('Production API and configured database do not match the synthetic account.');
      tokens.set(account.id, login.token);
    }
    const actors = characters.map(c => ({ characterId: c.id, campaignId: c.campaignId, token: tokens.get(c.userId) }));
    fs.writeFileSync(fixture, JSON.stringify({ actors }), { mode: 0o600 });
    run.warmup = await phase('read', 1, 10, 'warmup'); writeProductionReport(run, directory);
    const bad = p => p.summary.metrics.invalid_responses.values.rate >= 0.01 || p.summary.metrics.http_req_failed.values.rate >= 0.01 || p.summary.metrics.http_req_duration.values['p(95)'] >= 2000;
    if (bad(run.warmup)) throw new Error('Warmup exceeded the production safety threshold.');
    let stop = false;
    for (const profile of config.profiles) {
      if (stop) break;
      await checkApplication(config.origin);
      for (const amount of profile === 'sessions' ? config.sessions : config.rates) {
        const result = await phase(profile, amount, config.seconds);
        run.phases.push(result); writeProductionReport(run, directory);
        if (bad(result)) { stop = true; run.stopReason = 'Production safety threshold exceeded; no additional load.'; break; }
        if (result.exitCode) { console.log('Stopping this profile at the first failed latency/generation threshold.'); break; }
        await delay(3000);
      }
      await delay(5000);
    }
  } finally {
    process.off('SIGINT', cancel); process.off('SIGTERM', cancel);
    if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
    try {
      // Exact generated IDs plus ownership/marker checks; never a prefix-only deletion.
      const found = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } });
      if (found.some(user => accounts.find(a => a.id === user.id)?.username !== user.username)) throw new Error('Synthetic ownership check failed; cleanup refused.');
      await db.$transaction(async tx => {
        await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } });
        await tx.character.deleteMany({ where: { id: { in: characterIds }, userId: { in: userIds }, campaignId: { in: campaignIds } } });
        await tx.campaign.deleteMany({ where: { id: { in: campaignIds }, masterId: { in: userIds }, name: { startsWith: `K6 temporary ${marker} ` } } });
        await tx.user.deleteMany({ where: { id: { in: userIds }, username: { in: accounts.map(a => a.username) } } });
      }, { maxWait: 10000, timeout: 90000 });
      run.cleanup = { complete: true, usersRemaining: await db.user.count({ where: { id: { in: userIds } } }), campaignsRemaining: await db.campaign.count({ where: { id: { in: campaignIds } } }), sheetsRemaining: await db.character.count({ where: { id: { in: characterIds } } }) };
      run.after = await counts();
      await checkApplication(config.origin);
      run.healthyAfter = true;
      console.log('Synthetic records removed; production health, database and anonymous access checks OK.');
    } finally { writeProductionReport(run, directory); await db.$disconnect(); }
    console.log('Report: ' + path.join(directory, 'report.md'));
  }
}
if (require.main === module) main().catch(error => { const safe = error.code ? `Production load failed: ${error.code}.` : String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database credential redacted]'); console.error(safe); process.exitCode = 1; });
