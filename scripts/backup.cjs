// Run from any directory. Database commands execute inside the Compose project.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
const defaultEnvFile = '.env.production';

function composeArgs() {
  const args = ['compose'];
  const project = process.env.ACKS_COMPOSE_PROJECT?.trim();
  if (project) {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(project)) {
      throw new Error('ACKS_COMPOSE_PROJECT must contain only lowercase letters, numbers, underscores and hyphens.');
    }
    args.push('-p', project);
  }

  // The sentinel "none" is useful for disposable CI projects whose
  // configuration comes entirely from the job environment.
  const configuredEnvFile = process.env.ACKS_COMPOSE_ENV_FILE;
  if (configuredEnvFile !== 'none') {
    const envFile = path.resolve(root, configuredEnvFile || defaultEnvFile);
    if (!fs.existsSync(envFile)) {
      throw new Error(`Compose environment file not found: ${envFile}`);
    }
    args.push('--env-file', envFile);
  }
  args.push('-f', path.join(root, 'compose.yml'));
  return args;
}

function docker(command, stdio = 'inherit') {
  const result = spawnSync('docker', [...composeArgs(), ...command], {
    cwd: root,
    stdio,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Docker command terminated by ${result.signal}.`);
  if (result.status !== 0) throw new Error(`Docker command failed (${result.status}).`);
}

function assertCustomDump(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch (error) {
    if (error && error.code === 'ENOENT') throw new Error(`Backup file not found: ${file}`);
    throw error;
  }
  if (!stat.isFile() || stat.size < 5) throw new Error(`Backup is empty or is not a regular file: ${file}`);

  const fd = fs.openSync(file, 'r');
  try {
    const signature = Buffer.alloc(5);
    if (fs.readSync(fd, signature, 0, signature.length, 0) !== signature.length || signature.toString('ascii') !== 'PGDMP') {
      throw new Error(`Backup is not a PostgreSQL custom-format dump: ${file}`);
    }
  } finally {
    fs.closeSync(fd);
  }
}

function createBackup(requestedFile) {
  const file = requestedFile
    ? path.resolve(root, requestedFile)
    : path.join(root, 'backups', `acks-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
  const partial = `${file}.partial`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) throw new Error(`Refusing to overwrite existing backup: ${file}`);

  let fd;
  let ownsPartial = false;
  try {
    fd = fs.openSync(partial, 'wx', 0o600);
    ownsPartial = true;
    docker(
      ['exec', '-T', 'db', 'pg_dump', '-U', 'acks', '-d', 'acks', '-Fc', '--no-owner', '--no-acl'],
      ['ignore', fd, 'inherit'],
    );
    fs.closeSync(fd);
    fd = undefined;
    assertCustomDump(partial);
    // A hard link with a new name is atomic and fails if the destination
    // appears concurrently. rename() would overwrite on Unix.
    try {
      fs.linkSync(partial, file);
    } catch (error) {
      if (error && error.code === 'EEXIST') throw new Error(`Refusing to overwrite existing backup: ${file}`);
      throw error;
    }
    fs.unlinkSync(partial);
    ownsPartial = false;
  } finally {
    // Failed dumps never remain disguised as usable backups.
    if (fd !== undefined) fs.closeSync(fd);
    if (ownsPartial && fs.existsSync(partial)) fs.unlinkSync(partial);
  }
  console.log(`Backup: ${file}`);
}

function verifyBackup(requestedFile) {
  const file = path.resolve(root, requestedFile);
  assertCustomDump(file);
  const database = `acks_verify_${process.pid}_${Date.now().toString(36)}`;

  // createdb must succeed before cleanup is armed: an existing database is
  // never selected or overwritten.
  docker(['exec', '-T', 'db', 'createdb', '-U', 'acks', database]);
  try {
    const fd = fs.openSync(file, 'r');
    try {
      docker(
        ['exec', '-T', 'db', 'pg_restore', '-U', 'acks', '-d', database, '--exit-on-error', '--no-owner', '--no-acl'],
        [fd, 'inherit', 'inherit'],
      );
    } finally {
      fs.closeSync(fd);
    }
    docker([
      'exec', '-T', 'db', 'psql', '-U', 'acks', '-d', database, '-v', 'ON_ERROR_STOP=1', '-c',
      'SELECT count(*) AS characters FROM "Character"; SELECT count(*) AS accounts FROM "User";',
    ]);
    console.log('Backup restored successfully into an isolated verification database.');
  } finally {
    docker(['exec', '-T', 'db', 'dropdb', '-U', 'acks', '--if-exists', '--force', database]);
  }
}

try {
  if (mode === 'create') {
    createBackup(process.argv[3]);
  } else if (mode === 'verify' && process.argv[3]) {
    verifyBackup(process.argv[3]);
  } else {
    throw new Error('Usage: node scripts/backup.cjs create [backup.dump] | verify <backup.dump>');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
