// Read-only export from Neon; restore verification runs in a disposable,
// network-isolated local container. Credentials are passed through environment.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { parseEnv } = require('./preflight.cjs');
const root = path.resolve(__dirname, '..');
const image = process.env.ACKS_PG_IMAGE || 'postgres:17-alpine';
if (!/^postgres:\d+(?:\.\d+)?-alpine$/.test(image)) throw new Error('ACKS_PG_IMAGE must be an official versioned postgres:<major>-alpine image.');

function docker(args, stdio = 'inherit', env = process.env) {
  const result = spawnSync('docker', args, { cwd: root, windowsHide: true, stdio, env });
  if (result.error) throw new Error(`Docker unavailable: ${result.error.code || 'execution failed'}`);
  if (result.status !== 0) throw new Error('Docker/PostgreSQL command failed. See the preceding diagnostic.');
  return result;
}

function checkDump(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size < 5) throw new Error('Backup is empty or is not a regular file.');
  const fd = fs.openSync(file, 'r');
  try {
    const signature = Buffer.alloc(5);
    fs.readSync(fd, signature, 0, 5, 0);
    if (signature.toString('ascii') !== 'PGDMP') throw new Error('Backup is not a PostgreSQL custom-format dump.');
  } finally { fs.closeSync(fd); }
}

function connectionEnv() {
  let settings = {};
  if (process.env.ACKS_NEON_ENV_FILE !== 'none') {
    const file = path.resolve(root, process.env.ACKS_NEON_ENV_FILE || '.env.neon.production');
    const parsed = parseEnv(fs.readFileSync(file, 'utf8'));
    if (parsed.errors.length) throw new Error('Invalid Neon environment file. Run preflight first.');
    settings = parsed.values;
  }
  const value = process.env.DIRECT_DATABASE_URL ?? settings.DIRECT_DATABASE_URL;
  let url;
  try { url = new URL(value); } catch { throw new Error('Configure a valid DIRECT_DATABASE_URL.'); }
  const localTest = process.env.CI === 'true' && url.hostname === 'db' && url.pathname === '/acks_test';
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password ||
      (!localTest && (!url.hostname.endsWith('.neon.tech') || url.hostname.split('.')[0].endsWith('-pooler') ||
      !['require', 'verify-full'].includes(url.searchParams.get('sslmode'))))) {
    throw new Error('Backup requires the direct Neon URL with TLS and pooling disabled.');
  }
  return { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: localTest ? 'disable' : url.searchParams.get('sslmode'),
    PGCONNECT_TIMEOUT: '15' };
}

function create(requestedFile) {
  const env = connectionEnv();
  const file = path.resolve(root, requestedFile || `backups/neon-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
  const partial = `${file}.partial`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) throw new Error('Refusing to overwrite an existing backup.');
  let fd;
  let ownsPartial = false;
  try {
    fd = fs.openSync(partial, 'wx', 0o600);
    ownsPartial = true;
    const args = ['run', '--rm', '-i'];
    if (process.env.ACKS_BACKUP_NETWORK) args.push('--network', process.env.ACKS_BACKUP_NETWORK);
    for (const key of ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE', 'PGCONNECT_TIMEOUT']) args.push('-e', key);
    docker([...args, image, 'pg_dump', '-Fc', '--no-owner', '--no-acl'], ['ignore', fd, 'inherit'], env);
    fs.closeSync(fd);
    fd = undefined;
    checkDump(partial);
    fs.linkSync(partial, file);
    fs.unlinkSync(partial);
    ownsPartial = false;
    console.log(`Backup: ${file}`);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (ownsPartial && fs.existsSync(partial)) fs.unlinkSync(partial);
  }
}

async function verify(requestedFile) {
  const file = path.resolve(root, requestedFile);
  checkDump(file);
  const container = `acks-backup-verify-${randomBytes(8).toString('hex')}`;
  const env = { ...process.env, POSTGRES_PASSWORD: randomBytes(32).toString('hex') };
  docker(['run', '--rm', '-d', '--name', container, '--network', 'none', '--tmpfs', '/var/lib/postgresql/data',
    '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=acks_verify', '-e', 'POSTGRES_DB=acks_verify', image], 'pipe', env);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      // The image starts a temporary socket-only server before creating its DB.
      // Probe an actual query over TCP so neither that server nor a missing DB
      // can make the restore begin before initialization finishes.
      const result = spawnSync('docker', ['exec', container, 'psql', '-h', '127.0.0.1', '-U', 'acks_verify', '-d', 'acks_verify', '-v', 'ON_ERROR_STOP=1', '-tAc', 'SELECT 1'], { windowsHide: true, stdio: 'ignore' });
      if (result.status === 0) { ready = true; break; }
      await delay(500);
    }
    if (!ready) throw new Error('Disposable restore database did not become ready.');
    const fd = fs.openSync(file, 'r');
    try {
      docker(['exec', '-i', container, 'pg_restore', '-h', '127.0.0.1', '-U', 'acks_verify', '-d', 'acks_verify', '--exit-on-error', '--no-owner', '--no-acl'], [fd, 'inherit', 'inherit']);
    } finally { fs.closeSync(fd); }
    docker(['exec', container, 'psql', '-h', '127.0.0.1', '-U', 'acks_verify', '-d', 'acks_verify', '-v', 'ON_ERROR_STOP=1', '-c',
      'SELECT count(*) AS characters FROM "Character"; SELECT count(*) AS accounts FROM "User";']);
    console.log('Backup restored successfully into an isolated disposable container.');
  } finally { docker(['rm', '-f', container], 'pipe'); }
}

async function main() {
  if (process.argv[2] === 'create') create(process.argv[3]);
  else if (process.argv[2] === 'verify' && process.argv[3]) await verify(process.argv[3]);
  else throw new Error('Usage: node scripts/backup-neon.cjs create [backup.dump] | verify <backup.dump>');
}
main().catch(error => { console.error(error.code ? `Backup failed (${error.code}).` : error.message); process.exitCode = 1; });
