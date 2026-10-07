import {test,expect,type Page} from '@playwright/test'

const accounts: Partial<Record<'MASTER'|'PLAYER',any>> = {}
async function fixture(page:Page,role:'MASTER'|'PLAYER',classKey='catalog:mage') {
  const name=`interactions_ui_${role}_${Date.now().toString(36)}`
  if (!accounts[role]) {
    const data={username:name,email:`${name}@test.invalid`,password:'local-browser-password',role}
    let registration=await page.request.post('/api/auth/register',{data})
    if (registration.status()===429) {
      // All browser fixtures share one IP. Keep the real limiter enabled.
      const retryAfter=Number(registration.headers()['retry-after'])
      expect(retryAfter).toBeGreaterThanOrEqual(1)
      expect(retryAfter).toBeLessThanOrEqual(60)
      test.setTimeout(120_000)
      await new Promise(resolve=>setTimeout(resolve,retryAfter*1000+250))
      registration=await page.request.post('/api/auth/register',{data})
    }
    expect(registration.status(),await registration.text()).toBe(201)
    accounts[role]=await registration.json()
  }
  const account=accounts[role]!,headers={authorization:`Bearer ${account.token}`}
  const mage=classKey==='catalog:mage'
  const response=await page.request.post('/api/characters/guided',{headers,data:{characterName:name,classKey,rulesMode:'standard',str:10,int:10,dex:10,wil:10,con:10,cha:10,hpMax:4,proficiencies:[{name:mage?'Battle Magic':'Acrobatics',category:'class'},{name:'Caving',category:'general'}],spells:mage?[{name:'Slumber',level:1,tradition:'arcane'}]:[]}})
  expect(response.status(),await response.text()).toBe(201)
  const hero=(await response.json()).character
  await page.goto('/login');await page.evaluate(({token,user})=>{localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(user))},account)
  await page.goto(`/character/${hero.id}`)
  return {hero,headers}
}
test('player uses advancement and study without editable level or manual repertoire bypass',async({page})=>{
  const {hero,headers}=await fixture(page,'PLAYER')
  await expect(page.getByLabel('Nível atual',{exact:true})).toHaveAttribute('readonly','')
  expect((await page.request.put(`/api/characters/${hero.id}`,{headers,data:{version:hero.version,level:3}})).status()).toBe(400)
  await page.getByRole('button',{name:'Magia',exact:true}).click()
  await expect(page.getByText('Para aprender ou substituir magias de estudo, use Aprendizado de magias:',{exact:false})).toBeVisible()
  await expect(page.getByText('Ajustar repertório com validação (mestre)',{exact:true})).toHaveCount(0)
  await expect(page.getByText('Exceções de magia (mestre)',{exact:true})).toHaveCount(0)
  await page.getByText('Aprender ou substituir uma magia por estudo',{exact:true}).click()
  await expect(page.getByLabel('Fórmula disponível no grimório',{exact:true})).toBeVisible()
})
test('responsible master adjusts level and repertoire through justified controls',async({page})=>{
  const {hero,headers}=await fixture(page,'MASTER')
  await page.getByRole('button',{name:'Evolução & Regras',exact:true}).click()
  await page.getByText('Ajuste excepcional de nível (mestre)',{exact:true}).click()
  await page.getByLabel('Novo nível',{exact:true}).fill('3')
  await page.getByLabel('PV máximos após o ajuste',{exact:true}).fill('10')
  await page.getByLabel('Justificativa do nível',{exact:true}).fill('Corrigir ficha histórica')
  const adjusted=page.waitForResponse(r=>r.url().endsWith('/level-adjustment')&&r.request().method()==='POST')
  await page.getByRole('button',{name:'Registrar ajuste de nível',exact:true}).click();expect((await adjusted).status()).toBe(200)
  await expect(page.getByRole('status').filter({hasText:'Ajuste de nível registrado'})).toBeVisible()
  await page.getByRole('button',{name:'Magia',exact:true}).click()
  await page.getByText('Ajustar repertório com validação (mestre)',{exact:true}).click()
  await page.getByLabel('Nome da magia 1',{exact:true}).fill('Illumination')
  await page.getByRole('button',{name:'Salvar repertório',exact:true}).click()
  await expect(page.getByRole('alert').filter({hasText:'Justifique o ajuste'})).toBeVisible()
  await page.getByLabel('Justificativa do ajuste de estudo',{exact:true}).fill('Corrigir magia inicial')
  const saved=page.waitForResponse(r=>r.url().endsWith('/magic/repertoire')&&r.request().method()==='POST')
  await page.getByRole('button',{name:'Salvar repertório',exact:true}).click();expect((await saved).status()).toBe(200)
  const current=(await(await page.request.get(`/api/characters/${hero.id}`,{headers})).json()).character
  expect(current).toMatchObject({level:3,xp:0,hpMax:10});expect(current.spells[0].name).toBe('Illumination')
})
test('new Acrobatics target is shown as 18+ on the sheet',async({page})=>{
  await fixture(page,'PLAYER','catalog:thief')
  await expect(page.getByLabel('Alvo da proficiência Acrobatics',{exact:true})).toHaveValue('18')
})
test('Mage shield reference does not grant an unavailable fighting style',async({page})=>{
  await fixture(page,'PLAYER')
  await expect(page.getByText('Sem benefício de escudo: a classe não possui o estilo Weapon and Shield.',{exact:true})).toBeVisible()
})
