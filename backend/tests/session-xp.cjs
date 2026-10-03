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

test('master rewards keep final XP separate from gold and audit each participant exactly once', async () => {
  const a = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  const b = await db.character.create({ data: { userId: player.user.id, campaignId: campaign.id, characterName: 'Reward fighter', classKey: 'catalog:fighter', className: 'Fighter', str: 18, xp: 500, coinGP: 20 } });
  const payload = { awardId: `rewards_${suffix}`, campaignId: campaign.id, reason: 'Return from the ruins', participants: [
    { id: a.id, version: a.version, xp: 300, gold: 75 }, { id: b.id, version: b.version, xp: 2000, gold: 0 },
  ] };
  assert.equal((await request(player, 'POST', '/api/game-rules/rewards/apply', payload)).statusCode, 403);
  assert.equal((await request(other, 'POST', '/api/game-rules/rewards/apply', payload)).statusCode, 403);
  const preview = await request(master, 'POST', '/api/game-rules/rewards/preview', payload);
  assert.equal(preview.statusCode, 200, preview.body);
  assert.equal(preview.json().awards.find(row => row.id === b.id).xp, 2500); // No second prime-requisite bonus.
  assert.equal((await db.character.findUniqueOrThrow({ where: { id: a.id } })).xp, a.xp);
  const applied = await request(master, 'POST', '/api/game-rules/rewards/apply', payload);
  assert.equal(applied.statusCode, 200, applied.body);
  const aa = await db.character.findUniqueOrThrow({ where: { id: a.id } }), bb = await db.character.findUniqueOrThrow({ where: { id: b.id } });
  assert.equal(aa.xp, a.xp + 300); assert.equal(aa.coinGP, a.coinGP + 75); assert.equal(aa.version, a.version + 1);
  assert.equal(bb.xp, 2500); assert.equal(bb.coinGP, 20); assert.equal(bb.level, 1);
  const duplicate = await request(master, 'POST', '/api/game-rules/rewards/apply', payload);
  assert.equal(duplicate.statusCode, 409); assert.equal(duplicate.json().code, 'REWARD_ALREADY_RECORDED');
  assert.equal(await db.auditLog.count({ where: { characterId: a.id, action: 'REWARD_RECEIVED' } }), 1);
  const oldWorkflow = { awardId: payload.awardId, campaignId: campaign.id, treasureGp: 300, participants: [{ id: a.id, version: aa.version, share: 1 }] };
  assert.equal((await request(master, 'POST', '/api/game-rules/adventures/apply', oldWorkflow)).statusCode, 409);
  assert.equal((await db.character.findUniqueOrThrow({ where: { id: a.id } })).xp, aa.xp);
});

test('reward conflicts and invalid recipients roll back all participant updates', async () => {
  const a = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  const b = await db.character.create({ data: { userId: player.user.id, campaignId: campaign.id, characterName: 'Concurrent recipient' } });
  const payload = { awardId: `conflict_${suffix}`, campaignId: campaign.id, reason: 'Session', participants: [{ id: a.id, version: a.version, xp: 100, gold: 10 }, { id: b.id, version: b.version + 1, xp: 100, gold: 10 }] };
  const conflict = await request(master, 'POST', '/api/game-rules/rewards/apply', payload);
  assert.equal(conflict.statusCode, 409); assert.equal(conflict.json().code, 'CHARACTER_CONFLICT');
  assert.equal((await db.character.findUniqueOrThrow({ where: { id: a.id } })).xp, a.xp);
  const outsider = await db.character.findFirstOrThrow({ where: { userId: other.user.id, campaignId: null } });
  assert.equal((await request(master, 'POST', '/api/game-rules/rewards/apply', { ...payload, participants: [payload.participants[0], { id: outsider.id, version: outsider.version, xp: 100, gold: 10 }] })).statusCode, 403);
  assert.equal((await db.character.findUniqueOrThrow({ where: { id: a.id } })).coinGP, a.coinGP);
  assert.equal((await request(master, 'POST', '/api/game-rules/rewards/apply', { ...payload, participants: [payload.participants[0], payload.participants[0]] })).statusCode, 400);
  for (const values of [{ xp: -1, gold: 0 }, { xp: 1.5, gold: 0 }, { xp: 0, gold: 0 }, { xp: 0, gold: -1 }, { xp: 0, gold: 1.5 }]) {
    assert.equal((await request(master, 'POST', '/api/game-rules/rewards/apply', { ...payload, participants: [{ ...payload.participants[0], ...values }] })).statusCode, 400);
  }
});

test('gold-only rewards preserve XP and cannot overflow a character balance', async () => {
  const a = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  const payload = { awardId: `gold_${suffix}`, campaignId: campaign.id, reason: 'Treasure share', participants: [{ id: a.id, version: a.version, xp: 0, gold: 12 }] };
  assert.equal((await request(master, 'POST', '/api/game-rules/rewards/apply', payload)).statusCode, 200);
  const updated = await db.character.findUniqueOrThrow({ where: { id: a.id } });
  assert.equal(updated.xp, a.xp); assert.equal(updated.coinGP, a.coinGP + 12);
  const overflow = { ...payload, awardId: `overflow_${suffix}`, participants: [{ id: a.id, version: updated.version, xp: 2147483647, gold: 0 }] };
  assert.equal((await request(master, 'POST', '/api/game-rules/rewards/apply', overflow)).statusCode, 400);
  assert.equal((await db.character.findUniqueOrThrow({ where: { id: a.id } })).xp, a.xp);
});

test('unassigned reward recipients must belong to the master and book receipts cannot be reused', async () => {
  const a = await db.character.create({ data: { userId: master.user.id, characterName: 'Master standalone', classKey: 'catalog:fighter', className: 'Fighter' } });
  const playerStandalone = await db.character.create({ data: { userId: player.user.id, characterName: 'Player standalone' } });
  const payload = { awardId: `standalone_${suffix}`, reason: 'Session', participants: [{ id: a.id, version: a.version, xp: 20, gold: 1 }] };
  assert.equal((await request(master, 'POST', '/api/game-rules/rewards/preview', payload)).statusCode, 200);
  assert.equal((await request(master, 'POST', '/api/game-rules/rewards/apply', { ...payload, participants: [{ id: playerStandalone.id, version: playerStandalone.version, xp: 20, gold: 1 }] })).statusCode, 403);
  assert.equal((await request(master, 'POST', '/api/game-rules/adventures/apply', { awardId: payload.awardId, treasureGp: 5, participants: [{ id: a.id, version: a.version, share: 1 }] })).statusCode, 200);
  assert.equal((await request(master, 'POST', '/api/game-rules/rewards/apply', payload)).json().code, 'REWARD_ALREADY_RECORDED');
});
test('simultaneous reward confirmations credit XP and gold at most once', async () => {
  const current = await db.character.findUniqueOrThrow({ where: { id: character.id } });
  const payload = { awardId: `simultaneous_${suffix}`, campaignId: campaign.id, reason: 'Session', participants: [{ id: current.id, version: current.version, xp: 10, gold: 1 }] };
  const responses = await Promise.all([request(master, 'POST', '/api/game-rules/rewards/apply', payload), request(master, 'POST', '/api/game-rules/rewards/apply', payload)]);
  assert.deepEqual(responses.map(r => r.statusCode).sort(), [200, 409]);
  const after = await db.character.findUniqueOrThrow({ where: { id: current.id } });
  assert.equal(after.xp, current.xp + 10); assert.equal(after.coinGP, current.coinGP + 1); assert.equal(after.version, current.version + 1);
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
