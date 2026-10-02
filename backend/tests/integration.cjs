const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Never fall back to backend/.env: these tests write only to an explicit local test DB.
const url = new URL(process.env.TEST_DATABASE_URL || 'http://missing');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test') {
  throw new Error('Set TEST_DATABASE_URL to a disposable localhost PostgreSQL database named acks_test.');
}
process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.CORS_ORIGIN = 'https://test.example';
process.env.PUBLIC_APP_URL = 'https://test.example';
const { buildApp } = require('../dist/app');
const db = require('../dist/lib/prisma').default;
const { hashResetToken } = require('../dist/lib/passwordReset');
let app, auth, user, character;
const suffix = randomBytes(6).toString('hex');
const password = 'a-local-test-password';
async function request(method, url, payload, token = auth) {
  const relation = url.match(/^\/api\/characters\/([^/]+)\/(weapons|items|proficiencies|spells|rituals|magic-formulae|henchmen|domain|scars|activities|army|magic-research|mercantile|shop|maintenance)(?:\/|$)/);
  if (relation && ['POST', 'PUT', 'DELETE'].includes(method) && payload?.version === undefined) {
    const current = await db.character.findUnique({ where: { id: relation[1] } });
    payload = { ...payload, version: current?.version ?? 0 };
  }
  return app.inject({ method, url, payload, headers: token ? { authorization: `Bearer ${token}` } : {} });
}
before(async () => {
  const migration = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.resolve(__dirname, '..'), env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(migration.status, 0, migration.stderr + migration.stdout);
  app = buildApp(undefined, false);
  const registration = await request('POST', '/api/auth/register', { username: `test_${suffix}`, email: `${suffix}@test.invalid`, password, role: 'MASTER' });
  assert.equal(registration.statusCode, 201, registration.body);
  ({ token: auth, user } = registration.json());
});
after(async () => { if (app) await app.close(); else await db.$disconnect(); });

test('real database readiness and account session', async () => {
  assert.equal((await request('GET', '/api/ready')).statusCode, 200);
  assert.equal((await request('GET', '/api/auth/me')).statusCode, 200);
});
test('guided creation persists initial choices atomically', async () => {
  const response = await request('POST', '/api/characters/guided', { characterName: `Ada ${suffix}`, classKey: 'catalog:fighter', str: 12, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6, coinGP: 20, items: [{ name: 'Rope', quantity: 1, weight: 1 }] });
  assert.equal(response.statusCode, 201, response.body);
  character = response.json().character;
  assert.equal(character.version, 0);
  assert.equal((await db.item.count({ where: { characterId: character.id } })), 1);
});

test('book-mode creation validates proficiencies and magic before creating any records', async () => {
  const base = { characterName: `Choices ${suffix}`, classKey: 'catalog:venturer', rulesMode: 'standard', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6,
    proficiencies: [{ name: 'Navigation', category: 'class' }, { name: 'Caving', category: 'general' }] };
  const mage = { ...base, classKey: 'catalog:mage', hpMax: 4, proficiencies: [{ name: 'Alchemy', category: 'class' }, { name: 'Caving', category: 'general' }] };
  const armor = { name: 'Arcane Armor', level: 1, tradition: 'arcane' };
  const before = await db.character.count({ where: { userId: user.id } });
  for (const input of [
    { ...base, proficiencies: [{ name: 'Seduction', category: 'class' }, { name: 'Caving', category: 'general' }] },
    { ...mage, spells: [{ ...armor, tradition: 'divine' }] },
    { ...mage, spells: [armor, armor] },
    { ...mage, spells: [] },
  ]) {
    const response = await request('POST', '/api/characters/guided', input);
    assert.equal(response.statusCode, 400, response.body);
    assert.equal(response.json().step, 2);
  }
  assert.equal(await db.character.count({ where: { userId: user.id } }), before);
  assert.equal((await request('POST', '/api/characters/guided', base)).statusCode, 201);
  const created = await request('POST', '/api/characters/guided', { ...mage, spells: [{ ...armor, name: ' Arcane Armor ' }] });
  assert.equal(created.statusCode, 201, created.body);
  const spell = await db.spell.findFirst({ where: { characterId: created.json().character.id } });
  assert.equal(spell.name, 'Arcane Armor');
});
test('concurrent sheet saves allow exactly one winner', async () => {
  const responses = await Promise.all(['first', 'second'].map(notes => request('PUT', `/api/characters/${character.id}`, { version: character.version, notes })));
  assert.deepEqual(responses.map(r => r.statusCode).sort(), [200, 409]);
  character = responses.find(r => r.statusCode === 200).json().character;
  assert.ok(character.version > 0);
});
test('purchases invalidate stale sheets and persist the server price', async () => {
  const oldVersion = character.version;
  const response = await request('POST', `/api/characters/${character.id}/shop/purchase`, { entryId: 'i-torch' });
  assert.equal(response.statusCode, 201, response.body);
  character = response.json().character;
  assert.equal(character.coinGP, 19);
  assert.equal(character.coinSP, 9);
  assert.ok(character.version > oldVersion);
  const stale = await request('PUT', `/api/characters/${character.id}`, { version: oldVersion, coinGP: 20 });
  assert.equal(stale.statusCode, 409, stale.body);
  assert.equal((await db.character.findUnique({ where: { id: character.id } })).coinGP, 19);
});
test('invalid scalar input and unrelated users cannot modify a sheet', async () => {
  assert.equal((await request('PUT', `/api/characters/${character.id}`, { version: character.version, coinGP: -1 })).statusCode, 400);
  const other = await db.user.create({ data: { username: `other_${suffix}`, email: `other_${suffix}@test.invalid`, passwordHash: 'not-used' } });
  const token = app.jwt.sign({ id: other.id, username: other.username, role: other.role, sessionVersion: 0 });
  assert.equal((await request('GET', `/api/characters/${character.id}`, undefined, token)).statusCode, 403);
});
test('campaign creation, assignment and calendar persist', async () => {
  const response = await request('POST', '/api/campaigns', { name: `Campaign ${suffix}` });
  assert.equal(response.statusCode, 201, response.body);
  const campaign = response.json();
  const assigned = await request('PUT', `/api/characters/${character.id}/assignment`, { campaignId: campaign.id });
  assert.equal(assigned.statusCode, 200, assigned.body);
  const advanced = await request('POST', `/api/campaigns/${campaign.id}/calendar/advance`, { mode: 'week' });
  assert.equal(advanced.statusCode, 200, advanced.body);
  assert.equal(advanced.json().currentWeek, 2);
});
test('rate limiting is shared between separate server instances', async () => {
  const other = buildApp(undefined, false);
  const login = server => server.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'missing@test.invalid', password }, remoteAddress: `192.0.2.${parseInt(suffix.slice(0,2),16) || 1}` });
  try {
    for (let i = 0; i < 20; i++) assert.equal((await login(i % 2 ? app : other)).statusCode, 401);
    const limited = await login(other);
    assert.equal(limited.statusCode, 429);
    assert.ok(Number(limited.headers['retry-after']) > 0);
  } finally { await other.close(); }
});
test('reset tokens expire, are single use and revoke existing sessions', async () => {
  const raw = randomBytes(32).toString('hex');
  await db.passwordReset.create({ data: { userId: user.id, tokenHash: hashResetToken(raw), expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await request('POST', '/api/auth/reset-password', { token: raw, password: 'updated-test-password' })).statusCode, 400);
  await db.passwordReset.update({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() + 60000) } });
  assert.equal((await request('POST', '/api/auth/reset-password', { token: raw, password: 'updated-test-password' })).statusCode, 200);
  assert.equal((await request('POST', '/api/auth/reset-password', { token: raw, password: 'updated-test-password' })).statusCode, 400);
  assert.equal((await request('GET', '/api/auth/me')).statusCode, 401);
  const login = await request('POST', '/api/auth/login', { email: user.email, password: 'updated-test-password' }, null);
  assert.equal(login.statusCode, 200, login.body);
  auth = login.json().token;
});
test('recovery email contains a working single-use link without leaking its token to storage', async () => {
  const { SMTPServer } = require('smtp-server');
  let message = '';
  const smtp = new SMTPServer({ disabledCommands: ['AUTH', 'STARTTLS'], onData(stream, _session, callback) {
    stream.on('data', chunk => { message += chunk.toString(); });
    stream.on('end', callback);
  } });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  const previous = { ...process.env };
  try {
    process.env.NODE_ENV = 'test'; // Local capture server has no TLS; production SMTP requires it.
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(smtp.server.address().port);
    process.env.SMTP_FROM = 'no-reply@test.invalid';
    delete process.env.SMTP_USER;
    const response = await request('POST', '/api/auth/forgot-password', { email: user.email }, null);
    assert.equal(response.statusCode, 202);
    const token = message.replace(/=\r?\n/g, '').match(/reset-password#([a-f0-9]{64})/)?.[1];
    assert.ok(token, 'SMTP must receive a password recovery link');
    assert.ok(!response.body.includes(token));
    const stored = await db.passwordReset.findUnique({ where: { userId: user.id } });
    assert.equal(stored.tokenHash, hashResetToken(token));
    assert.notEqual(stored.tokenHash, token);
    const reset = await request('POST', '/api/auth/reset-password', { token, password: 'emailed-reset-password' }, null);
    assert.equal(reset.statusCode, 200, reset.body);
    const login = await request('POST', '/api/auth/login', { email: user.email, password: 'emailed-reset-password' }, null);
    assert.equal(login.statusCode, 200, login.body);
    auth = login.json().token;
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
    await new Promise(resolve => smtp.close(resolve));
  }
});
test('guided validation, weapon style, advancement and adventure awards persist once', async () => {
  const draft = {characterName:`Rules ${suffix}`,classKey:'catalog:fighter',str:16,int:10,dex:10,wil:10,con:10,cha:10,hpMax:6,rulesMode:'standard',proficiencies:[{name:'Combat Reflexes',category:'class'},{name:'Manual of Arms',category:'general'}],startingGoldGp:100,purchases:[{entryId:'w-sword',quantity:1}]};
  assert.equal((await request('POST','/api/characters/guided',{...draft,proficiencies:[]})).statusCode,400);
  const created=await request('POST','/api/characters/guided',draft);
  assert.equal(created.statusCode,201,created.body);
  const id=created.json().character.id, base=`/api/game-rules/characters/${id}`;
  let c=await db.character.findUnique({where:{id}});
  assert.equal(c.coinGP,90);
  const weapon=await db.weapon.findFirst({where:{characterId:id}});
  assert.equal(weapon.damage,'1d6'); assert.ok(Math.abs(weapon.encumbrance-1/6)<1e-12); assert.equal(weapon.automaticDamage,true);
  const styled=await request('PUT',`/api/characters/${id}/weapons/${weapon.id}`,{style:'Two-Handed Weapon'});
  assert.equal(styled.statusCode,200,styled.body);
  assert.equal((await db.weapon.findUnique({where:{id:weapon.id}})).damage,'1d8');
  await request('PUT',`/api/characters/${id}/weapons/${weapon.id}`,{automaticDamage:false,damage:'2d6',style:'Single Weapon'});
  await request('PUT',`/api/characters/${id}/weapons/${weapon.id}`,{style:'Two-Handed Weapon'});
  assert.equal((await db.weapon.findUnique({where:{id:weapon.id}})).damage,'2d6');
  c=await db.character.findUnique({where:{id}});
  const award={awardId:`rules-${suffix}`,treasureGp:2000,participants:[{id,version:c.version,share:1}]};
  const preview=await request('POST','/api/game-rules/adventures/preview',award);
  assert.equal(preview.statusCode,200,preview.body);assert.equal(preview.json().awards[0].gained,2200);
  assert.equal((await request('POST','/api/game-rules/adventures/apply',award)).statusCode,200);
  c=await db.character.findUnique({where:{id}});
  assert.equal((await request('POST','/api/game-rules/adventures/apply',{...award,participants:[{id,version:c.version,share:1}]})).statusCode,409);
  const advance={version:c.version,dice:[8,7]};
  const hp=await request('POST',`${base}/advance/preview`,advance);assert.equal(hp.statusCode,200,hp.body);assert.equal(hp.json().hpMax,15);
  assert.equal((await request('POST',`${base}/advance/apply`,advance)).statusCode,200);
  assert.equal((await request('POST',`${base}/advance/apply`,advance)).statusCode,409);
  c=await db.character.findUnique({where:{id}});assert.equal(c.level,2);assert.equal(c.hpMax,15);assert.equal(c.coinGP,90);
});

test('magic repertoire, concurrent casts and rest cannot create extra slots', async()=>{
  const created=await request('POST','/api/characters/guided',{characterName:`Mage ${suffix}`,classKey:'catalog:mage',str:10,int:16,dex:10,wil:10,con:10,cha:10,hpMax:4});
  assert.equal(created.statusCode,201,created.body);
  const id=created.json().character.id,base=`/api/game-rules/characters/${id}`;
  const repertoire=await request('POST',`${base}/magic/repertoire`,{version:0,spells:[{name:'Slumber',level:1,tradition:'arcane'}],orderApproved:false});
  assert.equal(repertoire.statusCode,200,repertoire.body);
  const spell=await db.spell.findFirst({where:{characterId:id}});
  let c=await db.character.findUnique({where:{id}});
  const cast={version:c.version,spellId:spell.id};
  const responses=await Promise.all([request('POST',`${base}/magic/cast`,cast),request('POST',`${base}/magic/cast`,cast)]);
  assert.equal(responses.filter(r=>r.statusCode===200).length,1,responses.map(r=>r.body).join('\n'));
  c=await db.character.findUnique({where:{id}});assert.equal(JSON.parse(c.rulesState).used['arcane:1'],1);
  assert.equal((await request('POST',`${base}/magic/cast`,{...cast,version:c.version})).statusCode,400);
  assert.equal((await request('POST',`${base}/magic/rest`,{version:c.version,day:1,hours:7,requirementsMet:true})).statusCode,400);
  assert.equal((await request('POST',`${base}/magic/rest`,{version:c.version,day:1,hours:8,requirementsMet:true})).statusCode,200);
  c=await db.character.findUnique({where:{id}});
  assert.equal((await request('POST',`${base}/magic/rest`,{version:c.version,day:1,hours:8,requirementsMet:true})).statusCode,400);
  assert.deepEqual(JSON.parse(c.rulesState).used,{});
});

test('domain settlement uses a snapshot and refuses a second closing of the same month',async()=>{
  let c=await db.character.create({data:{userId:user.id,characterName:'Domain workflow',classKey:'catalog:fighter',className:'Fighter'}});
  const d=await db.domain.create({data:{characterId:c.id,peasantFamilies:100,revenuePerFamily:6,servicePerFamily:4,taxPerFamily:2,garrisonCost:200,liturgiesCost:100,titheCost:100,treasury:1000}});
  const base=`/api/campaign-rules/characters/${c.id}/domain`;
  let input={version:c.version,year:1,month:1,baseMorale:0,moraleDice:[3,4],growth:10,losses:5,eventFamilies:0,eventMorale:0,administered:false,repressed:false,classification:'outlands',hexes:1,tributeGp:0};
  let preview=await request('POST',`${base}/preview`,input);assert.equal(preview.statusCode,200,preview.body);
  await db.domain.update({where:{id:d.id},data:{treasury:1100}});
  assert.equal((await request('POST',`${base}/apply`,{...input,fingerprint:preview.json().fingerprint})).statusCode,409);
  preview=await request('POST',`${base}/preview`,input);
  assert.equal((await request('POST',`${base}/apply`,{...input,fingerprint:preview.json().fingerprint})).statusCode,200);
  const settled=await db.domain.findUnique({where:{id:d.id}});assert.equal(settled.treasury,1900);assert.equal(settled.peasantFamilies,105);
  c=await db.character.findUnique({where:{id:c.id}});input={...input,version:c.version};preview=await request('POST',`${base}/preview`,input);
  assert.equal((await request('POST',`${base}/apply`,{...input,fingerprint:preview.json().fingerprint})).statusCode,409);
});

test('tracked research pays once, advances only through work reports and consumes inventory atomically',async()=>{
  const campaign=await db.campaign.create({data:{name:'Research campaign',masterId:user.id,joinCode:`r-${suffix}`}});
  let c=await db.character.create({data:{userId:user.id,campaignId:campaign.id,characterName:'Researcher',classKey:'catalog:mage',className:'Mage',level:5,int:16,isSpellcaster:true,workshopValue:4000,coinGP:1000}});
  const project=(await request('POST',`/api/characters/${c.id}/magic-research`,{itemName:'Researched scroll',effectType:'ONE_USE',spellLevel:1,hasFormula:true})).json().research;
  assert.ok(project);
  const component=await db.item.create({data:{characterId:c.id,name:'Appropriate components',quantity:2,weight:1}});
  const base=`/api/campaign-rules/characters/${c.id}/research/${project.id}`;
  c=await db.character.findUnique({where:{id:c.id}});
  const input={version:c.version,casterLevel:5,tradition:'arcane',rateBonusPercent:0,dedication:'dedicated',assistants:[],duration:'instant',affectsUser:false,esoteric:false,healing:false,eligible:true,itemKind:'other'};
  const preview=await request('POST',`${base}/preview`,input);assert.equal(preview.statusCode,200,preview.body);
  const started=await request('POST',`${base}/start`,{...input,fingerprint:preview.json().fingerprint});assert.equal(started.statusCode,200,started.body);
  c=await db.character.findUnique({where:{id:c.id}});assert.equal(c.coinGP,500);
  assert.equal((await request('POST',`${base}/start`,{...input,version:c.version,fingerprint:preview.json().fingerprint})).statusCode,409);
  assert.equal((await request('PUT',`/api/characters/${c.id}/magic-research/${project.id}`,{status:'READY'})).statusCode,409);
  assert.equal((await request('POST',`/api/campaigns/${campaign.id}/calendar/advance`,{mode:'week'})).statusCode,200);
  assert.equal((await db.magicItemResearch.findUnique({where:{id:project.id}})).remainingDays,10);
  assert.equal((await request('POST',`${base}/work`,{version:c.version,days:5,period:'week 1'})).statusCode,200);
  c=await db.character.findUnique({where:{id:c.id}});
  assert.equal((await request('POST',`${base}/work`,{version:c.version,days:5,period:'week 1'})).statusCode,409);
  assert.equal((await request('POST',`${base}/work`,{version:c.version,days:5,period:'week 2'})).statusCode,200);
  c=await db.character.findUnique({where:{id:c.id}});
  const finish={version:c.version,components:[{itemId:component.id,quantity:2,valueGp:250,appropriate:true}],roll:0,engineeringRank:0,otherBonus:0,itemWeight:1/6};
  const outcome=await request('POST',`${base}/outcome`,finish);assert.equal(outcome.statusCode,200,outcome.body);assert.equal(outcome.json().success,true);
  const result=await request('POST',`${base}/finish`,{...finish,fingerprint:outcome.json().fingerprint});assert.equal(result.statusCode,200,result.body);
  assert.equal(await db.item.findUnique({where:{id:component.id}}),null);
  assert.equal(await db.item.count({where:{characterId:c.id,name:'Researched scroll'}}),1);
  assert.equal((await request('POST',`${base}/finish`,{...finish,fingerprint:outcome.json().fingerprint})).statusCode,400);
  assert.equal((await db.character.findUnique({where:{id:c.id}})).coinGP,500);
});

test('point construction is restricted to the campaign master and participates in guided creation',async()=>{
  const campaign=await db.campaign.create({data:{name:'Class builder',masterId:user.id,joinCode:`b-${suffix}`}});
  const build={name:'Campaign fighter',race:'human',racial:0,hd:2,fighting:2,thievery:0,divine:0,arcane:0,fightingVariant:'crusader',armorTrade:0,weaponTrade:0,styleTrade:0,damageTrade:'none',thiefSkills:[],powers:[],startingProficiency:'Manual of Arms',keyAttributes:['str'],stronghold:'Castle',smoothXp:true,proficiencies:['Combat Reflexes',...Array.from({length:27},(_,i)=>`Custom ${i}`)]};
  const base=`/api/class-builder/${campaign.id}`;
  const outsider=await db.user.create({data:{username:`builder-other-${suffix}`,email:`builder-other-${suffix}@test.invalid`,passwordHash:'unused'}});
  const otherToken=app.jwt.sign({id:outsider.id,username:outsider.username,role:outsider.role,sessionVersion:0});
  assert.equal((await request('POST',`${base}/create`,build,otherToken)).statusCode,403);
  const preview=await request('POST',`${base}/preview`,build);assert.equal(preview.statusCode,200,preview.body);assert.equal(preview.json().summary.xpSecond,2000);
  const created=await request('POST',`${base}/create`,build);assert.equal(created.statusCode,201,created.body);
  assert.equal((await request('POST',`${base}/create`,build)).statusCode,409);
  const c=await request('POST','/api/characters/guided',{characterName:'Custom hero',campaignId:campaign.id,classKey:created.json().id,str:10,int:10,dex:10,wil:10,con:10,cha:10,hpMax:6,rulesMode:'standard',proficiencies:[{name:'Combat Reflexes',category:'class'},{name:'Manual of Arms',category:'general'}]});
  assert.equal(c.statusCode,201,c.body);
  assert.equal((await request('GET',`/api/game-rules/characters/${c.json().character.id}`)).json().supported,true);
});

test('magic item charges are separate from notes and concurrent use spends once',async()=>{
  let c=await db.character.create({data:{userId:user.id,characterName:'Item owner'}});
  const item=await db.item.create({data:{characterId:c.id,name:'Wand',notes:'Keep these notes',quantity:1}});
  const base=`/api/campaign-rules/characters/${c.id}/items/${item.id}`;
  const details={identified:true,charges:2,effect:'Known effect',apparentValueGp:50,identifiedValueGp:500};
  assert.equal((await request('POST',`${base}/magic`,{version:c.version,details})).statusCode,200);
  c=await db.character.findUnique({where:{id:c.id}});
  const uses=await Promise.all([request('POST',`${base}/charge`,{version:c.version,charges:2}),request('POST',`${base}/charge`,{version:c.version,charges:2})]);
  assert.equal(uses.filter(r=>r.statusCode===200).length,1);
  const updated=await db.item.findUnique({where:{id:item.id}});assert.equal(updated.notes,'Keep these notes');assert.equal(JSON.parse(updated.magicDetails).charges,0);
  c=await db.character.findUnique({where:{id:c.id}});
  assert.equal((await request('POST',`${base}/charge`,{version:c.version,charges:1})).statusCode,400);
});

test('concurrent cargo settlement credits coins once and preserves an audit record', async () => {
  const created = await request('POST', '/api/characters/guided', { characterName: `Trader ${suffix}`, classKey: 'catalog:fighter', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6, coinGP: 100 });
  assert.equal(created.statusCode, 201, created.body);
  let c = created.json().character;
  const cargo = await request('POST', `/api/characters/${c.id}/mercantile`, { cargoName: 'Silk', baseValueGp: 100, originMarketClass: 4, destMarketClass: 2 });
  assert.equal(cargo.statusCode, 201, cargo.body);
  c=await db.character.findUnique({where:{id:c.id}});
  const venture = cargo.json().venture;
  const endpoint = `/api/characters/${c.id}/mercantile/${venture.id}/sell`;
  const results = await Promise.all([request('POST', endpoint, { version: c.version }), request('POST', endpoint, { version: c.version })]);
  assert.deepEqual(results.map(r => r.statusCode).sort(), [200, 409]);
  const stored = await db.character.findUnique({ where: { id: c.id }, include: { mercantileVentures: true } });
  assert.equal(stored.coinGP, 220);
  assert.equal(stored.mercantileVentures[0].status, 'SOLD');
  assert.equal(await db.auditLog.count({ where: { characterId: c.id, action: 'MERCANTILE_SALE' } }), 1);
  assert.equal((await request('POST', endpoint, { version: stored.version })).statusCode, 409);
});

test('logout revokes the token on the server', async () => {
  assert.equal((await request('POST', '/api/auth/logout')).statusCode, 204);
  assert.equal((await request('GET', '/api/auth/me')).statusCode, 401);
});
test('reapplying migrations preserves existing data', async () => {
  const migration = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.resolve(__dirname, '..'), env: process.env, encoding: 'utf8', windowsHide: true });
  assert.equal(migration.status, 0, migration.stderr + migration.stdout);
  assert.ok(await db.character.findUnique({ where: { id: character.id } }));
});

test('upgrades a partially hardened previous schema without losing an existing account or sheet', async () => {
  const fs = require('node:fs');
  const { PrismaClient } = require('@prisma/client');
  const schemaName = `upgrade_${suffix}`;
  const upgradeUrl = new URL(process.env.TEST_DATABASE_URL);
  upgradeUrl.searchParams.set('schema', schemaName);
  const fixture = path.resolve(__dirname, '../../.audit-tools', schemaName);
  fs.mkdirSync(path.join(fixture, 'migrations'), { recursive: true });
  const prismaDir = path.resolve(__dirname, '../prisma');
  fs.copyFileSync(path.join(prismaDir, 'schema.prisma'), path.join(fixture, 'schema.prisma'));
  for (const entry of fs.readdirSync(path.join(prismaDir, 'migrations'))) {
    if (entry >= '20260928120000_production_hardening' && entry !== 'migration_lock.toml') continue;
    fs.cpSync(path.join(prismaDir, 'migrations', entry), path.join(fixture, 'migrations', entry), { recursive: true });
  }
  const migrate = schema => {
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', schema], {
      env: { ...process.env, DATABASE_URL: upgradeUrl.toString() }, encoding: 'utf8', windowsHide: true,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  const legacy = new PrismaClient({ datasourceUrl: upgradeUrl.toString() });
  try {
    migrate(path.join(fixture, 'schema.prisma'));
    await legacy.$executeRaw`INSERT INTO "User" ("id", "username", "email", "passwordHash", "updatedAt") VALUES ('legacy-user', 'legacy', 'legacy@test.invalid', 'existing-hash', NOW())`;
    await legacy.$executeRaw`INSERT INTO "Character" ("id", "userId", "characterName", "notes", "updatedAt") VALUES ('legacy-sheet', 'legacy-user', 'Existing hero', 'Preserve this note', NOW())`;
    // Reproduce installations that received these columns through db push, or
    // stopped after the first DDL statement of the hardening migration.
    await legacy.$executeRaw`ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0`;
    await legacy.$executeRaw`ALTER TABLE "Character" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0`;
    migrate(path.join(prismaDir, 'schema.prisma'));
    const upgraded = await legacy.character.findUnique({ where: { id: 'legacy-sheet' } });
    assert.equal(upgraded.notes, 'Preserve this note');
    assert.equal(upgraded.version, 0);
    assert.equal((await legacy.user.findUnique({ where: { id: 'legacy-user' } })).sessionVersion, 0);
    const changed = await legacy.character.update({ where: { id: 'legacy-sheet' }, data: { notes: 'Updated' } });
    assert.equal(changed.version, 1);
  } finally {
    await legacy.$disconnect();
    // schemaName comes exclusively from random hex generated by this test.
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  }
});
