const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { transform } = require('./backup-cipher.cjs');
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'acks-backup-cipher-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const dump = path.join(directory, 'input.dump');
  const data = Buffer.concat([Buffer.from('PGDMP'), randomBytes(2048)]);
  fs.writeFileSync(dump, data);
  return { directory, dump, data, env: { ACKS_BACKUP_KEY: randomBytes(32).toString('hex') } };
}
test('round-trips binary dump data and uses a different nonce for each export', async t => {
  const f = fixture(t), first = path.join(f.directory, 'first.enc'), second = path.join(f.directory, 'second.enc'), restored = path.join(f.directory, 'restored.dump');
  await transform('encrypt', f.dump, first, f.env);
  await transform('encrypt', f.dump, second, f.env);
  assert.notDeepEqual(fs.readFileSync(first), fs.readFileSync(second));
  assert.equal(fs.readFileSync(first).includes(f.data), false);
  await transform('decrypt', first, restored, f.env);
  assert.deepEqual(fs.readFileSync(restored), f.data);
});
test('wrong keys and tampered archives never leave plaintext or partial files', async t => {
  const f = fixture(t), archive = path.join(f.directory, 'backup.enc'), restored = path.join(f.directory, 'restored.dump');
  await transform('encrypt', f.dump, archive, f.env);
  await assert.rejects(transform('decrypt', archive, restored, { ACKS_BACKUP_KEY: randomBytes(32).toString('hex') }));
  const corrupted = fs.readFileSync(archive); corrupted[25] ^= 1; fs.writeFileSync(archive, corrupted);
  await assert.rejects(transform('decrypt', archive, restored, f.env));
  assert.equal(fs.existsSync(restored), false);
  assert.equal(fs.readdirSync(f.directory).some(file => file.endsWith('.partial')), false);
});
test('refuses invalid keys, unrelated input and overwriting existing files', async t => {
  const f = fixture(t), target = path.join(f.directory, 'out.enc');
  await assert.rejects(transform('encrypt', f.dump, target, { ACKS_BACKUP_KEY: 'invalid' }));
  fs.writeFileSync(target, 'keep');
  await assert.rejects(transform('encrypt', f.dump, target, f.env));
  assert.equal(fs.readFileSync(target, 'utf8'), 'keep');
  fs.writeFileSync(f.dump, 'unrelated-file');
  await assert.rejects(transform('encrypt', f.dump, path.join(f.directory, 'new.enc'), f.env));
});
