const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const url = new URL(process.env.TEST_DATABASE_URL || 'http://missing');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test') throw new Error('Use only an explicit disposable local acks_test database.');
Object.assign(process.env, { DATABASE_URL: url.toString(), NODE_ENV: 'test', JWT_SECRET: randomBytes(32).toString('hex'), CORS_ORIGIN: 'https://test.example', PUBLIC_APP_URL: 'https://test.example' });
const { buildApp } = require('../dist/app');
const db = require('../dist/lib/prisma').default;
let app, master, player, other, campaign, a, b, secret;
const suffix = randomBytes(6).toString('hex');
const input = { name: `Chama Oculta ${suffix}`, level: 1, tradition: 'arcane', description: 'Efeito secreto: chama azul que ilumina sem calor.', types:['sum'], range: '60 pés', duration: '1 turno', visibility: 'SECRET', characterIds: [] };
const request = (method, url, payload, actor = master) => app.inject({ method, url, payload, headers: { authorization: `Bearer ${actor.token}` } });
async function actor(role, label) {
  const user = await db.user.create({ data: { role, username: `${label}_${suffix}`, email: `${label}_${suffix}@test.invalid`, passwordHash: 'unused-local-fixture' } });
  return { ...user, token: app.jwt.sign({ id: user.id, username: user.username, role, sessionVersion: 0 }) };
}
before(async () => {
  const migrated = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.resolve(__dirname, '..'), env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(migrated.status, 0, migrated.stderr + migrated.stdout);
  app = buildApp(undefined, false); await app.ready();
  master = await actor('MASTER', 'brew_master'); player = await actor('PLAYER', 'brew_player'); other = await actor('MASTER', 'brew_other');
  campaign = await db.campaign.create({ data: { name: `Homebrew ${suffix}`, joinCode: suffix.slice(0, 6).toUpperCase(), masterId: master.id, members: { create: [{ userId: player.id, status: 'ACCEPTED' }] } } });
  const sheet = { userId: player.id, campaignId: campaign.id, characterName: 'Aprendiz', className: 'Mage', classKey: 'catalog:mage', level: 1, hpMax: 4, hpCurr: 4, int: 16 };
  a = await db.character.create({ data: sheet }); b = await db.character.create({ data: { ...sheet, characterName: 'Outro aprendiz' } });
});
after(async () => { if (app) await app.close(); else await db.$disconnect(); });
test('secret homebrew is absent from every player catalog and direct management is forbidden', async () => {
  const created = await request('POST', `/api/campaigns/${campaign.id}/spells`, input);
  assert.equal(created.statusCode, 200, created.body); secret = created.json().spell;
  assert.equal(secret.visibility, 'SECRET');
  assert.deepEqual(secret.types,['sum']);
  assert.equal((await request('POST',`/api/campaigns/${campaign.id}/spells`,{...input,name:'Invalid classification',types:['not-a-book-type']})).statusCode,400);
  for (const [path, who] of [[`/api/campaigns/${campaign.id}/spell-options`, player], [`/api/campaigns/${campaign.id}/spell-options?characterId=${a.id}`, player], [`/api/game-rules/characters/${a.id}`, player], ['/api/game-rules/metadata', player], ['/api/campaigns', player]]) {
    const response = await request('GET', path, undefined, who);
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.body.includes(input.name), false, path); assert.equal(response.body.includes(input.description), false, path);
  }
  for (const who of [player, other]) {
    assert.equal((await request('GET', `/api/campaigns/${campaign.id}/spells`, undefined, who)).statusCode, 404);
    assert.equal((await request('PUT', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { ...input, version: 0, visibility: 'CAMPAIGN' }, who)).statusCode, 404);
    assert.equal((await request('POST', `/api/campaigns/${campaign.id}/spells`, { ...input, name: 'Unauthorized' }, who)).statusCode, 404);
    assert.equal((await request('DELETE', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { version: 0 }, who)).statusCode, 404);
  }
  const denied = await request('POST', `/api/game-rules/characters/${a.id}/magic/repertoire`, { version: a.version, spells: [{ name: secret.name, level: 1, tradition: 'arcane' }] }, player);
  assert.equal(denied.statusCode, 400, denied.body); assert.equal(await db.spell.count({ where: { characterId: a.id } }), 0);
});
test('individual reveal is scoped to the character, including other sheets owned by the same player', async () => {
  const revealed = await request('PUT', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { ...input, version: secret.version, visibility: 'CHARACTERS', characterIds: [a.id] });
  assert.equal(revealed.statusCode, 200, revealed.body); secret = revealed.json().spell;
  assert.equal((await request('GET', `/api/campaigns/${campaign.id}/spell-options`, undefined, player)).json().spells.length, 0);
  assert.equal((await request('GET', `/api/campaigns/${campaign.id}/spell-options?characterId=${b.id}`, undefined, player)).json().spells.length, 0);
  const choices = (await request('GET', `/api/campaigns/${campaign.id}/spell-options?characterId=${a.id}`, undefined, player)).json().spells;
  assert.equal(choices.length, 1); assert.equal(choices[0].description, input.description);
  assert.equal('characterIds' in choices[0], false); assert.equal('visibility' in choices[0], false);
  assert.equal((await request('GET', `/api/campaigns/${campaign.id}/spell-options?characterId=${a.id}`, undefined, other)).statusCode, 404);
  const outsiderSheet = await db.character.create({ data: { userId: other.id, characterName: 'Fora da campanha' } });
  assert.equal((await request('PUT', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { ...input, version: secret.version, visibility: 'CHARACTERS', characterIds: [outsiderSheet.id] })).statusCode, 400);
  assert.equal((await request('POST', `/api/game-rules/characters/${b.id}/magic/repertoire`, { version: b.version, spells: [{ name: secret.name, level: 1, tradition: 'arcane' }] }, player)).statusCode, 400);
});
test('revealed homebrew supports acquisition, a week of study, normal daily uses and version conflicts', async () => {
  const base = `/api/game-rules/characters/${a.id}`;
  const spell = { name: secret.name, level: 1, tradition: 'arcane' };
  const formula = await request('POST', `${base}/magic/formulas`, { version: a.version, spell, source: 'Descoberta em jogo', available: true }, player);
  assert.equal(formula.statusCode, 200, formula.body); a = formula.json().character;
  const formulaKey = `arcane:1:${secret.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const started = await request('POST', `${base}/magic/study/start`, { version: a.version, studyId: `homebrew-${suffix}`, formulaKey, day: 10, available: true }, player);
  assert.equal(started.statusCode, 200, started.body); a = started.json().character;
  assert.equal((await request('POST', `${base}/magic/study/complete`, { version: a.version, studyId: `homebrew-${suffix}`, day: 16, requirementsMet: true }, player)).statusCode, 400);
  const completed = await request('POST', `${base}/magic/study/complete`, { version: a.version, studyId: `homebrew-${suffix}`, day: 17, requirementsMet: true }, player);
  assert.equal(completed.statusCode, 200, completed.body); a = completed.json().character;
  assert.equal(a.spells.length, 1);
  const cast = await request('POST', `${base}/magic/cast`, { version: a.version, spellId: a.spells[0].id }, player);
  assert.equal(cast.statusCode, 200, cast.body);
  assert.equal((await request('POST', `${base}/magic/cast`, { version: a.version, spellId: a.spells[0].id }, player)).statusCode, 400);
  a = cast.json().character;
  assert.equal(JSON.parse(a.rulesState).used['arcane:1'], 1);
  assert.equal((await request('POST', `${base}/magic/rest`, { version: a.version - 1, day: 18, hours: 8, requirementsMet: true }, player)).statusCode, 409);
  const rested = await request('POST', `${base}/magic/rest`, { version: a.version, day: 18, hours: 8, requirementsMet: true }, player);
  assert.equal(rested.statusCode, 200, rested.body); a = rested.json().character;
  const overview = await request('GET', base, undefined, player);
  assert.deepEqual(overview.json().issues, []); assert.equal(overview.json().campaignSpells[0].description, input.description);
});
test('homebrew retains class levels and repertoire limits and cannot be hidden or deleted while learned', async () => {
  const tooHigh = await request('POST', `/api/campaigns/${campaign.id}/spells`, { ...input, name: `Alta ${suffix}`, level: 6, visibility: 'CAMPAIGN' });
  assert.equal(tooHigh.statusCode, 200, tooHigh.body);
  const save = data => request('POST', `/api/game-rules/characters/${a.id}/magic/repertoire`, { version: a.version, ...data }, player);
  assert.equal((await save({ spells: [{ name: `Alta ${suffix}`, level: 6, tradition: 'arcane' }] })).statusCode, 400);
  assert.equal((await save({ spells: [a.spells[0], { name: 'Arcane Armor', level: 1, tradition: 'arcane' }, { name: 'Slumber', level: 1, tradition: 'arcane' }, { name: 'False Sound', level: 1, tradition: 'arcane' }].map(({ name, level, tradition }) => ({ name, level, tradition })) })).statusCode, 400);
  assert.equal((await request('PUT', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { ...input, version: secret.version, visibility: 'SECRET' })).statusCode, 409);
  assert.equal((await request('PUT', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { ...input, name: `Mudada ${suffix}`, version: secret.version, visibility: 'CHARACTERS', characterIds: [a.id] })).statusCode, 409);
  assert.equal((await request('DELETE', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { version: secret.version })).statusCode, 409);
  const update = await request('PUT', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { ...input, description: 'Descrição revisada', version: secret.version, visibility: 'CHARACTERS', characterIds: [a.id] });
  assert.equal(update.statusCode, 200, update.body);
  assert.equal((await request('PUT', `/api/campaigns/${campaign.id}/spells/${secret.id}`, { ...input, version: secret.version, visibility: 'CHARACTERS', characterIds: [a.id] })).statusCode, 409);
  secret = update.json().spell;
  assert.equal((await request('POST', `/api/campaigns/${campaign.id}/spells`, { ...input, name: ` ${input.name.toUpperCase()} ` })).statusCode, 409);
  assert.equal((await request('POST', `/api/campaigns/${campaign.id}/spells`, { ...input, name: 'Arcane Armor' })).statusCode, 400);
});
test('campaign-wide publication is available during guided creation without automatically granting the spell', async () => {
  const shared = { ...input, name: `Luz Pública ${suffix}`, visibility: 'CAMPAIGN' };
  assert.equal((await request('POST', `/api/campaigns/${campaign.id}/spells`, shared)).statusCode, 200);
  const options = (await request('GET', `/api/campaigns/${campaign.id}/spell-options`, undefined, player)).json().spells;
  assert.equal(options.some(spell => spell.name === shared.name), true); assert.deepEqual(options.find(spell=>spell.name===shared.name).types,['sum']); assert.equal(options.some(spell => spell.name === secret.name), false);
  assert.equal(await db.spell.count({ where: { characterId: b.id } }), 0);
  const create = await request('POST', '/api/characters/guided', { campaignId: campaign.id, classKey: 'catalog:mage', characterName: 'Nova aprendiz', rulesMode: 'standard', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 4, proficiencies: [{ name: 'Alchemy', category: 'class' }, { name: 'Caving', category: 'general' }], spells: [{ name: shared.name, level: 1, tradition: 'arcane' }] }, player);
  assert.equal(create.statusCode, 201, create.body);
  assert.equal(await db.spell.count({ where: { characterId: create.json().character.id, name: shared.name } }), 1);
});
test('removed members cannot use an old owned sheet to read new campaign effects', async () => {
  await db.campaignMember.delete({ where: { campaignId_userId: { campaignId: campaign.id, userId: player.id } } });
  assert.equal((await request('GET', `/api/campaigns/${campaign.id}/spell-options?characterId=${a.id}`, undefined, player)).statusCode, 404);
  const info = await request('GET', `/api/game-rules/characters/${a.id}`, undefined, player);
  assert.equal(info.statusCode, 200, info.body); assert.deepEqual(info.json().campaignSpells, []);
  assert.equal(info.body.includes('Descrição revisada'), false);
  assert.equal((await request('POST', `/api/game-rules/characters/${a.id}/magic/cast`, { version: a.version, spellId: a.spells[0].id }, player)).statusCode, 400);
});
