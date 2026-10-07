const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const url = new URL(process.env.TEST_DATABASE_URL || 'http://missing');
if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test') throw Error('Use only an explicit disposable localhost acks_test database.');
Object.assign(process.env, { DATABASE_URL: url.toString(), NODE_ENV: 'production', JWT_SECRET: randomBytes(32).toString('hex'), CORS_ORIGIN: 'https://test.example', PUBLIC_APP_URL: 'https://test.example' });
const { buildApp } = require('../dist/app'), db = require('../dist/lib/prisma').default;
let app, user, token;
const request = (method, url, payload) => app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
const creation = { characterName: 'Additional rule regression', rulesMode: 'standard', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 4 };
before(async () => {
  const migrated = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.resolve(__dirname, '..'), env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(migrated.status, 0, migrated.stdout + migrated.stderr);
  app = buildApp(undefined, false); await app.ready();
  const suffix = randomBytes(6).toString('hex');
  user = await db.user.create({ data: { username: `extra_rules_${suffix}`, email: `${suffix}@test.invalid`, passwordHash: 'unused-local-fixture', role: 'PLAYER' } });
  token = app.jwt.sign({ id: user.id, username: user.username, role: user.role, sessionVersion: user.sessionVersion });
});
after(async () => { if (user) await db.user.delete({ where: { id: user.id } }); if (app) await app.close(); else await db.$disconnect(); });
for (const name of ['Manual of Arms', 'Siege Engineering']) test(`standard creation accepts permitted ${name} grades`, async () => {
  const result = await request('POST', '/api/characters/guided', { ...creation, classKey: 'catalog:fighter', proficiencies: [{ name, category: 'class' }, { name, category: 'general' }] });
  assert.equal(result.statusCode, 201, result.body);
  const character = (await request('GET', `/api/characters/${result.json().character.id}`)).json().character;
  assert.equal(character.proficiencies.filter(p => p.name === name).length, 2);
  assert.deepEqual((await request('GET', `/api/game-rules/characters/${character.id}`)).json().issues, []);
});
test('standard Venturer creation rejects redundant free Diplomacy without creating a sheet', async () => {
  const count = await db.character.count({ where: { userId: user.id } });
  const result = await request('POST', '/api/characters/guided', { ...creation, classKey: 'catalog:venturer', classChoices: { 'expert-traveling': 'Driving' }, proficiencies: [{ name: 'Navigation', category: 'class' }, { name: 'Diplomacy', category: 'general' }] });
  assert.equal(result.statusCode, 400, result.body); assert.match(result.json().message, /não pode ser repetida/);
  assert.equal(await db.character.count({ where: { userId: user.id } }), count);
});
test('Gambling permits further selections when the general budget has room', async () => {
  const result = await request('POST', '/api/characters/guided', { ...creation, int: 13, classKey: 'catalog:fighter', proficiencies: [{ name: 'Combat Reflexes', category: 'class' }, { name: 'Gambling', category: 'general' }, { name: 'Gambling', category: 'general' }] });
  assert.equal(result.statusCode, 201, result.body);
});
test('Craftpriest Theology starts at the second grade without persisting an extra free row', async () => {
  const result = await request('POST', '/api/characters/guided', { ...creation, classKey: 'catalog:dwarven-craftpriest', classChoices: { craft: 'Craft (brewing)' }, spells: [{ name: 'Discern Gist', level: 1, tradition: 'divine' }], proficiencies: [{ name: 'Alchemy', category: 'class' }, { name: 'Theology', category: 'general' }] });
  assert.equal(result.statusCode, 201, result.body);
  const character = (await request('GET', `/api/characters/${result.json().character.id}`)).json().character;
  assert.deepEqual(character.proficiencies.filter(p => p.name === 'Theology').map(p => ({ target: p.throwTarget, category: p.category })), [{ target: 4, category: 'general' }]);
});
test('legacy Witch overview includes Healing Arts without silently rewriting the old sheet', async () => {
  const character = await db.character.create({ data: { userId: user.id, characterName: 'Legacy Antiquarian', classKey: 'catalog:witch', className: 'Witch', subclass: 'Antiquarian', level: 3, rulesState: '{}' } });
  const result = await request('GET', `/api/game-rules/characters/${character.id}`); assert.equal(result.statusCode, 200, result.body);
  assert.equal(result.json().classChoices.tradition, 'Antiquarian');
  assert.equal(result.json().grantedProficiencies.find(p => p.name === 'Healing').ranks, 1);
  const stored = await db.character.findUnique({ where: { id: character.id } });
  assert.equal(stored.rulesState, '{}'); assert.equal(stored.version, character.version);
});
async function research(className) {
  const character = await db.character.create({ data: { userId: user.id, characterName: 'Assistant test', classKey: `catalog:${className.toLowerCase()}`, className, level: 9, int: 10, workshopValue: 8000, coinGP: 10000, isSpellcaster: true } });
  const project = await db.magicItemResearch.create({ data: { characterId: character.id, itemName: 'Weekly effect', effectType: 'WEEKLY', spellLevel: 3, hasFormula: true } });
  const input = { version: character.version, casterLevel: 9, tradition: className === 'Mage' ? 'arcane' : 'divine', rateBonusPercent: 0, dedication: 'dedicated', assistants: [], duration: 'instant', affectsUser: false, esoteric: false, healing: false, eligible: true, itemKind: 'other' };
  return { character, project, input, endpoint: `/api/campaign-rules/characters/${character.id}/research/${project.id}` };
}
const assistant = { name: 'Assistant', casterLevel: 14, rateBonusPercent: 0, dedication: 'dedicated' };
test('invalid research assistants cannot preview or start or spend materials', async () => {
  const { character, project, input, endpoint } = await research('Mage');
  const preview = await request('POST', `${endpoint}/preview`, input); assert.equal(preview.statusCode, 200, preview.body);
  for (const assistants of [[{ ...assistant, casterLevel: 0 }], [assistant, assistant], Array.from({ length: 20 }, () => ({ ...assistant }))]) {
    for (const action of ['preview', 'start']) {
      const result = await request('POST', `${endpoint}/${action}`, { ...input, assistants, ...(action === 'start' ? { fingerprint: preview.json().fingerprint } : {}) });
      assert.equal(result.statusCode, 400, result.body);
    }
  }
  const stored = await db.character.findUnique({ where: { id: character.id } });
  assert.equal(stored.coinGP, character.coinGP); assert.equal(stored.version, character.version);
  assert.equal((await db.magicItemResearch.findUnique({ where: { id: project.id } })).status, 'QUEUED');
});
test('valid studious assistance changes time and starts an atomic project', async () => {
  const { character, project, input, endpoint } = await research('Mage');
  const data = { ...input, assistants: [assistant] }, preview = await request('POST', `${endpoint}/preview`, data);
  assert.equal(preview.statusCode, 200, preview.body); assert.equal(preview.json().researchRateGp, 2350); assert.equal(preview.json().daysRequired, 4);
  const started = await request('POST', `${endpoint}/start`, { ...data, fingerprint: preview.json().fingerprint }); assert.equal(started.statusCode, 200, started.body);
  const stored = await db.character.findUnique({ where: { id: character.id } }); assert.equal(stored.coinGP, 1000); assert.equal(stored.version, character.version + 1);
  assert.equal((await db.magicItemResearch.findUnique({ where: { id: project.id } })).remainingDays, 4);
});
test('prayerful research remains valid alone and rejects direct assistants in the normal flow', async () => {
  const { input, endpoint } = await research('Crusader');
  assert.equal((await request('POST', `${endpoint}/preview`, input)).statusCode, 200);
  const invalid = await request('POST', `${endpoint}/preview`, { ...input, assistants: [assistant] }); assert.equal(invalid.statusCode, 400, invalid.body); assert.match(invalid.json().error || invalid.json().message, /conjurador de estudo/);
});
