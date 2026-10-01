// Authenticated encryption of PostgreSQL exports. Never pass keys as CLI args.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const magic = Buffer.from('ACKSBK01');
const headerSize = magic.length + 12;

function keyFromEnvironment(env = process.env) {
  if (!/^[a-f0-9]{64}$/i.test(env.ACKS_BACKUP_KEY || '')) throw new Error('Configure ACKS_BACKUP_KEY with 32 random bytes encoded as hexadecimal.');
  return Buffer.from(env.ACKS_BACKUP_KEY, 'hex');
}
function signature(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const bytes = Buffer.alloc(5);
    fs.readSync(fd, bytes, 0, bytes.length, 0);
    if (bytes.toString('ascii') !== 'PGDMP') throw new Error('Input is not a PostgreSQL custom-format dump.');
  } finally { fs.closeSync(fd); }
}
async function transform(mode, input, output, env = process.env) {
  const key = keyFromEnvironment(env);
  const source = path.resolve(input);
  const target = path.resolve(output);
  if (source === target || fs.existsSync(target)) throw new Error('Refusing to replace an existing file.');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const partial = `${target}.${randomBytes(8).toString('hex')}.partial`;
  let ownsPartial = false;
  try {
    let cipher, reader, prefix;
    if (mode === 'encrypt') {
      signature(source);
      const iv = randomBytes(12);
      cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(magic);
      reader = fs.createReadStream(source);
      prefix = Buffer.concat([magic, iv]);
    } else if (mode === 'decrypt') {
      const stat = fs.statSync(source);
      if (!stat.isFile() || stat.size < headerSize + 16 + 5) throw new Error('Invalid encrypted backup.');
      const fd = fs.openSync(source, 'r');
      const header = Buffer.alloc(headerSize), tag = Buffer.alloc(16);
      try {
        fs.readSync(fd, header, 0, header.length, 0);
        fs.readSync(fd, tag, 0, tag.length, stat.size - tag.length);
      } finally { fs.closeSync(fd); }
      if (!header.subarray(0, magic.length).equals(magic)) throw new Error('Unsupported backup format.');
      cipher = createDecipheriv('aes-256-gcm', key, header.subarray(magic.length));
      cipher.setAAD(magic);
      cipher.setAuthTag(tag);
      reader = fs.createReadStream(source, { start: headerSize, end: stat.size - 17 });
    } else throw new Error('Unknown backup operation.');
    const fd = fs.openSync(partial, 'wx', 0o600);
    ownsPartial = true;
    const writer = fs.createWriteStream(partial, { fd, autoClose: true });
    if (prefix) writer.write(prefix);
    await pipeline(reader, cipher, writer);
    if (mode === 'encrypt') fs.appendFileSync(partial, cipher.getAuthTag());
    else signature(partial);
    // A completed plaintext file is exposed only after GCM authentication passes.
    fs.linkSync(partial, target);
    fs.unlinkSync(partial);
    ownsPartial = false;
    return target;
  } finally {
    key.fill(0);
    if (ownsPartial && fs.existsSync(partial)) fs.unlinkSync(partial);
  }
}
async function main() {
  const [mode, input, output] = process.argv.slice(2);
  if (!['encrypt', 'decrypt'].includes(mode) || !input || !output) throw new Error('Usage: node scripts/backup-cipher.cjs encrypt|decrypt <input> <output>');
  await transform(mode, input, output);
  console.log(`Backup ${mode === 'encrypt' ? 'encrypted' : 'decrypted and authenticated'} successfully.`);
}
if (require.main === module) main().catch(() => { console.error('Backup encryption/decryption failed. Check the key, input integrity and output path; existing files are never overwritten.'); process.exitCode = 1; });
module.exports = { transform, keyFromEnvironment };
