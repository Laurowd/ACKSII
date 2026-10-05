const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const url = new URL(process.env.TEST_DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test') throw new Error('Use the disposable localhost acks_test database.');
process.env.DATABASE_URL = url.href; process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.CORS_ORIGIN = 'http://127.0.0.1:4173'; process.env.PUBLIC_APP_URL = process.env.CORS_ORIGIN;
const { buildApp } = require('../dist/app');
const db = require('../dist/lib/prisma').default;
const { SPELL_LIST } = require('../dist/lib/gameRules');
const { formulaKey } = require('../dist/lib/spellLearning');
const suffix = randomBytes(6).toString('hex'), users = [];
let app, master, outsider, campaign, mage;
const request = (actor, method, path, payload) => app.inject({ method, url: path, payload, headers: { authorization: `Bearer ${actor.token}` } });
async function account() { const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: `improve_${suffix}_${users.length}`, email: `improve_${suffix}_${users.length}@test.invalid`, password: 'integration-password', role: 'MASTER' } }); assert.equal(response.statusCode, 201, response.body); const data = response.json(); users.push(data.user.id); return data; }
const path = suffix => `/api/game-rules/characters/${mage.id}/${suffix}`;
const current = () => db.character.findUniqueOrThrow({ where: { id: mage.id } });
const version = async () => (await current()).version;
const spell = SPELL_LIST.find(s => s.tradition === 'arcane' && s.level === 1);
before(async () => { app = buildApp(undefined, false); master = await account(); outsider = await account(); campaign = await db.campaign.create({ data: { masterId: master.user.id, name: `Improvements ${suffix}`, joinCode: `improve_${suffix}` } }); mage = await db.character.create({ data: { userId: master.user.id, campaignId: campaign.id, classKey: 'catalog:mage', className: 'Mage', int: 10, level: 1, hpCurr: 4, hpMax: 4 } }); });
after(async () => { if (app) { await db.user.deleteMany({ where: { id: { in: users } } }); await app.close(); } });
test('revision reads preserve access control and reveal only revision metadata', async () => {
  const response = await request(master, 'GET', `/api/characters/${mage.id}/revision`); assert.equal(response.statusCode, 200); assert.deepEqual(Object.keys(response.json()).sort(), ['campaignUpdatedAt', 'updatedAt', 'version']);
  assert.equal((await request(outsider, 'GET', `/api/characters/${mage.id}/revision`)).statusCode, 403);
});
test('formula acquisition requires ownership, catalog membership and a declared source', async () => {
  const body = { version: await version(), spell, source: 'Found in the ruins', available: true };
  assert.equal((await request(outsider, 'POST', path('magic/formulas'), body)).statusCode, 403);
  assert.equal((await request(master, 'POST', path('magic/formulas'), {})).statusCode, 400);
  assert.equal((await request(master, 'POST', path('magic/formulas'), { ...body, source: ' ' })).statusCode, 400);
  assert.equal((await request(master, 'POST', path('magic/formulas'), { ...body, spell: { ...spell, name: 'Invented spell' } })).statusCode, 400);
  const response = await request(master, 'POST', path('magic/formulas'), body); assert.equal(response.statusCode, 200, response.body);
  assert.equal(await db.spell.count({ where: { characterId: mage.id } }), 0); assert.ok(JSON.parse((await current()).spellbook).includes(spell.name));
  assert.equal((await request(master, 'POST', path('magic/formulas'), { ...body, version: await version() })).statusCode, 409);
});
test('study cannot grant a spell before seven dedicated days or consume an unrelated replacement', async () => {
  const body = { version: await version(), studyId: 'first-study', formulaKey: formulaKey(spell), day: 10, available: true };
  assert.equal((await request(master, 'POST', path('magic/study/start'), { ...body, replaceSpellId: 'foreign' })).statusCode, 400);
  const response = await request(master, 'POST', path('magic/study/start'), body); assert.equal(response.statusCode, 200, response.body);
  assert.equal(await db.spell.count({ where: { characterId: mage.id } }), 0);
  assert.equal((await request(master, 'POST', path('magic/study/complete'), { version: await version(), studyId: body.studyId, day: 16, requirementsMet: true })).statusCode, 400);
  const completion = { version: await version(), studyId: body.studyId, day: 17, requirementsMet: true };
  const completed = await request(master, 'POST', path('magic/study/complete'), completion); assert.equal(completed.statusCode, 200, completed.body);
  assert.equal(await db.spell.count({ where: { characterId: mage.id, name: spell.name } }), 1);
  assert.equal((await request(master, 'POST', path('magic/study/complete'), completion)).statusCode, 409);
  assert.ok(JSON.parse((await current()).spellbook).includes(spell.name));
});
test('full repertoire requires replacement at the same level and preserves both formulas', async () => {
  const replacement = SPELL_LIST.find(s => s.tradition === 'arcane' && s.level === 1 && s.name !== spell.name);
  const acquired = await request(master, 'POST', path('magic/formulas'), { version: await version(), spell: replacement, source: 'Purchased formula', available: true }); assert.equal(acquired.statusCode, 200, acquired.body);
  const body = { version: await version(), studyId: 'second-study', formulaKey: formulaKey(replacement), day: 20, available: true };
  assert.equal((await request(master, 'POST', path('magic/study/start'), body)).statusCode, 400);
  const old = await db.spell.findFirstOrThrow({ where: { characterId: mage.id } });
  assert.equal((await request(master, 'POST', path('magic/study/start'), { ...body, replaceSpellId: old.id })).statusCode, 200);
  const response = await request(master, 'POST', path('magic/study/complete'), { version: await version(), studyId: body.studyId, day: 27, requirementsMet: true }); assert.equal(response.statusCode, 200, response.body);
  const spells = await db.spell.findMany({ where: { characterId: mage.id } }); assert.deepEqual(spells.map(s => s.name), [replacement.name]);
  const book = JSON.parse((await current()).spellbook); assert.ok(book.includes(spell.name) && book.includes(replacement.name));
});
test('combat origins validate duplicate sources, item ownership, identification and stale versions', async () => {
  const configuration = { powersEnabled: false, lightArmor: false, modifiers: [{ source: 'Blessing', stat: 'ac', value: 2, active: true }] };
  const payload = { version: await version(), configuration };
  assert.equal((await request(master, 'POST', path('combat/modifiers'), { ...payload, configuration: { ...configuration, modifiers: [...configuration.modifiers, ...configuration.modifiers] } })).statusCode, 400);
  assert.equal((await request(outsider, 'POST', path('combat/modifiers'), payload)).statusCode, 403);
  const item = await db.item.create({ data: { characterId: mage.id, name: 'Unknown ring' } });
  assert.equal((await request(master, 'POST', path('combat/modifiers'), { ...payload, configuration: { ...configuration, modifiers: [{ ...configuration.modifiers[0], itemId: item.id }] } })).statusCode, 400);
  assert.equal((await request(master, 'POST', path('combat/modifiers'), payload)).statusCode, 200);
  assert.equal((await request(master, 'POST', path('combat/modifiers'), payload)).statusCode, 409);
  assert.equal(JSON.parse((await current()).rulesState).combat.modifiers[0].value, 2);
});
test('paginated history keeps the legacy response and filters operations without leaking another campaign', async () => {
  await db.auditLog.createMany({ data: Array.from({ length: 28 }, (_, i) => ({ campaignId: campaign.id, userId: master.user.id, action: 'REWARD_RECEIVED', details: JSON.stringify({ gained: i, gold: 1 }) })) });
  const legacy = await request(master, 'GET', `/api/campaigns/${campaign.id}/audit`); assert.ok(Array.isArray(legacy.json()));
  const first = (await request(master, 'GET', `/api/campaigns/${campaign.id}/audit?page=1&action=REWARD_RECEIVED`)).json();
  const second = (await request(master, 'GET', `/api/campaigns/${campaign.id}/audit?page=2&action=REWARD_RECEIVED`)).json();
  assert.equal(first.total, 28); assert.equal(first.items.length, 25); assert.equal(second.items.length, 3); assert.ok(!second.items.some(log => first.items.some(other => other.id === log.id)));
  assert.equal((await request(outsider, 'GET', `/api/campaigns/${campaign.id}/audit?page=1`)).statusCode, 403);
  assert.equal((await request(master, 'GET', `/api/campaigns/${campaign.id}/audit?page=0`)).statusCode, 400);
});
test('portable imports preserve formulas and manual origins but remove stale item links and studies', async () => {
  const state = { formulas: [{ name: spell.name, level: spell.level, tradition: spell.tradition, source: 'Ruins' }], study: { id: 'original-study', spell }, combat: { powersEnabled: true, lightArmor: true, modifiers: [{ source: 'Blessing', stat: 'ac', value: 1, active: true }, { source: 'Old ring', stat: 'ac', value: 2, active: true, itemId: 'old-item' }] } };
  const response = await request(master, 'POST', '/api/characters/import', { document: { format: 'acks-ii-character', version: 1, character: { characterName: 'Imported study', rulesState: JSON.stringify(state) } } });
  assert.equal(response.statusCode, 201, response.body);
  const restored = JSON.parse(response.json().character.rulesState); assert.deepEqual(restored.formulas, state.formulas); assert.equal(restored.study, undefined); assert.equal(restored.combat.modifiers.length, 1);
  assert.ok(response.json().warnings.some(w => w.includes('Bônus vinculados'))); assert.ok(response.json().warnings.some(w => w.includes('estudo')));
  const invalid = await request(master, 'POST', '/api/characters/import', { document: { format: 'acks-ii-character', version: 1, character: { characterName: 'Invalid combat', rulesState: JSON.stringify({ combat: { ...state.combat, modifiers: [{ source: 'Bad', stat: 'xp', value: 1000, active: true }] } }) } } });
  assert.equal(invalid.statusCode, 400);
});
