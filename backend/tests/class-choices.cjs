const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const url = new URL(process.env.TEST_DATABASE_URL || 'http://missing');
if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/acks_test') throw new Error('Use a disposable localhost PostgreSQL database named acks_test.');
Object.assign(process.env, { DATABASE_URL: url.toString(), NODE_ENV:'production', JWT_SECRET:randomBytes(32).toString('hex'), CORS_ORIGIN:'https://test.example', PUBLIC_APP_URL:'https://test.example' });
const { buildApp } = require('../dist/app');
const db = require('../dist/lib/prisma').default;
const { RULE_CLASSES, SPELL_LIST } = require('../dist/lib/gameRules');
const { abilityProficiencies, chosenClassPowers } = require('../dist/lib/classAbilities');
let app, player, token, master, masterToken, campaign;
const heroes = {};
const request = (method,url,payload,credential=token) => app.inject({method,url,payload,headers:{authorization:`Bearer ${credential}`}});
const base = (classKey,classChoices,extra={}) => ({characterName:`Rules ${classKey}`,campaignId:campaign.id,classKey:`catalog:${classKey}`,rulesMode:'standard',str:13,int:10,dex:10,wil:10,con:10,cha:10,hpMax:4,classChoices,proficiencies:[{name:'Alchemy',category:'class'},{name:'Caving',category:'general'}],...extra});
const divine=[{name:'Discern Gist',level:1,tradition:'divine'}];
before(async()=>{
  const migrated=spawnSync(process.execPath,[path.resolve(__dirname,'../node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:path.resolve(__dirname,'..'),env:process.env,encoding:'utf8',windowsHide:true});
  assert.equal(migrated.status,0,migrated.stdout+migrated.stderr);
  app=buildApp(undefined,false);await app.ready();
  const suffix=randomBytes(6).toString('hex');
  player=await db.user.create({data:{username:`class_player_${suffix}`,email:`${suffix}@test.invalid`,passwordHash:'unused-local-test-only',role:'PLAYER'}});
  master=await db.user.create({data:{username:`class_master_${suffix}`,email:`master_${suffix}@test.invalid`,passwordHash:'unused-local-test-only',role:'MASTER'}});
  token=app.jwt.sign({id:player.id,username:player.username,role:player.role,sessionVersion:player.sessionVersion});
  masterToken=app.jwt.sign({id:master.id,username:master.username,role:master.role,sessionVersion:master.sessionVersion});
  campaign=await db.campaign.create({data:{name:'Local class audit',masterId:master.id,joinCode:randomBytes(6).toString('hex')}});
  await db.campaignMember.create({data:{campaignId:campaign.id,userId:player.id,status:'ACCEPTED'}});
});
after(async()=>{if(app)await app.close();else await db.$disconnect()});
async function create(name,input){const response=await request('POST','/api/characters/guided',input);assert.equal(response.statusCode,201,response.body);const stored=await request('GET',`/api/characters/${response.json().character.id}`);assert.equal(stored.statusCode,200,stored.body);return heroes[name]=stored.json().character}
async function advance(hero){const rules=RULE_CLASSES[hero.className],row=rules.levels[hero.level];const current=await db.character.update({where:{id:hero.id},data:{xp:row.xp,version:{increment:1}}});const response=await request('POST',`/api/game-rules/characters/${hero.id}/advance/apply`,{version:current.version,dice:Array.from({length:Math.min(9,row.level)},()=>4)});assert.equal(response.statusCode,200,response.body);return response.json().character}

test('guided creation records each class concession outside its paid budget',async()=>{
  const cases=[
    ['venturer',{'expert-traveling':'Driving'},'Bargaining','Driving',[]],
    ['bard',{'jack-1':'Combat Ferocity'},'Performance','Combat Ferocity',[]],
    ['dwarven-craftpriest',{craft:'Craft (weapon-smithing)'},'Alchemy','Craft (weapon-smithing)',divine],
    ['witch',{tradition:'Antiquarian'},'Alchemy',null,divine],
    ['shaman',{totem:'Viper'},'Healing','Combat Reflexes',divine],
  ];
  for(const [name,choices,paid,grant,spells] of cases){
    const hero=await create(name,base(name,choices,{spells,proficiencies:[{name:paid,category:'class'},{name:name==='witch'?'Healing':'Caving',category:'general'}]}));
    const response=await request('GET',`/api/game-rules/characters/${hero.id}`);assert.equal(response.statusCode,200,response.body);const overview=response.json();
    assert.deepEqual(overview.budget,{class:1,general:1});assert.deepEqual(overview.issues,[]);assert.deepEqual(overview.classChoices,choices);
    const profs=await db.proficiency.findMany({where:{characterId:hero.id}});assert.equal(profs.filter(p=>p.category==='adventuring').length,5);
    assert.deepEqual(profs.filter(p=>p.category==='natural').map(p=>p.name),grant?[grant]:[]);
    if(name==='dwarven-craftpriest'){assert.equal(overview.grantedProficiencies[0].ranks,3);assert.equal(profs.find(p=>p.name===grant).throwTarget,2);assert.equal(profs.find(p=>p.name==='Listening').throwTarget,14)}
  }
});

test('creation rejects missing choices, early powers, invalid totem attributes and extra Craftpriest general choices atomically',async()=>{
  const count=await db.character.count({where:{userId:player.id}});
  for(const input of [base('venturer',{}, {proficiencies:[{name:'Bargaining',category:'class'},{name:'Caving',category:'general'}]}),base('bard',{'jack-1':'skill:Scrollreading'}),base('witch',{}, {spells:divine}),base('shaman',{totem:'Viper'},{dex:8}),base('dwarven-craftpriest',{craft:'Craft (brewing)'},{spells:divine,proficiencies:[{name:'Alchemy',category:'class'},...['Caving','Riding','Seafaring','Gambling'].map(name=>({name,category:'general'}))]})]){
    const response=await request('POST','/api/characters/guided',input);assert.equal(response.statusCode,400,response.body);
  }
  assert.equal(await db.character.count({where:{userId:player.id}}),count);
});

test('ordinary autosave cannot replace the recorded Witch tradition',async()=>{
  const hero=heroes.witch;
  const invalid=await request('PUT',`/api/characters/${hero.id}`,{version:hero.version,subclass:'Chthonic'});
  assert.equal(invalid.statusCode,400,invalid.body);assert.equal(invalid.json().code,'CLASS_CHOICE_REQUIRED');
  const unchanged=await db.character.findUnique({where:{id:hero.id}});assert.equal(unchanged.version,hero.version);assert.equal(unchanged.subclass,'Antiquarian');
  const saved=await request('PUT',`/api/characters/${hero.id}`,{version:hero.version,subclass:'Antiquarian',notes:'Anotação sem trocar a tradição.'});
  assert.equal(saved.statusCode,200,saved.body);heroes.witch=saved.json().character;
});

test('Expanded Repertoire permits two initial spells while the daily limit remains one',async()=>{
  const spells=SPELL_LIST.filter(s=>s.tradition==='arcane'&&s.level===1).slice(0,3).map(({name,level,tradition})=>({name,level,tradition}));
  const input=base('mage',{}, {spells:spells.slice(0,2),proficiencies:[{name:'Expanded Repertoire',category:'class'},{name:'Caving',category:'general'}]});
  const hero=await create('mage',input);const overview=(await request('GET',`/api/game-rules/characters/${hero.id}`)).json();
  assert.equal(overview.magic[0].slots[0],1);assert.equal(overview.magic[0].repertoire[0],2);assert.deepEqual(overview.issues,[]);
  assert.equal((await request('POST','/api/characters/guided',{...input,spells})).statusCode,400);
  assert.equal((await request('POST','/api/characters/guided',{...input,proficiencies:[{name:'Battle Magic',category:'class'},{name:'Caving',category:'general'}]})).statusCode,400);
});

test('catalog and next-level indicator use the same book XP',async()=>{
  const catalog=(await request('GET',`/api/classes/catalog?campaignId=${campaign.id}`)).json();
  for(const [name,level,xp] of [['Bard',7,55000],['Paladin',2,2750],['Dwarven Vaultguard',5,17600],['Nobiran Wonderworker',11,770000],['Zaharan Ruinguard',9,410000]])assert.equal(JSON.parse(catalog.find(c=>c.name===name).xpPerLevel)[level-1],xp);
  const hero=await create('paladin',base('paladin',{}, {hpMax:6,proficiencies:[{name:'Command',category:'class'},{name:'Caving',category:'general'}]}));assert.equal(hero.xpNext,2750);
});

test('legacy reconciliation preserves manual targets and checks version and repeated submissions',async()=>{
  const hero=await create('legacy',base('venturer',{}, {rulesMode:'manual',exceptionReason:'Ficha anterior ao editor de concessões.',proficiencies:[{name:'Bargaining',category:'class'},{name:'Driving',category:'general'},{name:'Caving',category:'general'}]}));
  const driving=await db.proficiency.findFirst({where:{characterId:hero.id,name:'Driving'}});await db.proficiency.update({where:{id:driving.id},data:{throwTarget:6}});
  const endpoint=`/api/game-rules/characters/${hero.id}/class-choices`,input={version:hero.version,choices:{'expert-traveling':'Driving'},reconcilePaidGrants:true,reason:'Correct legacy grant origin'};
  const preview=await request('POST',`${endpoint}/preview`,input,masterToken);assert.equal(preview.statusCode,200,preview.body);assert.equal(preview.json().converted[0].id,driving.id);assert.equal(preview.json().converted[0].throwTarget,6);
  assert.equal((await db.proficiency.findUnique({where:{id:driving.id}})).category,'general');
  await db.character.update({where:{id:hero.id},data:{notes:'Outro editor salvou.',version:{increment:1}}});assert.equal((await request('POST',`${endpoint}/apply`,input,masterToken)).statusCode,409);
  const fresh={...input,version:hero.version+1},applied=await request('POST',`${endpoint}/apply`,fresh,masterToken);assert.equal(applied.statusCode,200,applied.body);assert.equal(applied.json().character.notes,'Outro editor salvou.');assert.equal(applied.json().character.proficiencies.find(p=>p.id===driving.id).throwTarget,6);
  const repeated=await request('POST',`${endpoint}/apply`,fresh,masterToken);assert.equal(repeated.statusCode,200,repeated.body);assert.equal(repeated.json().alreadyApplied,true);assert.equal(repeated.json().character.version,applied.json().character.version);
  assert.equal(await db.auditLog.count({where:{characterId:hero.id,action:'CLASS_CHOICES_UPDATED'}}),1);
  heroes.legacy=applied.json().character;
});

test('only the responsible master can revise an existing choice and a reason is required',async()=>{
  const hero=heroes.legacy,endpoint=`/api/game-rules/characters/${hero.id}/class-choices`,input={version:hero.version,choices:{'expert-traveling':'Seafaring'}};
  assert.equal((await request('POST',`${endpoint}/apply`,input)).statusCode,403);
  assert.equal((await request('POST',`${endpoint}/apply`,input,masterToken)).statusCode,400);
  const changed=await request('POST',`${endpoint}/apply`,{...input,reason:'Correção da escolha original pelo mestre.'},masterToken);assert.equal(changed.statusCode,200,changed.body);
  assert.deepEqual(changed.json().character.proficiencies.filter(p=>p.category==='natural').map(p=>p.name),['Seafaring']);
});

test('a competing first selection produces a conflict instead of overwriting the master choice',async()=>{
  const hero=await create('concurrent',base('venturer',{}, {rulesMode:'manual',exceptionReason:'Escolha de viagem pendente.',proficiencies:[{name:'Navigation',category:'class'},{name:'Caving',category:'general'}]})),endpoint=`/api/game-rules/characters/${hero.id}/class-choices`;
  const preview=await request('POST',`${endpoint}/preview`,{version:hero.version,choices:{'expert-traveling':'Driving'}});assert.equal(preview.statusCode,200,preview.body);
  const accepted=await request('POST',`${endpoint}/apply`,{version:hero.version,choices:{'expert-traveling':'Seafaring'}},masterToken);assert.equal(accepted.statusCode,200,accepted.body);
  const conflict=await request('POST',`${endpoint}/apply`,{version:hero.version,choices:{'expert-traveling':'Driving'}});assert.equal(conflict.statusCode,409,conflict.body);assert.equal(conflict.json().code,'CHARACTER_CONFLICT');
  assert.equal(JSON.parse((await db.character.findUnique({where:{id:hero.id}})).rulesState).classChoices['expert-traveling'],'Seafaring');
});

test('the Bard fills later Jack choices only after reaching their acquisition level',async()=>{
  let hero=heroes.bard,endpoint=`/api/game-rules/characters/${hero.id}/class-choices`;
  assert.equal((await request('POST',`${endpoint}/apply`,{version:hero.version,choices:{'jack-2':'skill:Climbing'}})).statusCode,400);
  hero=await advance(hero);hero=await advance(hero);
  const chosen=await request('POST',`${endpoint}/apply`,{version:hero.version,choices:{'jack-2':'skill:Climbing'}});assert.equal(chosen.statusCode,200,chosen.body);
  assert.equal(JSON.parse(chosen.json().character.rulesState).classChoices['jack-2'],'skill:Climbing');
});

test('Witch advancement adds a new free Healing rank while preserving the earlier paid rank',async()=>{
  let hero=heroes.witch;const paid=await db.proficiency.findFirst({where:{characterId:hero.id,name:'Healing',category:'general'}});await db.proficiency.update({where:{id:paid.id},data:{throwTarget:9}});
  hero=await advance(hero);hero=await advance(hero);
  assert.equal(JSON.parse(hero.rulesState).classChoices['traditional-arts'],'Healing');
  assert.equal(hero.proficiencies.filter(p=>p.name==='Healing').length,2);assert.equal(hero.proficiencies.find(p=>p.id===paid.id).throwTarget,9);assert.equal(hero.proficiencies.find(p=>p.id===paid.id).category,'general');
  assert.deepEqual((await request('GET',`/api/game-rules/characters/${hero.id}`)).json().issues,[]);
});

test('the Shaman bonus switches off with distance/death and the same totem returns on advancement',async()=>{
  let hero=heroes.shaman,endpoint=`/api/game-rules/characters/${hero.id}/class-choices`;
  const distant=await request('POST',`${endpoint}/apply`,{version:hero.version,choices:{totem:'Viper'},totemStatus:{alive:true,nearby:false}});assert.equal(distant.statusCode,200,distant.body);hero=distant.json().character;
  assert.equal(abilityProficiencies(hero,RULE_CLASSES.Shaman).some(p=>p.name==='Combat Reflexes'),false);
  const died=await request('POST',`${endpoint}/apply`,{version:hero.version,choices:{totem:'Viper'},totemStatus:{alive:false,nearby:false}});assert.equal(died.statusCode,200,died.body);hero=died.json().character;
  assert.equal(JSON.parse(hero.rulesState).totemStatus.lostAtLevel,1);
  assert.equal((await request('POST',`${endpoint}/apply`,{version:hero.version,choices:{totem:'Viper'},totemStatus:{alive:true,nearby:true}})).statusCode,400);
  assert.equal((await request('POST',`${endpoint}/apply`,{version:hero.version,choices:{totem:'Wolf'},totemStatus:{alive:true,nearby:true}})).statusCode,403);
  hero=await advance(hero);assert.equal(JSON.parse(hero.rulesState).classChoices.totem,'Viper');assert.equal(JSON.parse(hero.rulesState).totemStatus.alive,true);
  assert.equal(abilityProficiencies(hero,RULE_CLASSES.Shaman).filter(p=>p.name==='Combat Reflexes').length,1);
});

test('the master can reconcile old Craftpriest Adventuring targets once, preserving adjustments',async()=>{
  const hero=await db.character.update({where:{id:heroes['dwarven-craftpriest'].id},data:{rulesState:JSON.stringify({classChoices:{craft:'Craft (weapon-smithing)'}})}});
  const listen=await db.proficiency.findFirst({where:{characterId:hero.id,name:'Listening'}});await db.proficiency.update({where:{id:listen.id},data:{throwTarget:16}});
  const endpoint=`/api/game-rules/characters/${hero.id}/class-choices`,input={version:hero.version,choices:{craft:'Craft (weapon-smithing)'},reconcileAdventuring:true};
  assert.equal((await request('POST',`${endpoint}/preview`,input)).statusCode,403);
  const preview=await request('POST',`${endpoint}/preview`,input,masterToken);assert.equal(preview.statusCode,200,preview.body);assert.equal(preview.json().targets.some(p=>p.id===listen.id),false);
  const result=await request('POST',`${endpoint}/apply`,input,masterToken);assert.equal(result.statusCode,200,result.body);
  const again=await request('POST',`${endpoint}/preview`,{...input,version:result.json().character.version},masterToken);assert.equal(again.statusCode,200,again.body);assert.deepEqual(again.json().targets,[]);
});

test('portable choices remain coupled to their grants without trusting imported approval',async()=>{
  const source=await db.character.findUnique({where:{id:heroes.shaman.id},include:{proficiencies:true}}),privateKeys=new Set(['id','userId','campaignId','characterId','createdAt','updatedAt','version']);
  const portable=value=>Array.isArray(value)?value.map(portable):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!privateKeys.has(key)).map(([key,child])=>[key,portable(child)])):value;
  const restored=await request('POST','/api/characters/import',{campaignId:campaign.id,document:{format:'acks-ii-character',version:1,character:portable(source)}});assert.equal(restored.statusCode,201,restored.body);
  assert.deepEqual(JSON.parse(restored.json().character.rulesState).classChoices,{totem:'Viper'});assert.equal(restored.json().character.proficiencies.filter(p=>p.category==='natural').length,1);
  const choices={'jack-1':'judge','jack-1-name':'Poder da mesa','jack-1-description':'Descrição aprovada pelo mestre','jack-1-level':'1'};
  const raw=await db.character.findUnique({where:{id:heroes.bard.id}}),endpoint=`/api/game-rules/characters/${raw.id}/class-choices`;
  const denied=await request('POST',`${endpoint}/apply`,{version:raw.version,choices,reason:'Alteração não autorizada.'});assert.equal(denied.statusCode,403);
  const approved=await request('POST',`${endpoint}/apply`,{version:raw.version,choices,reason:'Poder excepcional aprovado para a campanha.'},masterToken);assert.equal(approved.statusCode,200,approved.body);
  assert.equal(chosenClassPowers(RULE_CLASSES.Bard,approved.json().character).some(p=>p.name==='Poder da mesa'),true);
  const imported=await request('POST','/api/characters/import',{campaignId:campaign.id,document:{format:'acks-ii-character',version:1,character:portable(approved.json().character)}});assert.equal(imported.statusCode,201,imported.body);
  assert.equal(chosenClassPowers(RULE_CLASSES.Bard,imported.json().character).some(p=>p.name==='Poder da mesa'),false);assert.match(imported.json().warnings.join(' '),/nova aprovação/);
});

test('class revision requires the responsible master, previews removals and preserves balances atomically',async()=>{
  const hero=await create('review-barbarian',base('barbarian',{'damage-specialization':'melee'},{proficiencyOrigin:'ivory-kingdoms',proficiencies:[{name:'Ambushing',category:'class'},{name:'Caving',category:'general'}]}));
  const endpoint=`/api/game-rules/characters/${hero.id}/class-revision`,input={version:hero.version,classKey:'catalog:fighter',reason:'Classe corrigida após conferir a ficha.',keepNaturalIds:[]};
  const bypass=await request('PUT',`/api/characters/${hero.id}`,{version:hero.version,classKey:'catalog:fighter'});assert.equal(bypass.statusCode,400,bypass.body);assert.equal(bypass.json().code,'CLASS_REVISION_REQUIRED');
  assert.equal((await request('POST',`${endpoint}/apply`,input)).statusCode,403);
  const preview=await request('POST',`${endpoint}/preview`,input,masterToken);assert.equal(preview.statusCode,200,preview.body);assert.deepEqual(preview.json().removed.map(row=>row.name).sort(),['Endurance','Running']);
  assert.equal((await db.character.findUnique({where:{id:hero.id}})).className,'Barbarian');
  const response=await request('POST',`${endpoint}/apply`,input,masterToken);assert.equal(response.statusCode,200,response.body);const after=response.json().character;
  assert.equal(after.className,'Fighter');assert.equal(after.xp,hero.xp);assert.equal(after.hpMax,hero.hpMax);assert.equal(after.coinGP,hero.coinGP);assert.equal(after.proficiencies.filter(row=>row.category==='natural').length,0);
  assert.deepEqual(JSON.parse(after.rulesState).classChoices,{});assert.equal(JSON.parse(after.rulesState).proficiencyOrigin,undefined);
  const replay=await request('POST',`${endpoint}/apply`,input,masterToken);assert.equal(replay.statusCode,200,replay.body);assert.equal(replay.json().alreadyApplied,true);assert.equal(replay.json().character.version,after.version);
  const stale=await request('POST',`${endpoint}/apply`,{...input,reason:'Nova revisão depois de alterar a ficha.'},masterToken);assert.equal(stale.statusCode,409,stale.body);
});

test('master retention is explicit and a same-class review can remove a legacy orphan',async()=>{
  const hero=await create('retained-barbarian',base('barbarian',{'damage-specialization':'melee'},{proficiencyOrigin:'ivory-kingdoms',proficiencies:[{name:'Ambushing',category:'class'},{name:'Caving',category:'general'}]}));
  const running=hero.proficiencies.find(row=>row.name==='Running'),endpoint=`/api/game-rules/characters/${hero.id}/class-revision`;
  const input={version:hero.version,classKey:'catalog:fighter',reason:'Manter treinamento de corrida da campanha.',keepNaturalIds:[running.id]};
  const result=await request('POST',`${endpoint}/apply`,input,masterToken);assert.equal(result.statusCode,200,result.body);let current=result.json().character;
  assert.deepEqual(current.proficiencies.filter(row=>row.category==='natural').map(row=>row.name),['Running']);assert.equal(abilityProficiencies(current,RULE_CLASSES.Fighter).some(row=>row.name==='Running'),true);
  assert.equal((await request('POST',`${endpoint}/apply`,{...input,version:current.version,keepNaturalIds:['not-this-character']},masterToken)).statusCode,400);
  const reviewed=await request('POST',`${endpoint}/apply`,{...input,version:current.version,reason:'Remover a exceção após revisão.',keepNaturalIds:[]},masterToken);assert.equal(reviewed.statusCode,200,reviewed.body);current=reviewed.json().character;
  assert.equal(current.proficiencies.some(row=>row.name==='Running'),false);
});

test('a direct level edit advances Climbing and preserves its manual offset like guided advancement',async()=>{
  let hero=await create('level-barbarian',base('barbarian',{'damage-specialization':'melee'},{proficiencyOrigin:'jutland',proficiencies:[{name:'Ambushing',category:'class'},{name:'Caving',category:'general'}]}));
  const climbing=hero.proficiencies.find(row=>row.name==='Climbing'&&row.category==='natural');assert.equal(climbing.throwTarget,6);
  const adjusted=await request('PUT',`/api/characters/${hero.id}/proficiencies/${climbing.id}`,{version:hero.version,throwTarget:8},masterToken);assert.equal(adjusted.statusCode,200,adjusted.body);
  hero=await db.character.findUnique({where:{id:hero.id}});
  const advanced=await request('POST',`/api/game-rules/characters/${hero.id}/level-adjustment`,{version:hero.version,level:2,hpMax:hero.hpMax,reason:'Review level progression'},masterToken);assert.equal(advanced.statusCode,200,advanced.body);hero=advanced.json().character;
  assert.equal(hero.proficiencies.find(row=>row.id===climbing.id).throwTarget,7);
  const undo=await request('POST',`/api/game-rules/characters/${hero.id}/level-adjustment`,{version:hero.version,level:1,hpMax:hero.hpMax,reason:'Restore original level'},masterToken);assert.equal(undo.statusCode,200,undo.body);assert.equal(undo.json().character.proficiencies.find(row=>row.id===climbing.id).throwTarget,8);
});

test('Warlock path is required at creation, locked against autosave and grants the correct rank and slot',async()=>{
  const input=base('warlock',{}, {spells:[{name:'Arcane Armor',level:1,tradition:'arcane'}]});
  assert.equal((await request('POST','/api/characters/guided',input)).statusCode,400);
  let hero=await create('path-warlock',{...input,classChoices:{'dark-path':'Demonology'}});assert.equal(hero.subclass,'Demonology');
  const mismatch=await request('PUT',`/api/characters/${hero.id}`,{version:hero.version,subclass:'Necromancy'});assert.equal(mismatch.statusCode,400,mismatch.body);
  const changed=await request('POST',`/api/game-rules/characters/${hero.id}/level-adjustment`,{version:hero.version,level:7,hpMax:hero.hpMax,reason:'Review Warlock progression'},masterToken);assert.equal(changed.statusCode,200,changed.body);hero=changed.json().character;
  assert.equal(hero.proficiencies.filter(row=>row.category==='natural'&&row.name==='Theology').length,1);
  const overview=(await request('GET',`/api/game-rules/characters/${hero.id}`)).json();assert.equal(overview.magic[0].repertoire[0],4);assert.equal(overview.magic[0].slots[0],3);
  const ordinary=SPELL_LIST.filter(spell=>spell.level===1&&spell.tradition==='arcane'&&!spell.types.includes('sum')).slice(0,4).map(({name,level,tradition})=>({name,level,tradition}));
  const endpoint=`/api/game-rules/characters/${hero.id}/magic/repertoire`;
  const rejected=await request('POST',endpoint,{version:hero.version,spells:ordinary});assert.equal(rejected.statusCode,400,rejected.body);assert.match(rejected.body,/vaga extra/);
  const allowed=SPELL_LIST.find(spell=>spell.level===1&&spell.tradition==='arcane'&&spell.types.includes('sum'));
  const accepted=await request('POST',endpoint,{version:hero.version,spells:[...ordinary.slice(0,3),{name:allowed.name,level:1,tradition:'arcane'}],reason:'Review restricted repertoire'},masterToken);assert.equal(accepted.statusCode,200,accepted.body);
});

test('Diplomacy cannot be repeated and Craftpriest can learn a fourth Craft rank within the paid budget',async()=>{
  let mage=await create('rank-mage',base('mage',{}, {spells:[{name:'Arcane Armor',level:1,tradition:'arcane'}]}));
  mage=await db.character.update({where:{id:mage.id},data:{level:5}});
  const endpoint=`/api/game-rules/characters/${mage.id}/proficiencies`,rejected=await request('POST',endpoint,{version:mage.version,choices:[{name:'Diplomacy',category:'general'},{name:'Diplomacy',category:'general'}]});assert.equal(rejected.statusCode,400,rejected.body);assert.match(rejected.body,/não pode ser repetida/);
  let craft=await create('rank-craft',base('dwarven-craftpriest',{craft:'Craft (brewing)'},{spells:divine,proficiencies:[{name:'Alchemy',category:'class'},{name:'Craft (brewing)',category:'general'}]}));
  assert.equal(craft.proficiencies.find(row=>row.category==='natural'&&row.name==='Craft (brewing)').throwTarget,2);
  assert.equal(craft.proficiencies.find(row=>row.category==='general'&&row.name==='Craft (brewing)').throwTarget,-1);
});

test('weapon attack attribute persists and invalid attribute values do not mutate the ficha',async()=>{
  let hero=await create('finesse-blade',base('bladedancer',{}, {dex:16,spells:divine,proficiencies:[{name:'Acrobatics',category:'class'},{name:'Caving',category:'general'}]}));
  const created=await request('POST',`/api/characters/${hero.id}/weapons`,{version:hero.version,name:'Sword',style:'Single Weapon',attackAbility:'dex'});assert.equal(created.statusCode,201,created.body);const weapon=created.json().weapon;assert.equal(weapon.attackAbility,'dex');
  hero=await db.character.findUnique({where:{id:hero.id}});
  const endpoint=`/api/characters/${hero.id}/weapons/${weapon.id}`,updated=await request('PUT',endpoint,{version:hero.version,attackAbility:'str'});assert.equal(updated.statusCode,200,updated.body);assert.equal(updated.json().weapon.attackAbility,'str');
  hero=await db.character.findUnique({where:{id:hero.id}});
  const rejected=await request('PUT',endpoint,{version:hero.version,attackAbility:'wil'});assert.equal(rejected.statusCode,400,rejected.body);assert.equal((await db.character.findUnique({where:{id:hero.id}})).version,hero.version);
});
