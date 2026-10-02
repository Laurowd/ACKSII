const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomBytes } = require('node:crypto');
const { spawn, spawnSync, fork, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const { writeReport } = require('./load-report.cjs');

function configuration(env = process.env) {
  const database = new URL(env.TEST_DATABASE_URL || 'http://missing');
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !['127.0.0.1', 'localhost'].includes(database.hostname) || database.pathname !== '/acks_test') throw new Error('Set TEST_DATABASE_URL to an explicit local PostgreSQL database named acks_test. Production is never supported by this runner.');
  const maxVUs = Number(env.LOAD_MAX_VUS || 200), readMaxVUs = Number(env.LOAD_READ_MAX_VUS || maxVUs), seconds = Number(env.LOAD_SECONDS || 30), warmupSeconds = Number(env.LOAD_WARMUP_SECONDS || 15), pool = Number(env.LOAD_POOL || 3), port = Number(env.LOAD_API_PORT || 3340);
  if (![maxVUs, readMaxVUs, seconds, warmupSeconds, pool, port].every(Number.isInteger) || maxVUs < 1 || maxVUs > 500 || readMaxVUs < 1 || readMaxVUs > 500 || seconds < 5 || seconds > 600 || warmupSeconds < 5 || warmupSeconds > 60 || pool < 1 || pool > 30 || port < 1024 || port > 65535) throw new Error('Invalid load configuration.');
  const profiles = (env.LOAD_PROFILES || 'read,mixed,sessions').split(',');
  const rates = (env.LOAD_RATES || '10,25,50,100,200,400,800').split(',').map(Number);
  const sessions = (env.LOAD_SESSION_VUS || '10,25,50,100,200').split(',').map(Number);
  if (profiles.some(p => !['read', 'mixed', 'sessions'].includes(p)) || rates.some(n => !Number.isInteger(n) || n < 1 || n > 2000) || sessions.some(n => !Number.isInteger(n) || n < 1 || n > maxVUs)) throw new Error('Invalid profiles, rates or session counts.');
  return { database, maxVUs, readMaxVUs, seconds, warmupSeconds, pool, port, profiles, rates, sessions, legacyClasses: env.LOAD_LEGACY_CLASSES !== 'false', k6: env.K6_BIN || 'k6' };
}
async function main() {
  const config = configuration();
  const { PrismaClient } = require('../backend/node_modules/@prisma/client');
  const version = spawnSync(config.k6, ['version'], { encoding: 'utf8', windowsHide: true });
  if (version.status !== 0) throw new Error('Install Grafana k6 or set K6_BIN to its executable.');
  const suffix = randomBytes(6).toString('hex'), schema = `load_${suffix}`;
  const directory = path.join(root, '.audit-tools', 'load', new Date().toISOString().replace(/[:.]/g, '-') + '-' + suffix);
  fs.mkdirSync(directory, { recursive: true });
  const database = new URL(config.database); database.searchParams.set('schema', schema); database.searchParams.set('connection_limit', String(config.pool)); database.searchParams.set('pool_timeout', '20');
  const secret = randomBytes(32).toString('hex');
  const environment = { ...process.env, DATABASE_URL: database.toString(), NODE_ENV: 'production', JWT_SECRET: secret,
    CORS_ORIGIN: 'https://load.invalid', PUBLIC_APP_URL: 'https://load.invalid', TRUST_PROXY: '', LOAD_ISOLATED: '1', LOAD_TARGET: 'local', ACKS_PRODUCTION_LOAD_ACK: '', LOAD_API_PORT: String(config.port) };
  const db = new PrismaClient({ datasourceUrl: database.toString() });
  let server, phaseSamples = [], phases = [], fixturePath = path.join(directory, 'fixture.json');
  const run = { date: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    k6: version.stdout.trim(), machine: { platform: os.platform(), node: process.version, cpu: os.cpus()[0].model, logicalCores: os.cpus().length, ramGb: os.totalmem() / 1073741824 },
    config: { maxVUs: config.maxVUs, readMaxVUs: config.readMaxVUs, seconds: config.seconds, warmupSeconds: config.warmupSeconds, connectionLimit: config.pool, legacyClasses: config.legacyClasses, profiles: config.profiles }, phases };
  try {
    const migration = spawnSync(process.execPath, [path.join(root, 'backend/node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.join(root, 'backend'), env: environment, encoding: 'utf8', windowsHide: true });
    if (migration.status !== 0) throw new Error('Migration of isolated load schema failed: ' + migration.stderr);
    console.log(`Preparing ${config.maxVUs} isolated masters, campaigns and ${config.maxVUs * 4} sheets; API pool ${config.pool}.`);
    Object.assign(process.env, environment);
    const { buildApp } = require('../backend/dist/app');
    const signer = buildApp(undefined, false); await signer.ready();
    const { RAW_DEFAULT_CLASSES } = require('../backend/dist/utils/seedClasses');
    const actors = [];
    for (let i = 0; i < config.maxVUs; i++) {
      const user = await db.user.create({ data: { username: `load_${suffix}_${i}`, email: `load_${suffix}_${i}@test.invalid`, passwordHash: 'isolated-load-fixture-no-password', role: 'MASTER' } });
      const campaign = await db.campaign.create({ data: { name: `Isolated load ${i}`, joinCode: `load_${suffix}_${i}`, masterId: user.id,
        members: { create: { userId: user.id, status: 'ACCEPTED' } } } });
      if (config.legacyClasses) await db.customClass.createMany({ data: RAW_DEFAULT_CLASSES.map(c => ({ ...c, campaignId: campaign.id, ...Object.fromEntries(['xpPerLevel', 'titles', 'attackThrows', 'savingThrows'].map(key => [key, JSON.stringify(c[key])])) })) });
      let characterId;
      for (let j = 0; j < 4; j++) {
        const mage = j === 1;
        const character = await db.character.create({ data: { userId: user.id, campaignId: campaign.id, characterName: `Load hero ${i}-${j}`, className: mage ? 'Mage' : 'Fighter', classKey: mage ? 'catalog:mage' : 'catalog:fighter', level: 3, hpMax: mage ? 12 : 20, hpCurr: mage ? 12 : 20, int: 12, str: 12, dex: 12, xp: mage ? 5000 : 4000, isSpellcaster: mage,
          items: { create: Array.from({ length: 16 }, (_, n) => ({ name: `Equipment ${n}`, quantity: 1, weight: 1 / 6, notes: 'Isolated load equipment' })) },
          weapons: { create: [{ name: 'Sword', damage: '1d6', catalogId: 'w-sword' }, { name: 'Dagger', damage: '1d4', catalogId: 'w-dagger' }] },
          proficiencies: { create: [{ name: 'Caving', category: 'general' }, { name: mage ? 'Alchemy' : 'Combat Reflexes', category: 'class' }] },
          ...(mage ? { spells: { create: [{ name: 'Arcane Armor', level: 1, tradition: 'arcane' }, { name: 'Slumber', level: 1, tradition: 'arcane' }] } } : {}) } });
        if (!j) characterId = character.id;
      }
      actors.push({ characterId, campaignId: campaign.id, token: signer.jwt.sign({ id: user.id, username: user.username, role: 'MASTER', sessionVersion: 0 }, { expiresIn: '2h' }) });
    }
    await signer.close();
    fs.writeFileSync(fixturePath, JSON.stringify({ actors }));
    run.dataset = { masters: actors.length, campaigns: actors.length, sheets: actors.length * 4, itemsPerSheet: 16, classesPerCampaign: config.legacyClasses ? 21 : 0 };
    server = fork(path.join(root, 'scripts/load-server.cjs'), [], { env: environment, stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true });
    server.stderr.on('data', data => fs.appendFileSync(path.join(directory, 'server.log'), data));
    await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Load API startup timeout.')), 30000); server.once('error', reject); server.once('exit', () => reject(new Error('Load API exited.'))); server.on('message', message => { if (message.type === 'resource') phaseSamples.push(message); if (message.type === 'ready') { clearTimeout(timeout); resolve(); } }); });
    async function executePhase(profile, amount, seconds, label = `${profile}-${amount}`) {
      phaseSamples = [];
      const summaryPath = path.join(directory, label + '.json');
      const log = fs.openSync(path.join(directory, label + '.log'), 'w');
      console.log(`k6 ${label}: ${amount} ${profile === 'sessions' ? 'virtual users' : 'operations/s'} for ${seconds}s.`);
      const phaseEnv = { ...environment, LOAD_BASE_URL: `http://127.0.0.1:${config.port}`, LOAD_FIXTURE: fixturePath, LOAD_PROFILE: profile, LOAD_AMOUNT: String(amount), LOAD_MAX_VUS: String(profile === 'read' ? config.readMaxVUs : config.maxVUs), LOAD_DURATION: `${seconds}s`, LOAD_SUMMARY: summaryPath, K6_NO_USAGE_REPORT: 'true', K6_NEW_MACHINE_READABLE_SUMMARY: 'false' };
      const code = await new Promise((resolve, reject) => { const child = spawn(config.k6, ['run', '--quiet', '--no-usage-report', path.join(root, 'load/api.k6.js')], { cwd: root, env: phaseEnv, stdio: ['ignore', log, log], windowsHide: true }); child.once('error', reject); child.once('close', resolve); });
      fs.closeSync(log);
      if (!fs.existsSync(summaryPath)) throw new Error(`k6 did not produce ${label}; inspect its log.`);
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      const phase = { profile, amount, exitCode: code, summary, resources: phaseSamples };
      const m = summary.metrics;
      console.log(`  ${code === 0 ? 'PASS' : 'LIMIT'}; ${m.http_reqs?.values.rate.toFixed(1)} req/s; p95 ${m.http_req_duration?.values['p(95)'].toFixed(1)}ms; errors ${(100 * (m.http_req_failed?.values.rate || 0)).toFixed(2)}%; dropped ${m.dropped_iterations?.values.count || 0}.`);
      return phase;
    }
    run.warmup = await executePhase('read', 25, config.warmupSeconds, 'warmup');
    if (run.warmup.exitCode !== 0) throw new Error('Warmup failed; inspect warmup.log before measuring capacity.');
    for (const profile of config.profiles) for (const amount of profile === 'sessions' ? config.sessions : config.rates) {
      const phase = await executePhase(profile, amount, config.seconds);
      phases.push(phase); writeReport(run, directory);
      if (phase.exitCode !== 0) { console.log('Stopping this profile at the first failed latency/error/generation threshold.'); break; }
    }
    console.log('Report: ' + path.join(directory, 'report.md'));
  } finally {
    if (server?.connected) { await new Promise(resolve => { server.once('exit', resolve); server.send('stop'); setTimeout(() => { if (server.exitCode === null) server.kill(); resolve(); }, 10000).unref(); }); }
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);
    if (!/^load_[0-9a-f]{12}$/.test(schema)) throw new Error('Unexpected schema name; cleanup refused.');
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.$disconnect();
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { configuration };
