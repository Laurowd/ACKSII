const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const url = new URL(process.env.TEST_DATABASE_URL || 'http://missing');
if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test') {
  throw new Error('Set TEST_DATABASE_URL to a disposable localhost PostgreSQL database named acks_test.');
}
process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.CORS_ORIGIN = 'https://test.example';
process.env.PUBLIC_APP_URL = 'https://test.example';
const { buildApp } = require('../dist/app');
const db = require('../dist/lib/prisma').default;
const relations = ['weapons', 'proficiencies', 'items', 'spells', 'rituals', 'magicFormulae', 'henchmen', 'scars', 'activities', 'armyUnits', 'magicItemResearch', 'mercantileVentures'];
const include = { ...Object.fromEntries(relations.map(key => [key, true])), domain: true };
const privateKeys = new Set(['id', 'userId', 'campaignId', 'characterId', 'createdAt', 'updatedAt', 'version', 'user', 'auditLogs']);
function portable(value) {
  if (Array.isArray(value)) return value.map(portable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !privateKeys.has(key)).map(([key, child]) => [key, portable(child)]));
  return value;
}
const document = character => ({ format: 'acks-ii-character', version: 1, exportedAt: new Date().toISOString(), character });
const suffix = randomBytes(6).toString('hex');
let app, user, master, campaign, token;
const ids = [];
async function request(payload) { return app.inject({ method: 'POST', url: '/api/characters/import', payload, headers: { authorization: `Bearer ${token}` } }); }
before(async () => {
  const migrated = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.resolve(__dirname, '..'), env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(migrated.status, 0, migrated.stdout + migrated.stderr);
  app = buildApp(undefined, false);
  await app.ready();
  [user, master] = await Promise.all(['PLAYER', 'MASTER'].map((role, index) => db.user.create({ data: { username: `import_${suffix}_${index}`, email: `import_${suffix}_${index}@test.invalid`, passwordHash: 'test-only', role } })));
  campaign = await db.campaign.create({ data: { name: `Import ${suffix}`, masterId: master.id, joinCode: `i${suffix}` } });
  token = app.jwt.sign({ id: user.id, username: user.username, role: user.role, sessionVersion: user.sessionVersion });
});
after(async () => {
  if (user) {
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.character.deleteMany({ where: { userId: { in: [user.id, master.id] } } });
    if (campaign) await db.campaign.delete({ where: { id: campaign.id } });
    await db.user.deleteMany({ where: { id: { in: [user.id, master.id] } } });
  }
  if (app) await app.close(); else await db.$disconnect();
});

test('portable JSON import restores every relation and daily magic usage as a new owned sheet', async () => {
  const source = await db.character.create({ data: {
    userId: master.id, characterName: 'Portable mage', classKey: 'catalog:mage', className: 'Mage', level: 2,
    dex: 16, armorAcBonus: 2, acNoShield: 2, xp: 3000, coinGP: 71, hpMax: 7, hpCurr: 5,
    libraryValue: null, workshopValue: null, congregants: null, isSpellcaster: true,
    rulesState: JSON.stringify({ used: { 'arcane:1': 1 }, lastRestDay: 3, adventures: ['old-award'], research: { obsolete: { worked: 3 } } }),
    weapons: { create: { name: 'Sword', damage: '1d6' } },
    proficiencies: { create: { name: 'Alchemy', category: 'class' } },
    items: { create: { name: 'Wand', quantity: 1, weight: 0.1, magicDetails: JSON.stringify({ magicItem: true, identified: true, charges: 4, researchId: 'obsolete' }) } },
    spells: { create: { name: 'Slumber', level: 1, tradition: 'arcane' } }, rituals: { create: { name: 'Sanctuary' } },
    magicFormulae: { create: { name: 'Potion' } }, henchmen: { create: { name: 'Retainer', wage: 12 } },
    scars: { create: { description: 'Old scar' } }, activities: { create: { title: 'Travel', status: 'COMPLETED' } },
    armyUnits: { create: { name: 'Guard' } }, magicItemResearch: { create: { itemName: 'Research', remainingDays: 2 } },
    mercantileVentures: { create: { cargoName: 'Sold silk', status: 'SOLD', profitGp: 10 } }, domain: { create: { strongholdName: 'Tower', treasury: 150, peasantFamilies: 25 } },
  }, include });
  const response = await request({ document: { ...document(portable(source)), computed: { armorClass: { noShield: 999 } }, classDefinition: { name: 'Fake rules', xpPerLevel: '[]' } } });
  assert.equal(response.statusCode, 201, response.body);
  const result = response.json(), imported = result.character;
  ids.push(imported.id);
  assert.notEqual(imported.id, source.id);
  assert.equal(imported.userId, user.id);
  assert.equal(imported.campaignId, null);
  assert.equal(imported.version, 0);
  for (const key of relations) {
    assert.equal(imported[key].length, 1, key);
    assert.notEqual(imported[key][0].id, source[key][0].id, key);
    assert.equal(imported[key][0].characterId, imported.id, key);
  }
  assert.notEqual(imported.domain.id, source.domain.id);
  assert.equal(imported.domain.treasury, 150);
  assert.equal(imported.coinGP, 71);
  assert.equal(imported.xp, 3000);
  assert.equal(imported.hpCurr, 5);
  assert.equal(imported.acNoShield, 4);
  assert.deepEqual(JSON.parse(imported.rulesState), { used: { 'arcane:1': 1 }, lastRestDay: 3 });
  assert.deepEqual(JSON.parse(imported.items[0].magicDetails), { magicItem: true, identified: true, charges: 4 });
  assert.ok(result.warnings.some(message => message.includes('histórico')));
  assert.equal(await db.auditLog.count({ where: { characterId: imported.id, action: 'CHARACTER_IMPORTED' } }), 1);
  assert.equal(await db.auditLog.count({ where: { characterId: imported.id, action: 'ADVENTURE_XP' } }), 0);
});

test('ownership identifiers and unknown nested fields are rejected instead of silently stripped', async () => {
  const previous = await db.character.count({ where: { userId: user.id } });
  for (const character of [
    { characterName: 'Rejected', userId: master.id }, { characterName: 'Rejected', id: 'foreign' },
    { characterName: 'Rejected', campaignId: campaign.id }, { characterName: 'Rejected', items: [{ name: 'Rope', characterId: 'foreign' }] },
    { characterName: 'Rejected', spells: [{ name: 'Slumber', level: 1, untrusted: true }] },
  ]) assert.equal((await request({ document: document(character) })).statusCode, 400);
  assert.equal(await db.character.count({ where: { userId: user.id } }), previous);
});

test('unknown classes become manual while a name can resolve a portable catalog class', async () => {
  const unknown = await request({ document: document({ characterName: 'Free class', className: 'Archivist of Ash', classKey: 'foreign-class', version: 87 }) });
  assert.equal(unknown.statusCode, 201, unknown.body);
  const restored = unknown.json();
  assert.equal(restored.character.classKey, '');
  assert.equal(restored.character.className, 'Archivist of Ash');
  assert.equal(restored.character.version, 0);
  assert.equal(restored.warnings.length, 1);
  const resolved = await request({ document: document({ characterName: 'Catalog class', className: 'Fighter', classKey: 'old-class-id' }) });
  assert.equal(resolved.statusCode, 201, resolved.body);
  assert.equal(resolved.json().character.classKey, 'catalog:fighter');
});

test('campaign imports require accepted membership and keep the caller as owner', async () => {
  const payload = { document: document({ characterName: 'Campaign import', className: 'Fighter' }), campaignId: campaign.id };
  const previous = await db.character.count({ where: { userId: user.id } });
  assert.equal((await request(payload)).statusCode, 403);
  assert.equal(await db.character.count({ where: { userId: user.id } }), previous);
  const membership = await db.campaignMember.create({ data: { campaignId: campaign.id, userId: user.id, status: 'PENDING' } });
  assert.equal((await request(payload)).statusCode, 403);
  await db.campaignMember.update({ where: { id: membership.id }, data: { status: 'ACCEPTED' } });
  const accepted = await request(payload);
  assert.equal(accepted.statusCode, 201, accepted.body);
  assert.equal(accepted.json().character.campaignId, campaign.id);
  assert.equal(accepted.json().character.userId, user.id);
});

test('invalid relations and workflow state fail without leaving partial sheets', async () => {
  const previous = await db.character.count({ where: { userId: user.id } });
  for (const fields of [
    { items: [{ name: 'Rope', quantity: -1 }] }, { spells: [{ name: 'Slumber', level: 7 }] },
    { proficiencies: [{ name: 'Art', category: 'foreign' }] }, { items: [{ name: 'Wand', magicDetails: '[]' }] },
    { items: [{ name: 'Wands', quantity: 2, magicDetails: { charges: 2 } }] },
    { rulesState: JSON.stringify({ used: { 'arcane:1': -1 } }) }, { rulesState: '{invalid' },
    { items: Array.from({ length: 501 }, () => ({ name: 'Rope' })) },
  ]) {
    const rejected = await request({ document: document({ characterName: 'Invalid', ...fields }) });
    assert.equal(rejected.statusCode, 400, rejected.body);
  }
  assert.equal(await db.character.count({ where: { userId: user.id } }), previous);
});

test('legal empty relation placeholders round-trip and tracked research becomes manual with an explicit warning', async () => {
  const response = await request({ document: document({
    characterName: 'Draft placeholders', className: 'Mage',
    items: [{ name: '', quantity: 1 }], proficiencies: [{ name: '', category: 'general' }],
    activities: [{ title: '' }], spells: [{ name: '', level: 1 }],
    magicItemResearch: [{ itemName: 'Existing project', status: 'IN_PROGRESS', remainingDays: 3 }],
    rulesState: JSON.stringify({ research: { 'old-project': { materialsPaid: true } } }),
  }) });
  assert.equal(response.statusCode, 201, response.body);
  const result = response.json();
  assert.equal(result.character.items[0].name, '');
  assert.equal(result.character.proficiencies[0].name, '');
  assert.equal(result.character.activities[0].title, '');
  assert.equal(result.character.spells[0].name, '');
  assert.equal(result.character.magicItemResearch[0].status, 'IN_PROGRESS');
  assert.equal(result.character.magicItemResearch[0].remainingDays, 3);
  assert.equal(JSON.parse(result.character.rulesState).research, undefined);
  assert.ok(result.warnings.some(message => message.includes('registros manuais')));
});

test('the magic planning textarea saves string lines and portable imports retain strings and legacy project objects', async () => {
  const planning = ['New spell: Warding Fire', { title: 'Legacy structured project', weeks: 2 }];
  const imported = await request({ document: document({ characterName: 'Research planning', researchQueue: planning }) });
  assert.equal(imported.statusCode, 201, imported.body);
  const character = imported.json().character;
  assert.deepEqual(JSON.parse(character.researchQueue), planning);
  const saved = await app.inject({ method: 'PUT', url: `/api/characters/${character.id}`, payload: { version: character.version, researchQueue: ['First line', 'Second line'] }, headers: { authorization: `Bearer ${token}` } });
  assert.equal(saved.statusCode, 200, saved.body);
  assert.deepEqual(JSON.parse(saved.json().character.researchQueue), ['First line', 'Second line']);
});
