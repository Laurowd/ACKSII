const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const url=new URL(process.env.TEST_DATABASE_URL || 'http://missing');
if(!['postgres:','postgresql:'].includes(url.protocol)||!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/acks_test')throw Error('Use only an explicit disposable localhost acks_test database.');
Object.assign(process.env,{DATABASE_URL:url.toString(),NODE_ENV:'production',JWT_SECRET:randomBytes(32).toString('hex'),CORS_ORIGIN:'https://test.example',PUBLIC_APP_URL:'https://test.example'});
const {buildApp}=require('../dist/app'),db=require('../dist/lib/prisma').default;
const {RULE_CLASSES}=require('../dist/lib/gameRules');
let app,campaign,master,player,otherMaster;const users=[],tokens=new Map();
const request=(who,method,url,payload)=>app.inject({method,url,payload,headers:{authorization:`Bearer ${tokens.get(who.id)}`}});
const creation={characterName:'Interaction fixture',rulesMode:'standard',str:10,int:10,dex:10,wil:10,con:10,cha:10,hpMax:4};
const get=async id=>(await request(player,'GET',`/api/characters/${id}`)).json().character;
async function create(classKey='catalog:mage',extra={}) {
 const response=await request(player,'POST','/api/characters/guided',{...creation,campaignId:campaign.id,classKey,proficiencies:[{name:'Battle Magic',category:'class'},{name:'Caving',category:'general'}],spells:[{name:'Slumber',level:1,tradition:'arcane'}],...extra});
 assert.equal(response.statusCode,201,response.body);return get(response.json().character.id);
}
before(async()=>{
 const migrated=spawnSync(process.execPath,[path.resolve(__dirname,'../node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:path.resolve(__dirname,'..'),env:process.env,encoding:'utf8',windowsHide:true});assert.equal(migrated.status,0,migrated.stdout+migrated.stderr);
 app=buildApp(undefined,false);await app.ready();const suffix=randomBytes(6).toString('hex');
 for(const [index,role] of ['MASTER','PLAYER','MASTER'].entries()){
  const user=await db.user.create({data:{username:`interactions_${suffix}_${index}`,email:`${suffix}_${index}@test.invalid`,role,passwordHash:'unused-local-fixture'}});users.push(user);tokens.set(user.id,app.jwt.sign({id:user.id,username:user.username,role,sessionVersion:user.sessionVersion}));
 }
 [master,player,otherMaster]=users;
 campaign=await db.campaign.create({data:{name:'Disposable interactions',joinCode:suffix,masterId:master.id,members:{create:[{userId:master.id,status:'ACCEPTED'},{userId:player.id,status:'ACCEPTED'}]}}});
});
after(async()=>{for(const user of users)await db.user.delete({where:{id:user.id}});if(app)await app.close();else await db.$disconnect();});
test('direct level edits cannot bypass XP, and normal advancement still validates XP and HP',async()=>{
 let hero=await create();
 for(const who of [player,master]){
  const blocked=await request(who,'PUT',`/api/characters/${hero.id}`,{version:hero.version,level:3});assert.equal(blocked.statusCode,400,blocked.body);assert.equal(blocked.json().code,'LEVEL_WORKFLOW_REQUIRED');
 }
 assert.equal((await get(hero.id)).version,hero.version);
 const endpoint=`/api/game-rules/characters/${hero.id}`;
 assert.equal((await request(player,'POST',`${endpoint}/advance/apply`,{version:hero.version,dice:[3,3]})).statusCode,400);
 hero=await db.character.update({where:{id:hero.id},data:{xp:2500}});
 const advanced=await request(player,'POST',`${endpoint}/advance/apply`,{version:hero.version,dice:[3,3]});assert.equal(advanced.statusCode,200,advanced.body);assert.equal(advanced.json().character.level,2);assert.equal(advanced.json().character.hpMax,6);
 const stale=await request(player,'PUT',`/api/characters/${hero.id}`,{version:hero.version,level:1,notes:'Old full-sheet autosave'});assert.equal(stale.statusCode,409,stale.body);assert.equal(stale.json().code,'CHARACTER_CONFLICT');assert.equal((await get(hero.id)).level,2);
});
test('only the responsible master can make a justified level adjustment without spending XP',async()=>{
 let hero=await create();const endpoint=`/api/game-rules/characters/${hero.id}/level-adjustment`,input={version:hero.version,level:3,hpMax:10,reason:'Correct an imported sheet'};
 for(const who of [player,otherMaster])assert.equal((await request(who,'POST',endpoint,input)).statusCode,403);
 assert.equal((await request(master,'POST',endpoint,{...input,reason:' '})).statusCode,400);
 const changed=await request(master,'POST',endpoint,input);assert.equal(changed.statusCode,200,changed.body);hero=changed.json().character;assert.equal(hero.level,3);assert.equal(hero.xp,0);assert.equal(hero.hpMax,10);assert.equal(hero.hitDice,'3d4');
 assert.equal((await request(master,'POST',endpoint,input)).statusCode,409);
 const audit=await db.auditLog.findFirst({where:{characterId:hero.id,action:'LEVEL_ADJUSTED'}});assert.equal(JSON.parse(audit.details).reason,input.reason);
});
test('a player cannot bypass formula and study through either repertoire or manual spell routes',async()=>{
 let hero=await create();await db.character.update({where:{id:hero.id},data:{level:3,xp:5000,hpMax:10,hpCurr:10}});hero=await get(hero.id);
 const endpoint=`/api/game-rules/characters/${hero.id}`,spell={name:'Ogre Strength',level:2,tradition:'arcane'};
 const denied=await request(player,'POST',`${endpoint}/magic/repertoire`,{version:hero.version,spells:[spell]});assert.equal(denied.statusCode,403,denied.body);
 assert.equal((await request(player,'POST',`/api/characters/${hero.id}/spells`,{version:hero.version,...spell})).statusCode,403);
 for(const method of ['PUT','DELETE'])assert.equal((await request(player,method,`/api/characters/${hero.id}/spells/${hero.spells[0].id}`,{version:hero.version,...(method==='PUT'?{name:'Illumination'}:{})})).statusCode,403);
 assert.equal((await get(hero.id)).version,hero.version);assert.deepEqual((await get(hero.id)).spells.map(s=>s.name),['Slumber']);
 const input={version:hero.version,formulaKey:'arcane:2:ogrestrength',studyId:'one-week',day:2,available:true};
 assert.equal((await request(player,'POST',`${endpoint}/magic/study/start`,input)).statusCode,400);
 const acquired=await request(player,'POST',`${endpoint}/magic/formulas`,{version:hero.version,spell,source:'Recovered formula',available:true});assert.equal(acquired.statusCode,200,acquired.body);hero=acquired.json().character;
 const started=await request(player,'POST',`${endpoint}/magic/study/start`,{...input,version:hero.version});assert.equal(started.statusCode,200,started.body);hero=started.json().character;
 assert.equal((await request(player,'POST',`${endpoint}/magic/study/complete`,{version:hero.version,studyId:'one-week',day:8,requirementsMet:true})).statusCode,400);
 const completed=await request(player,'POST',`${endpoint}/magic/study/complete`,{version:hero.version,studyId:'one-week',day:9,requirementsMet:true});assert.equal(completed.statusCode,200,completed.body);hero=completed.json().character;
 const cast=await request(player,'POST',`${endpoint}/magic/cast`,{version:hero.version,spellId:hero.spells.find(s=>s.name===spell.name).id});assert.equal(cast.statusCode,200,cast.body);assert.equal(cast.json().used['arcane:2'],1);
});
test('master repertoire corrections require a reason and preserve unchanged spell IDs',async()=>{
 let hero=await create();const endpoint=`/api/game-rules/characters/${hero.id}/magic/repertoire`,spell={name:'Illumination',level:1,tradition:'arcane'};
 assert.equal((await request(master,'POST',endpoint,{version:hero.version,spells:[spell]})).statusCode,400);
 const unchanged=await request(player,'POST',endpoint,{version:hero.version,spells:hero.spells.map(({name,level,tradition})=>({name,level,tradition}))});assert.equal(unchanged.statusCode,200,unchanged.body);assert.equal(unchanged.json().character.spells[0].id,hero.spells[0].id);hero=unchanged.json().character;
 const changed=await request(master,'POST',endpoint,{version:hero.version,spells:[spell],reason:'Correct starting spell'});assert.equal(changed.statusCode,200,changed.body);
 assert.equal(await db.auditLog.count({where:{characterId:hero.id,action:'REPERTOIRE_ADJUSTED'}}),1);
 const manual=await request(master,'POST',`/api/characters/${hero.id}/spells`,{version:changed.json().character.version,name:'Campaign exception',level:1,tradition:'arcane'});assert.equal(manual.statusCode,201,manual.body);
 assert.equal(await db.auditLog.count({where:{characterId:hero.id,action:'SPELL_MANUALLY_ADDED'}}),1);
});
test('prayerful repertoire changes remain available without formula or study',async()=>{
 const hero=await create('catalog:crusader',{spells:[{name:'Discern Gist',level:1,tradition:'divine'}],proficiencies:[{name:'Command',category:'class'},{name:'Caving',category:'general'}]});
 const result=await request(player,'POST',`/api/game-rules/characters/${hero.id}/magic/repertoire`,{version:hero.version,orderApproved:true,spells:[{name:'Cure Light Injury',level:1,tradition:'divine'}]});assert.equal(result.statusCode,200,result.body);
});
for(const name of ['Acrobatics','Contortionism'])test(`${name} is created with an 18+ target`,async()=>{
 const hero=await create('catalog:thief',{spells:[],proficiencies:[{name,category:'class'},{name:'Caving',category:'general'}]});assert.equal(hero.proficiencies.find(p=>p.name===name).throwTarget,18);
});
test('later Jack choices preserve a paid grade and grant the correct second Alchemy grade',async()=>{
 for(const [first,paid] of [['Command','Alchemy'],['Alchemy','Caving']]){
  let hero=await create('catalog:bard',{spells:[],classChoices:{'jack-1':first},proficiencies:[{name:'Performance',category:'class'},{name:paid,category:'general'}]});
  await db.character.update({where:{id:hero.id},data:{level:3,xp:RULE_CLASSES.Bard.levels[2].xp}});hero=await get(hero.id);
  const result=await request(player,'POST',`/api/game-rules/characters/${hero.id}/class-choices/apply`,{version:hero.version,choices:{'jack-2':'Alchemy'}});assert.equal(result.statusCode,200,result.body);
  const profs=result.json().character.proficiencies;assert.equal(profs.find(p=>p.name===paid&&p.category==='general').throwTarget,11);
  assert.equal(profs.filter(p=>p.name==='Alchemy').length,2);assert.ok(profs.some(p=>p.name==='Alchemy'&&p.category==='natural'&&p.throwTarget===7));
 }
});
test('campaign economy agrees with domain settlement at low morale',async()=>{
 const hero=await create();await db.domain.create({data:{characterId:hero.id,peasantFamilies:100,revenuePerFamily:3,servicePerFamily:4,taxPerFamily:2,peasantMorale:-3,garrisonCost:200,liturgiesCost:100,titheCost:100,maintenanceCost:100,treasury:5000}});
 const result=await request(master,'GET',`/api/campaigns/${campaign.id}/economy`);assert.equal(result.statusCode,200,result.body);assert.equal(result.json().domainRevenue,450);assert.equal(result.json().consolidatedBalance,-50);
});
