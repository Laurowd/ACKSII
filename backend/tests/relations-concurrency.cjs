const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Tests may only write to an explicitly supplied disposable local database.
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
const suffix = randomBytes(6).toString('hex');
let app, owner, master, outsider, campaign, ownerToken, masterToken, outsiderToken;
const characterIds = [];

async function request(method, endpoint, payload, token = ownerToken) {
  return app.inject({ method, url: endpoint, payload, headers: { authorization: `Bearer ${token}` } });
}
async function newCharacter() {
  const character = await db.character.create({ data: { userId: owner.id, campaignId: campaign.id, characterName: `Concurrency ${suffix}`, isSpellcaster: true, coinGP: 100 } });
  characterIds.push(character.id);
  return character;
}
async function current(characterId) { return db.character.findUniqueOrThrow({ where: { id: characterId } }); }
function assertRevision(response, previous, status = 200) {
  assert.equal(response.statusCode, status, response.body);
  const result = response.json();
  assert.equal(result.version, previous + 1, response.body);
  assert.equal(result.character.version, result.version);
  assert.ok(result.character.id);
  return result;
}
before(async () => {
  const migrated = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.resolve(__dirname, '..'), env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(migrated.status, 0, migrated.stdout + migrated.stderr);
  app = buildApp(undefined, false);
  await app.ready();
  [owner, master, outsider] = await Promise.all(['PLAYER', 'MASTER', 'MASTER'].map((role, index) => db.user.create({ data: { username: `relations_${suffix}_${index}`, email: `relations_${suffix}_${index}@test.invalid`, passwordHash: 'test-only', role } })));
  campaign = await db.campaign.create({ data: { name: `Relations ${suffix}`, masterId: master.id, joinCode: suffix } });
  [ownerToken, masterToken, outsiderToken] = [owner, master, outsider].map(user => app.jwt.sign({ id: user.id, username: user.username, role: user.role, sessionVersion: user.sessionVersion }));
});
after(async () => {
  if (owner) {
    await db.auditLog.deleteMany({ where: { characterId: { in: characterIds } } });
    await db.character.deleteMany({ where: { id: { in: characterIds } } });
    if (campaign) await db.campaign.delete({ where: { id: campaign.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, master.id, outsider.id] } } });
  }
  if (app) await app.close(); else await db.$disconnect();
});

test('relation requests require the sheet revision and preserve revision on invalid input', async () => {
  const c = await newCharacter(), base = `/api/characters/${c.id}`;
  for (const [method, endpoint, payload] of [
    ['POST', '/items', { name: 'Rope' }], ['PUT', '/items/missing', { quantity: 2 }], ['DELETE', '/items/missing', {}],
    ['POST', '/spells', { name: 'Slumber' }], ['PUT', '/proficiencies/missing', { name: 'Art' }], ['PUT', '/domain', { treasury: 5 }],
    ['POST', '/shop/purchase', { entryId: 'i-torch' }], ['POST', '/maintenance/recalculate', {}],
  ]) assert.equal((await request(method, base + endpoint, payload)).statusCode, 400);
  assert.equal((await request('POST', base + '/items', { version: -1, name: 'Rope' })).statusCode, 400);
  assert.equal((await current(c.id)).version, 0);
  assert.equal(await db.item.count({ where: { characterId: c.id } }), 0);
});

test('every relation create, edit and delete advances the sheet once and returns its revision', async () => {
  const c = await newCharacter(), base = `/api/characters/${c.id}`;
  let version = c.version;
  for (const [route, entity, create, edit] of [
    ['weapons', 'weapon', { name: 'Sword' }, { name: 'Named sword' }],
    ['proficiencies', 'proficiency', { name: 'Art' }, { name: 'Artisan', throwTarget: 0 }],
    ['items', 'item', { name: 'Rope' }, { quantity: 2 }],
    ['spells', 'spell', { name: 'Slumber', level: 1 }, { name: 'Sleep' }],
    ['rituals', 'ritual', { name: 'Ritual' }, { name: 'Ritual II' }],
    ['magic-formulae', 'formula', { name: 'Formula' }, { name: 'Formula II' }],
    ['magic-research', 'research', { itemName: 'Potion' }, { itemName: 'Potion II' }],
    ['mercantile', 'venture', { cargoName: 'Silk' }, { cargoName: 'Wool' }],
    ['scars', 'scar', {}, { description: 'Healed wound' }],
    ['henchmen', 'henchman', {}, { name: 'Retainer', wage: 10 }],
    ['activities', 'activity', { title: 'Travel' }, { title: 'Study' }],
    ['armyUnits', 'unit', { name: 'Guard' }, { name: 'Veterans' }],
  ]) {
    const actor = ['proficiencies','spells'].includes(route) ? masterToken : ownerToken;
    const created = await request('POST', `${base}/${route}`, { version, ...create }, actor);
    assert.ok([200, 201].includes(created.statusCode), created.body);
    const result = assertRevision(created, version, created.statusCode);
    const entityId = result[entity].id;
    version = result.version;
    version = assertRevision(await request('PUT', `${base}/${route}/${entityId}`, { version, ...edit }, actor), version).version;
    version = assertRevision(await request('DELETE', `${base}/${route}/${entityId}`, { version }, actor), version).version;
  }
  version = assertRevision(await request('PUT', `${base}/domain`, { version, treasury: 25, peasantFamilies: 10 }), version).version;
  version = assertRevision(await request('PUT', `${base}/domain`, { version, treasury: 30 }), version).version;
  assert.equal((await current(c.id)).version, version);
});

test('owner and campaign master competing for one item cannot overwrite each other', async () => {
  const c = await newCharacter(), base = `/api/characters/${c.id}`;
  const added = assertRevision(await request('POST', base + '/items', { version: c.version, name: 'Original' }), c.version, 201);
  const responses = await Promise.all([
    request('PUT', `${base}/items/${added.item.id}`, { version: added.version, name: 'Owner edit' }, ownerToken),
    request('PUT', `${base}/items/${added.item.id}`, { version: added.version, name: 'Master edit' }, masterToken),
  ]);
  assert.deepEqual(responses.map(r => r.statusCode).sort(), [200, 409], responses.map(r => r.body).join('\n'));
  const winner = responses.find(r => r.statusCode === 200).json();
  assert.equal(responses.find(r => r.statusCode === 409).json().code, 'CHARACTER_CONFLICT');
  assert.equal((await db.item.findUniqueOrThrow({ where: { id: added.item.id } })).name, winner.item.name);
  assert.equal((await current(c.id)).version, added.version + 1);
});

test('a manual relation edit and a scalar sheet save share one concurrency boundary', async () => {
  const c = await newCharacter(), base = `/api/characters/${c.id}`;
  const responses = await Promise.all([
    request('POST', base + '/items', { version: c.version, name: 'Concurrent rope' }),
    request('PUT', base, { version: c.version, notes: 'Concurrent notes' }),
  ]);
  assert.equal(responses.filter(r => [200, 201].includes(r.statusCode)).length, 1, responses.map(r => r.body).join('\n'));
  assert.equal(responses.filter(r => r.statusCode === 409).length, 1, responses.map(r => r.body).join('\n'));
  assert.equal(responses.find(r => r.statusCode === 409).json().code, 'CHARACTER_CONFLICT');
  const stored = await current(c.id);
  assert.equal(stored.version, 1);
  assert.equal(await db.item.count({ where: { characterId: c.id } }), responses[0].statusCode === 201 ? 1 : 0);
  assert.equal(stored.notes, responses[1].statusCode === 200 ? 'Concurrent notes' : '');
});

test('stale create/delete and invalid saves leave relations and sheet revision intact', async () => {
  const c = await newCharacter(), base = `/api/characters/${c.id}`;
  const added = assertRevision(await request('POST', base + '/items', { version: 0, name: 'Rope' }), 0, 201);
  for (const [method, endpoint, fields] of [
    ['POST', '/spells', { name: 'Slumber' }], ['DELETE', `/items/${added.item.id}`, {}],
  ]) {
    const denied = await request(method, base + endpoint, { version: 0, ...fields });
    assert.equal(denied.statusCode, 409, denied.body);
    assert.equal(denied.json().code, 'CHARACTER_CONFLICT');
  }
  assert.equal((await request('PUT', `${base}/items/${added.item.id}`, { version: added.version, name: '   ' })).statusCode, 400);
  assert.equal((await current(c.id)).version, added.version);
  assert.equal(await db.spell.count({ where: { characterId: c.id } }), 0);
  assert.equal((await db.item.findUniqueOrThrow({ where: { id: added.item.id } })).name, 'Rope');
});

test('permission and relation ownership are checked inside the same transaction', async () => {
  const c = await newCharacter(), other = await newCharacter(), base = `/api/characters/${c.id}`;
  const foreign = await db.item.create({ data: { characterId: other.id, name: 'Foreign rope' } });
  assert.equal((await request('POST', base + '/items', { version: 0, name: 'Intrusion' }, outsiderToken)).statusCode, 403);
  assert.equal((await request('PUT', `${base}/items/${foreign.id}`, { version: 0, name: 'Intrusion' })).statusCode, 404);
  assert.equal((await request('DELETE', `${base}/items/${foreign.id}`, { version: 0 })).statusCode, 404);
  assert.equal((await current(c.id)).version, 0);
  assert.equal((await db.item.findUniqueOrThrow({ where: { id: foreign.id } })).name, 'Foreign rope');
});

test('purchases and maintenance return the committed revision without a duplicate bump', async () => {
  const c = await newCharacter(), base = `/api/characters/${c.id}`;
  const purchase = assertRevision(await request('POST', base + '/shop/purchase', { version: 0, entryId: 'i-torch' }), 0, 201);
  assert.equal(purchase.character.coinGP, 99);
  assert.equal(purchase.character.coinSP, 9);
  assert.equal((await request('POST', base + '/shop/purchase', { version: 0, entryId: 'i-torch' })).statusCode, 409);
  const henchman = assertRevision(await request('POST', base + '/henchmen', { version: purchase.version }), purchase.version);
  const wage = assertRevision(await request('PUT', `${base}/henchmen/${henchman.henchman.id}`, { version: henchman.version, wage: 12 }), henchman.version);
  const maintenance = assertRevision(await request('POST', base + '/maintenance/recalculate', { version: wage.version }), wage.version);
  assert.equal(maintenance.monthlyUpkeepGp, 12);
  assert.equal(maintenance.character.monthlyUpkeepGp, 12);
});

test('manual XP changes require the responsible master while ordinary autosaves keep existing XP', async () => {
  const c = await newCharacter(), base = `/api/characters/${c.id}`;
  for (const fields of [{ xp: 100 }, { xpFromTreasure: 100 }]) {
    const forbidden = await request('PUT', base, { version: c.version, ...fields });
    assert.equal(forbidden.statusCode, 403, forbidden.body);
    assert.equal(forbidden.json().code, 'MASTER_XP_REQUIRED');
  }
  assert.equal((await current(c.id)).version, 0);
  const ordinary = await request('PUT', base, { version: 0, xp: 0, xpFromTreasure: 0, notes: 'Ordinary autosave' });
  assert.equal(ordinary.statusCode, 200, ordinary.body);
  const masterEdit = await request('PUT', base, { version: ordinary.json().character.version, xp: 50 }, masterToken);
  assert.equal(masterEdit.statusCode, 200, masterEdit.body);
  const strangerOwned = await db.character.create({ data: { userId: outsider.id, campaignId: campaign.id } });
  characterIds.push(strangerOwned.id);
  assert.equal((await request('PUT', `/api/characters/${strangerOwned.id}`, { version: 0, xp: 50 }, outsiderToken)).statusCode, 403);
  const standalone = await db.character.create({ data: { userId: master.id } });
  characterIds.push(standalone.id);
  const standaloneEdit = await request('PUT', `/api/characters/${standalone.id}`, { version: 0, xp: 25 }, masterToken);
  assert.equal(standaloneEdit.statusCode, 200, standaloneEdit.body);
});

test('saving ordinary sheet fields preserves a manual weapon attack target when class and level stay unchanged', async () => {
  const c = await db.character.create({ data: { userId: owner.id, campaignId: campaign.id, characterName: 'Manual attack', className: 'Fighter', classKey: 'catalog:fighter', level: 1, hpMax: 8, hpCurr: 8, weapons: { create: { name: 'Sword', attackThrow: 10 } } }, include: { weapons: true } });
  characterIds.push(c.id);
  const base = `/api/characters/${c.id}`;
  const changed = assertRevision(await request('PUT', `${base}/weapons/${c.weapons[0].id}`, { version: 0, attackThrow: 12 }), 0);
  const full = await current(c.id);
  const saved = await request('PUT', base, { ...full, version: changed.version, hpCurr: 5 });
  assert.equal(saved.statusCode, 200, saved.body);
  assert.equal(saved.json().character.hpCurr, 5);
  assert.equal((await db.weapon.findUniqueOrThrow({ where: { id: c.weapons[0].id } })).attackThrow, 12);
});
