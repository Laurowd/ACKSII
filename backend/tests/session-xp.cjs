const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const url = new URL(process.env.TEST_DATABASE_URL || 'http://missing');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test') throw new Error('Use an explicit disposable localhost acks_test database.');
process.env.DATABASE_URL = url.toString(); process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.CORS_ORIGIN = 'http://127.0.0.1:4173'; process.env.PUBLIC_APP_URL = process.env.CORS_ORIGIN;
const { buildApp } = require('../dist/app');
const db = require('../dist/lib/prisma').default;
const suffix = randomBytes(6).toString('hex'), users = [];
let app, master, other, player, campaign, character;
const request = (account, method, path, payload) => app.inject({ method, url: path, payload, headers: { authorization: `Bearer ${account.token}` } });
async function account(role) {
  const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: `${role}_${suffix}_${users.length}`, email: `${suffix}_${users.length}@test.invalid`, password: 'session-test-password', role } });
  assert.equal(response.statusCode, 201, response.body); const value = response.json(); users.push(value.user.id); return value;
}
before(async () => {
  app = buildApp(undefined, false); master = await account('MASTER'); other = await account('MASTER'); player = await account('PLAYER');
  campaign = await db.campaign.create({ data: { name: 'Session campaign', masterId: master.user.id, joinCode: `session_${suffix}` } });
  character = await db.character.create({ data: { userId: player.user.id, campaignId: campaign.id, characterName: 'Session mage', classKey: 'catalog:mage', className: 'Mage', level: 2, dex: 16, armorAcBonus: 2, xp: 100, rulesState: JSON.stringify({ used: { 'arcane:1': 1 }, lastRestDay: 4 }), items: { create: { name: 'Rope', quantity: 1, weight: 6 } } } });
  await db.character.create({ data: { userId: other.user.id, characterName: 'Private outsider' } });
});
after(async () => { if (app) { await db.user.deleteMany({ where: { id: { in: users } } }); await app.close(); } });
test('session view includes owned campaigns and their players, and hides unrelated sheets', async () => {
  const response = await request(master, 'GET', '/api/session'); assert.equal(response.statusCode, 200, response.body);
  const data = response.json(); assert.equal(data.campaigns.length, 1); assert.equal(data.characters.length, 1);
  const row = data.characters[0]; assert.equal(row.id, character.id); assert.equal(row.classDefinition.name, 'Mage');
  assert.equal(row.magic.pools[0].slots[0], 2); assert.equal(row.magic.used['arcane:1'], 1); assert.equal(row.magic.lastRestDay, 4);
  assert.deepEqual(Object.keys(row.user), ['username']); assert.ok(!response.body.includes('passwordHash'));
  assert.equal((await request(player, 'GET', '/api/session')).statusCode, 403);
  assert.ok(!(await request(other, 'GET', '/api/session')).json().characters.some(c => c.id === character.id));
});
test('only the responsible master can adjust XP, with an audited reason and version', async () => {
  const path = `/api/game-rules/characters/${character.id}/xp/adjust`, payload = { version: character.version, delta: 50, reason: 'Correction after session review' };
  assert.equal((await request(player, 'POST', path, payload)).statusCode, 403);
  assert.equal((await request(other, 'POST', path, payload)).statusCode, 403);
  assert.equal((await request(master, 'POST', path, { ...payload, reason: '   ' })).statusCode, 400);
  const response = await request(master, 'POST', path, payload); assert.equal(response.statusCode, 200, response.body);
  const changed = response.json().character; assert.equal(changed.xp, 150); assert.equal(changed.version, character.version + 1);
  assert.equal((await request(master, 'POST', path, payload)).statusCode, 409);
  assert.equal((await request(master, 'POST', path, { ...payload, version: changed.version, delta: -151 })).statusCode, 400);
  assert.equal(await db.auditLog.count({ where: { characterId: character.id, action: 'XP_ADJUSTMENT' } }), 1);
  const blocked = await request(master, 'POST', `/api/characters/${character.id}/treasure/convert-xp`, { awardId: 'same-session', gp: 50 });
  assert.equal(blocked.statusCode, 409); assert.equal(blocked.json().code, 'USE_ADVENTURE_SETTLEMENT');
  assert.equal((await db.character.findUnique({ where: { id: character.id } })).xp, 150);
});
test('adventure settlement rejects duplicate participants and blank identifiers', async () => {
  const current = await db.character.findUnique({ where: { id: character.id } });
  const participant = { id: current.id, version: current.version, share: 1 }, payload = { awardId: 'session', campaignId: campaign.id, treasureGp: 10, participants: [participant, participant] };
  assert.equal((await request(master, 'POST', '/api/game-rules/adventures/apply', payload)).statusCode, 400);
  assert.equal((await request(master, 'POST', '/api/game-rules/adventures/apply', { ...payload, awardId: ' ', participants: [participant] })).statusCode, 400);
  assert.equal((await request(player, 'POST', '/api/game-rules/adventures/apply', { ...payload, participants: [participant] })).statusCode, 403);
});
test('session custom class profiles match the catalog representation used by the sheet', async () => {
  const custom = await db.customClass.create({ data: { campaignId: campaign.id, name: 'Initiative specialist', creationRules: JSON.stringify({ ruleProfile: { initiative: 2, initiativeSource: 'Campaign power' } }) } });
  const added = await db.character.create({ data: { userId: player.user.id, campaignId: campaign.id, characterName: 'Campaign specialist', className: custom.name, classKey: custom.id } });
  const response = await request(master, 'GET', '/api/session'); assert.equal(response.statusCode, 200);
  const row = response.json().characters.find(c => c.id === added.id);
  assert.equal(row.classDefinition.source, 'campaign'); assert.equal(row.classDefinition.ruleProfile.initiative, 2);
});

test('session resolves old racial class references to the same canonical rules as the sheet',async()=>{
  const {RAW_DEFAULT_CLASSES}=require('../dist/utils/seedClasses');
  const base=RAW_DEFAULT_CLASSES.find(c=>c.name==='Elven Spellsword');
  const old=await db.customClass.create({data:{campaignId:campaign.id,name:base.name,hitDie:base.hitDie,conBonus:base.conBonus,...Object.fromEntries(['xpPerLevel','titles','attackThrows','savingThrows'].map(key=>[key,JSON.stringify(base[key])]))}});
  const added=await db.character.create({data:{userId:player.user.id,campaignId:campaign.id,characterName:'Legacy elven caster',className:old.name,classKey:old.id,level:1}});
  const response=await request(master,'GET','/api/session');assert.equal(response.statusCode,200,response.body);
  const row=response.json().characters.find(c=>c.id===added.id);
  assert.equal(row.classDefinition.id,'catalog:elven-spellsword');
  assert.equal(row.classDefinition.maxLevel,10);
  assert.equal(row.magic.supported,true);
  assert.equal(row.magic.pools[0].casterLevel,1);
  assert.ok(await db.customClass.findUnique({where:{id:old.id}}));
});
