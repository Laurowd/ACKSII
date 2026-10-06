import { test,expect,type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

let account:{token:string;user:any}
async function signIn(page:Page) {
  if (!account) { const name=`class_ui_${Date.now().toString(36)}`;const response=await page.request.post('/api/auth/register',{data:{username:name,email:`${name}@test.invalid`,password:'browser-test-password',role:'MASTER'}});expect(response.status()).toBe(201);account=await response.json() }
  await page.goto('/login');await page.evaluate(({token,user})=>{localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(user))},account)
  return {authorization:`Bearer ${account.token}`}
}
async function start(page:Page,klass:string) {
  await signIn(page);await page.goto('/characters/new');await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('combobox',{name:'Classe',exact:true}).selectOption(`catalog:${klass}`);await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByLabel('Nome',{exact:true}).fill(`Book ${klass}`)
}
async function choose(page:Page,label:string,name:string) {await page.getByRole('combobox',{name:label,exact:true}).fill(name);await page.getByRole('listbox',{name:`Opções de ${label}`,exact:true}).getByRole('option').filter({hasText:name}).first().click()}
async function prof(page:Page,name:string,category:string) {await page.getByRole('button',{name:'+ Proficiência',exact:true}).click();await page.getByLabel('Nome da proficiência',{exact:true}).last().fill(name);await page.getByLabel('Categoria',{exact:true}).last().selectOption(category)}
async function spell(page:Page,name:string) {await page.getByRole('button',{name:'+ Magia inicial',exact:true}).click();const index=await page.getByRole('combobox',{name:/Nome da magia inicial/}).count();await choose(page,`Nome da magia inicial ${index}`,name)}
async function finish(page:Page) {await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('heading',{name:'Equipamento inicial'})).toBeVisible();await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('heading',{name:'Revisar personagem'})).toBeVisible();const pending=page.waitForResponse(response=>response.url().endsWith('/api/characters/guided')&&response.request().method()==='POST');await page.getByRole('button',{name:'Confirmar e abrir ficha',exact:true}).click();const response=await pending;expect(response.status(),await response.text()).toBe(201);await expect(page).toHaveURL(/\/character\//);return (await response.json()).character}
async function stored(page:Page,id:string) {const response=await page.request.get(`/api/characters/${id}`,{headers:{authorization:`Bearer ${account.token}`}});expect(response.status()).toBe(200);return (await response.json()).character}

test('Venturer chooses a free traveling proficiency and keeps both paid choices',async({page})=>{
  await start(page,'venturer');await choose(page,'Expert Traveling · escolha gratuita','Driving');await prof(page,'Navigation','class');await prof(page,'Caving','general');const hero=await finish(page),character=await stored(page,hero.id)
  expect(character.proficiencies.filter((p:any)=>p.category==='natural').map((p:any)=>p.name)).toEqual(['Driving']);expect(character.proficiencies.filter((p:any)=>['class','general'].includes(p.category))).toHaveLength(2)
  await expect(page.getByRole('heading',{name:'Proficiências naturais',exact:true})).toBeVisible()
})

test('Craftpriest chooses three free Craft ranks, a divine spell and only one paid general choice',async({page},info)=>{
  await page.setViewportSize({width:320,height:812});await start(page,'dwarven-craftpriest')
  await page.getByRole('combobox',{name:'Ofício · três graduações gratuitas de Craft',exact:true}).fill('Craft (glassmaking)')
  await prof(page,'Alchemy','class');await prof(page,'Caving','general');await spell(page,'Discern Gist');const hero=await finish(page),character=await stored(page,hero.id)
  expect(character.proficiencies.filter((p:any)=>p.category==='general')).toHaveLength(1);expect(character.proficiencies.find((p:any)=>p.name==='Craft (glassmaking)')).toMatchObject({category:'natural',throwTarget:2})
  await expect(page.getByLabel('Alvo da proficiência Craft (glassmaking)',{exact:true})).toHaveValue('2');await expect(page.getByText('3 graduações',{exact:false}).first()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);await page.screenshot({path:info.outputPath('craftpriest-mobile.png'),fullPage:true})
})

test('Witch displays only the chosen tradition and the correct type of magic',async({page})=>{
  await start(page,'witch');await choose(page,'Tradição da Witch','Antiquarian');await prof(page,'Alchemy','class');await prof(page,'Healing','general');await spell(page,'Discern Gist');await expect(page.getByLabel('Tradição da magia inicial 1')).toHaveValue('divine')
  const hero=await finish(page);expect(hero.subclass).toBe('Antiquarian')
  await expect(page.getByLabel('Tradição da Witch',{exact:true})).toHaveText('Antiquarian')
  await expect(page.getByRole('combobox',{name:'Tradition',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Ajuda: Studious Divine Magic',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Ajuda: Traditional Medicine',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Ajuda: Arcane Magic',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Ajuda: Bedazzling Glamour',exact:true})).toHaveCount(0)
})

test('Bard selects a thief skill and reads its current throw alongside the class powers',async({page})=>{
  await start(page,'bard');await choose(page,'Jack of All Trades · escolha gratuita','Climbing · habilidade de ladrão');await prof(page,'Performance','class');await prof(page,'Caving','general');const hero=await finish(page)
  expect(JSON.parse(hero.rulesState).classChoices['jack-1']).toBe('skill:Climbing')
  await expect(page.getByRole('heading',{name:'Jack of All Trades',exact:true}).locator('..')).toContainText('6+')
  await expect(page.getByRole('button',{name:'Ajuda: Climbing',exact:true})).toBeVisible()
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Ficha para impressão/PDF',exact:true}).click()
  const html=await readFile((await (await download).path())!,'utf8')
  expect(html).toContain('<h2>Jack of All Trades</h2>');expect(html).toContain('<dt>Climbing</dt><dd>6+</dd>')
})

test('Expanded Repertoire accepts two spells and casting still spends the sole daily use',async({page})=>{
  await start(page,'mage');await prof(page,'Expanded Repertoire','class');await prof(page,'Caving','general');await spell(page,'Arcane Armor');await spell(page,'Auditory Illusion');const hero=await finish(page)
  expect((await stored(page,hero.id)).spells).toHaveLength(2);await page.getByRole('button',{name:'Magia',exact:true}).click()
  const cast=page.getByRole('button',{name:/^Conjurar /});await expect(cast).toHaveCount(2);const response=page.waitForResponse(r=>r.url().endsWith('/magic/cast')&&r.request().method()==='POST');await cast.first().click();expect((await response).status()).toBe(200);await expect(cast.first()).toBeDisabled();await expect(cast.last()).toBeDisabled()
})

test('Shaman toggles distance and death without retaining the conditional initiative bonus',async({page})=>{
  await start(page,'shaman');await choose(page,'Animal totêmico','Viper · Combat Reflexes');await prof(page,'Healing','class');await prof(page,'Caving','general');const hero=await finish(page)
  await page.getByRole('button',{name:'Evolução & Regras',exact:true}).click();await page.getByLabel('Está a até 30 pés do Shaman').uncheck();await page.getByRole('button',{name:'Conferir concessões da classe',exact:true}).click();await page.getByRole('button',{name:'Confirmar concessões da classe',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Concessões da classe registradas.'})).toBeVisible()
  await page.getByRole('button',{name:'Geral & Combate',exact:true}).click();await expect(page.getByText('benefício inativo',{exact:false})).toBeVisible()
  const character=await stored(page,hero.id);expect(JSON.parse(character.rulesState).totemStatus).toMatchObject({alive:true,nearby:false})
  await page.getByRole('button',{name:'Evolução & Regras',exact:true}).click();await page.getByLabel('O animal está vivo').uncheck();await expect(page.getByText('Se o totem morreu, faça o salvamento de Death:',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Conferir concessões da classe',exact:true}).click();await page.getByRole('button',{name:'Confirmar concessões da classe',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Concessões da classe registradas.'})).toBeVisible()
  expect(JSON.parse((await stored(page,hero.id)).rulesState).totemStatus).toMatchObject({alive:false,lostAtLevel:1})
})

test('the master reviews legacy free choices and preserves the previously adjusted throw',async({page})=>{
  const headers=await signIn(page),created=await page.request.post('/api/characters/guided',{headers,data:{characterName:'Legacy traveler',classKey:'catalog:venturer',rulesMode:'manual',exceptionReason:'Conferência de uma ficha anterior.',str:10,int:10,dex:10,wil:10,con:10,cha:10,hpMax:4,proficiencies:[{name:'Navigation',category:'class'},{name:'Driving',category:'general'},{name:'Caving',category:'general'}]}})
  expect(created.status(),await created.text()).toBe(201);const hero=(await created.json()).character,initial=await stored(page,hero.id),driving=initial.proficiencies.find((p:any)=>p.name==='Driving')
  const adjusted=await page.request.put(`/api/characters/${hero.id}/proficiencies/${driving.id}`,{headers,data:{version:initial.version,throwTarget:6}});expect(adjusted.status()).toBe(200)
  await page.goto(`/character/${hero.id}`);await page.getByRole('button',{name:'Evolução & Regras',exact:true}).click();await choose(page,'Expert Traveling · escolha gratuita','Driving');await page.getByRole('button',{name:'Conferir concessões da classe',exact:true}).click();await expect(page.getByText('Reclassificar como gratuitas: Driving',{exact:true})).toBeVisible()
  expect((await stored(page,hero.id)).proficiencies.find((p:any)=>p.id===driving.id).category).toBe('general');await page.getByRole('button',{name:'Confirmar concessões da classe',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Concessões da classe registradas.'})).toBeVisible()
  expect((await stored(page,hero.id)).proficiencies.find((p:any)=>p.id===driving.id)).toMatchObject({category:'natural',throwTarget:6})
})

test('class-choice drafts survive a tab switch before confirmation',async({page})=>{
  const headers=await signIn(page),created=await page.request.post('/api/characters/guided',{headers,data:{characterName:'Pending travel',classKey:'catalog:venturer',str:10,int:10,dex:10,wil:10,con:10,cha:10,hpMax:4}});expect(created.status()).toBe(201);const hero=(await created.json()).character
  await page.goto(`/character/${hero.id}`);await page.getByRole('button',{name:'Evolução & Regras',exact:true}).click();await choose(page,'Expert Traveling · escolha gratuita','Seafaring');await page.getByRole('button',{name:'Geral & Combate',exact:true}).click();await page.getByRole('button',{name:'Evolução & Regras',exact:true}).click();await expect(page.getByRole('combobox',{name:'Expert Traveling · escolha gratuita',exact:true})).toHaveValue('Seafaring');await expect(page.getByText('Rascunho de concessões recuperado.',{exact:false})).toBeVisible()
  expect(JSON.parse((await stored(page,hero.id)).rulesState).classChoices['expert-traveling']).toBeUndefined()
})
