const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const url = new URL(process.env.TEST_DATABASE_URL || 'http://missing');
if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test') throw new Error('Use a disposable localhost PostgreSQL database named acks_test.');
Object.assign(process.env, { DATABASE_URL: url.toString(), NODE_ENV: 'production', JWT_SECRET: randomBytes(32).toString('hex'), CORS_ORIGIN: 'https://test.example', PUBLIC_APP_URL: 'https://test.example' });
const { buildApp } = require('../dist/app');
const db = require('../dist/lib/prisma').default;
let app, actor, token, masterToken;
const heroes = {};
const base = { characterName: 'Tribal Warrior', classKey: 'catalog:barbarian', rulesMode: 'standard', str: 13, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6,
  proficiencies: [{ name: 'Ambushing', category: 'class' }, { name: 'Tracking', category: 'general' }] };
const request = (method, url, payload, credential = token) => app.inject({ method, url, payload, headers: { authorization: `Bearer ${credential}` } });
before(async () => {
  const migrated = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.resolve(__dirname, '..'), env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(migrated.status, 0, migrated.stdout + migrated.stderr);
  app = buildApp(undefined, false); await app.ready();
  const suffix = randomBytes(6).toString('hex');
  actor = await db.user.create({ data: { username: `origin_${suffix}`, email: `${suffix}@test.invalid`, passwordHash: 'unused-local-test-only', role: 'PLAYER' } });
  token = app.jwt.sign({ id: actor.id, username: actor.username, role: actor.role, sessionVersion: actor.sessionVersion });
  const master = await db.user.create({ data: { username: `origin_master_${suffix}`, email: `master_${suffix}@test.invalid`, passwordHash: 'unused-local-test-only', role: 'MASTER' } });
  masterToken = app.jwt.sign({ id: master.id, username: master.username, role: master.role, sessionVersion: master.sessionVersion });
});
after(async () => { if (app) await app.close(); else await db.$disconnect(); });

test('all book origins grant exactly two natural proficiencies outside the level-one budget', async () => {
  for (const [origin, names] of [['jutland', ['Climbing', 'Seafaring']], ['skysostan', ['Precise Shooting', 'Riding']], ['ivory-kingdoms', ['Running', 'Endurance']]]) {
    const response = await request('POST', '/api/characters/guided', { ...base, proficiencyOrigin: origin });
    assert.equal(response.statusCode, 201, response.body);
    const hero = response.json().character; heroes[origin] = hero;
    assert.equal(JSON.parse(hero.rulesState).proficiencyOrigin, origin);
    const profs = await db.proficiency.findMany({ where: { characterId: hero.id } });
    assert.equal(profs.length, 9); assert.equal(profs.filter(p => p.category === 'adventuring').length, 5);
    assert.deepEqual(profs.filter(p => p.category === 'natural').map(p => p.name).sort(), [...names].sort());
    assert.equal(profs.filter(p => p.category === 'class').length, 1); assert.equal(profs.filter(p => p.category === 'general').length, 1);
    const overview = await request('GET', `/api/game-rules/characters/${hero.id}`);
    assert.deepEqual(overview.json().budget, { class: 1, general: 1 }); assert.deepEqual(overview.json().issues, []);
  }
});

test('missing origins, forged grants and paid Adventuring are rejected without creating a sheet', async () => {
  const before = await db.character.count({ where: { userId: actor.id } });
  for (const input of [base, { ...base, proficiencyOrigin: 'invented' }, { ...base, classKey: 'catalog:fighter', proficiencyOrigin: 'jutland' },
    { ...base, proficiencyOrigin: 'ivory-kingdoms', proficiencies: [...base.proficiencies, { name: 'Adventuring', category: 'general' }] },
    { ...base, proficiencyOrigin: 'ivory-kingdoms', proficiencies: [...base.proficiencies, { name: 'Running', category: 'natural' }] },
    { ...base, proficiencyOrigin: 'ivory-kingdoms', proficiencies: [...base.proficiencies, { name: 'Caving', category: 'general' }] }]) {
    const response = await request('POST', '/api/characters/guided', input); assert.equal(response.statusCode, 400, response.body);
  }
  assert.equal(await db.character.count({ where: { userId: actor.id } }), before);
});

test('players cannot turn paid choices into grants or remove their automatic proficiencies', async () => {
  const hero = heroes['ivory-kingdoms'];
  const grants = await db.proficiency.findMany({ where: { characterId: hero.id } });
  const free = grants.find(p => p.name === 'Running'), paid = grants.find(p => p.name === 'Ambushing');
  const endpoint = `/api/characters/${hero.id}/proficiencies`;
  for (const [method, url, payload] of [
    ['POST', endpoint, { name: 'Running', category: 'natural' }],
    ['PUT', `${endpoint}/${free.id}`, { category: 'general' }],
    ['PUT', `${endpoint}/${paid.id}`, { category: 'natural' }],
    ['DELETE', `${endpoint}/${free.id}`, {}],
  ]) { const response = await request(method, url, { version: hero.version, ...payload }); assert.equal(response.statusCode, 403, response.body); }
  assert.equal((await db.character.findUnique({ where: { id: hero.id } })).version, hero.version);
  assert.equal(await db.proficiency.count({ where: { characterId: hero.id, category: 'natural' } }), 2);
});

test('repeatable proficiencies may add a paid rank, while single-rank grants cannot be bought twice', async () => {
  for (const [origin, proficiency] of [['jutland', 'Seafaring'], ['skysostan', 'Precise Shooting']]) {
    const response = await request('POST', '/api/characters/guided', { ...base, proficiencyOrigin: origin, proficiencies: [{ name: proficiency, category: 'class' }, { name: 'Tracking', category: 'general' }] });
    assert.equal(response.statusCode, 201, response.body);
  }
  const duplicate = await request('POST', '/api/characters/guided', { ...base, proficiencyOrigin: 'ivory-kingdoms', proficiencies: [{ name: 'Running', category: 'class' }, { name: 'Tracking', category: 'general' }] });
  assert.equal(duplicate.statusCode, 400); assert.match(duplicate.json().message, /não pode ser repetida/);
});

test('natural Climbing advances like a thief without spending a choice or losing manual throw adjustments', async () => {
  const hero = heroes.jutland;
  const climb = await db.proficiency.findFirst({ where: { characterId: hero.id, category: 'natural', name: 'Climbing' } });
  assert.equal(climb.throwTarget, 6);
  await db.proficiency.update({ where: { id: climb.id }, data: { name: 'climbing' } });
  const adjusted = await request('PUT', `/api/characters/${hero.id}/proficiencies/${climb.id}`, { version: hero.version, throwTarget: 9 }); assert.equal(adjusted.statusCode, 200, adjusted.body);
  const current = await db.character.update({ where: { id: hero.id }, data: { xp: 2250, version: { increment: 1 } } });
  const advanced = await request('POST', `/api/game-rules/characters/${hero.id}/advance/apply`, { version: current.version, dice: [6, 6] });
  assert.equal(advanced.statusCode, 200, advanced.body);
  assert.equal(advanced.json().character.level, 2);
  assert.equal(advanced.json().character.proficiencies.find(p => p.id === climb.id).throwTarget, 8);
  const overview = await request('GET', `/api/game-rules/characters/${hero.id}`); assert.deepEqual(overview.json().issues, []);
});

test('portable imports retain origin and natural categories without duplicating grants', async () => {
  const source = await db.character.findUnique({ where: { id: heroes['ivory-kingdoms'].id }, include: { proficiencies: true } });
  const privateKeys = new Set(['id', 'userId', 'campaignId', 'characterId', 'createdAt', 'updatedAt', 'version']);
  const portable = value => Array.isArray(value) ? value.map(portable) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([key]) => !privateKeys.has(key)).map(([key, child]) => [key, portable(child)])) : value;
  const imported = await request('POST', '/api/characters/import', { document: { format: 'acks-ii-character', version: 1, character: portable(source) } });
  assert.equal(imported.statusCode, 201, imported.body);
  const hero = imported.json().character;
  assert.equal(JSON.parse(hero.rulesState).proficiencyOrigin, 'ivory-kingdoms');
  assert.equal(hero.proficiencies.filter(p => p.category === 'natural').length, 2); assert.equal(hero.proficiencies.length, 9);
  const overview = await request('GET', `/api/game-rules/characters/${hero.id}`); assert.deepEqual(overview.json().issues, []);
});

test('the master reviews legacy paid grants before converting them, with version checks and repeat protection', async () => {
  const created = await request('POST', '/api/characters/guided', { ...base, rulesMode: 'manual', exceptionReason: 'Ficha anterior à separação de concessões.', proficiencies: [...base.proficiencies, { name: 'Running', category: 'class' }, { name: 'Endurance', category: 'general' }] }, masterToken);
  assert.equal(created.statusCode, 201, created.body); const hero = created.json().character;
  await db.proficiency.create({ data: { characterId: hero.id, name: 'Adventuring', category: 'general' } });
  const endpoint = `/api/game-rules/characters/${hero.id}/proficiency-origin`;
  const input = { version: hero.version, origin: 'ivory-kingdoms' };
  assert.equal((await request('POST', `${endpoint}/preview`, input)).statusCode, 403);
  const preview = await request('POST', `${endpoint}/preview`, input, masterToken);
  assert.equal(preview.statusCode, 200, preview.body);
  assert.deepEqual(preview.json().converted.map(p => p.name).sort(), ['Endurance', 'Running']);
  assert.deepEqual(preview.json().removed.map(p => p.name), ['Adventuring']); assert.deepEqual(preview.json().issues, []);
  assert.equal(await db.proficiency.count({ where: { characterId: hero.id, category: 'natural' } }), 0);
  await db.character.update({ where: { id: hero.id }, data: { notes: 'Outro editor alterou a ficha.', version: { increment: 1 } } });
  assert.equal((await request('POST', `${endpoint}/apply`, input, masterToken)).statusCode, 409);
  const updated = { ...input, version: hero.version + 1 };
  const applied = await request('POST', `${endpoint}/apply`, updated, masterToken); assert.equal(applied.statusCode, 200, applied.body);
  assert.equal(applied.json().character.proficiencies.filter(p => p.category === 'natural').length, 2);
  assert.equal(applied.json().character.proficiencies.filter(p => ['class','general'].includes(p.category)).length, 2);
  assert.equal(applied.json().character.notes, 'Outro editor alterou a ficha.'); assert.equal(applied.json().character.xp, 0);
  const repeated = await request('POST', `${endpoint}/apply`, updated, masterToken);
  assert.equal(repeated.statusCode, 200, repeated.body); assert.equal(repeated.json().alreadyApplied, true);
  assert.equal(repeated.json().character.version, applied.json().character.version);
  assert.equal(await db.auditLog.count({ where: { characterId: hero.id, action: 'PROFICIENCY_ORIGIN_UPDATED' } }), 1);
});
