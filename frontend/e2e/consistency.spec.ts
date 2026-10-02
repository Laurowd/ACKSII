import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { characterExport } from '../src/utils/characterExport'
let account: any

async function fixture(page: Page) {
  const suffix = `consistent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`
  if (!account) {
    const response = await page.request.post('/api/auth/register', { data: { username: suffix, email: `${suffix}@test.invalid`, password: 'browser-test-password', role: 'MASTER' } })
    expect(response.status()).toBe(201)
    account = await response.json()
  }
  const headers = { authorization: `Bearer ${account.token}` }
  const created = await page.request.post('/api/characters/guided', { headers, data: { characterName: suffix, classKey: 'catalog:fighter', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6, items: [{ name: 'Session rope', quantity: 1, weight: 1 }] } })
  expect(created.status()).toBe(201)
  let character = (await created.json()).character
  expect((await page.request.put(`/api/characters/${character.id}`, { headers, data: { version: character.version, armorAcBonus: 2 } })).status()).toBe(200)
  character = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  await page.goto('/login')
  await page.evaluate(account => { localStorage.setItem('token', account.token); localStorage.setItem('user', JSON.stringify(account.user)) }, account)
  await page.goto(`/character/${character.id}`)
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible()
  return { character, headers }
}

test('unsaved DEX is consistent in the live sheet, HTML and JSON, and JSON imports as a new sheet', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const { character, headers } = await fixture(page)
  const dex = page.locator('label').filter({ hasText: /^DEX$/ }).locator('..').locator('input')
  await dex.fill('16'); await dex.blur()
  await expect(page.locator('header').filter({ hasText: character.characterName }).getByText('4 / 5', { exact: true })).toBeVisible()
  const htmlWait = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Ficha para impressão/PDF' }).click()
  const html = await readFile((await (await htmlWait).path())!, 'utf8')
  expect(html).toContain('CA sem escudo</dt><dd>4</dd>')
  const jsonWait = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click()
  const exported = await readFile((await (await jsonWait).path())!, 'utf8')
  expect(JSON.parse(exported).character.acNoShield).toBe(4)
  await page.getByRole('link', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[type=file]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await expect(dialog.getByRole('alert')).toContainText('Selecione uma exportação')
  await dialog.locator('input[type=file]').setInputFiles({ name: 'character.json', mimeType: 'application/json', buffer: Buffer.from(exported) })
  await dialog.getByRole('button', { name: 'Criar ficha importada' }).click()
  await expect(page).toHaveURL(/\/character\//)
  expect(page.url()).not.toContain(character.id)
  const importedId = page.url().split('/').at(-1)
  const imported = (await (await page.request.get(`/api/characters/${importedId}`, { headers })).json()).character
  expect(imported).toMatchObject({ dex: 16, armorAcBonus: 2, acNoShield: 4 })
  expect(imported.items[0].name).toBe('Session rope')
  expect(imported.items[0].id).not.toBe(character.items[0].id)
  await expect(page.getByRole('heading', { name: character.characterName, exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('sheet-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath('sheet-mobile.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('failed item edits survive switching tabs and retry from the sheet save button', async ({ page }) => {
  const { character, headers } = await fixture(page)
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  const path = `/api/characters/${character.id}/items/${character.items[0].id}`
  await page.route(`**${path}`, route => route.fulfill({ status: 503, json: { error: 'Temporary save failure' } }))
  await page.getByLabel('Quantidade de Session rope').fill('3')
  await page.getByLabel('Quantidade de Session rope').blur()
  await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Geral & Combate', exact: true }).click()
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  await expect(page.getByLabel('Quantidade de Session rope')).toHaveValue('3')
  await page.unroute(`**${path}`)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Falha ao salvar', { exact: true })).toHaveCount(0)
  const persisted = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(persisted.items[0].quantity).toBe(3)
})

test('stale relation edits preserve the local draft and require an explicit reload', async ({ page }) => {
  const { character, headers } = await fixture(page)
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  const current = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  const path = `/api/characters/${character.id}/items/${current.items[0].id}`
  expect((await page.request.put(path, { headers, data: { version: current.version, quantity: 2 } })).status()).toBe(200)
  await page.getByLabel('Quantidade de Session rope').fill('4'); await page.getByLabel('Quantidade de Session rope').blur()
  await expect(page.getByRole('alert').filter({ hasText: 'A ficha mudou' })).toBeVisible()
  await expect(page.getByLabel('Quantidade de Session rope')).toHaveValue('4')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Carregar versão atual' }).click()
  await expect(page.getByLabel('Quantidade de Session rope')).toHaveValue('2')
})

test('spending item charges updates the editor without erasing other drafts or restoring charges', async ({ page }) => {
  const { character, headers } = await fixture(page)
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  await page.getByLabel('Item mágico', { exact: true }).selectOption(character.items[0].id)
  await page.getByLabel('Identificado em jogo', { exact: true }).check()
  await page.getByLabel('Item com cargas (uma unidade por entrada)', { exact: true }).check()
  await page.getByLabel('Cargas registradas', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Salvar identificação e valores' }).click()
  await expect(page.getByText('Cargas disponíveis: 2', { exact: true })).toBeVisible()
  await page.getByLabel('Efeito conhecido', { exact: true }).fill('Efeito anotado durante a sessão')
  const activate = page.getByRole('button', { name: 'Ativar e gastar cargas' })
  for (const value of ['0', '-1', '1.5', '3']) {
    await page.getByLabel('Gastar', { exact: true }).fill(value)
    await expect(activate).toBeDisabled()
  }
  await page.getByLabel('Gastar', { exact: true }).fill('1')
  await activate.click()
  await expect(page.getByText('Cargas disponíveis: 1', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Cargas registradas', { exact: true })).toHaveValue('1')
  await expect(page.getByLabel('Efeito conhecido', { exact: true })).toHaveValue('Efeito anotado durante a sessão')
  await page.getByRole('button', { name: 'Salvar identificação e valores' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Item atualizado.' })).toBeVisible()
  const persisted = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(JSON.parse(persisted.items[0].magicDetails)).toMatchObject({ charges: 1, effect: 'Efeito anotado durante a sessão' })
  await page.route('**/items/*/charge', route => route.fulfill({ status: 400, json: { error: 'Não há cargas suficientes para esta ativação.' } }))
  await activate.click()
  await expect(page.getByRole('alert').filter({ hasText: 'Não há cargas suficientes' })).toBeVisible()
  await expect(page.getByText('Cargas disponíveis: 1', { exact: true })).toBeVisible()
})

test('domain previews lock inputs, reject obsolete responses and show command failures', async ({ page }, testInfo) => {
  const { character, headers } = await fixture(page)
  expect((await page.request.put(`/api/characters/${character.id}/domain`, { headers, data: { version: character.version, peasantFamilies: 100, treasury: 1000 } })).status()).toBe(200)
  await page.reload()
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const target = `**/api/campaign-rules/characters/${character.id}/domain/preview`
  await page.route(target, async route => { await gate; await route.continue() })
  const requested = page.waitForRequest(r => r.url().endsWith('/domain/preview'))
  await page.getByRole('button', { name: 'Conferir mês', exact: true }).click()
  await requested
  await expect(page.getByLabel('Mês', { exact: true })).toBeDisabled()
  await expect(page.getByLabel('Projeto de pesquisa', { exact: true })).toBeDisabled()
  // A programmatic update represents a reactive change while the response is in flight.
  await page.getByLabel('Mês', { exact: true }).evaluate((input: HTMLInputElement) => { input.value = '2'; input.dispatchEvent(new Event('input', { bubbles: true })) })
  release()
  await expect(page.getByRole('alert').filter({ hasText: 'Os dados mudaram durante a conferência' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar fechamento mensal', exact: true })).toHaveCount(0)
  await page.unroute(target)
  await page.getByRole('button', { name: 'Conferir mês', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirmar fechamento mensal', exact: true })).toBeVisible()
  await page.getByLabel('Famílias ganhas', { exact: true }).fill('1')
  await expect(page.getByRole('button', { name: 'Confirmar fechamento mensal', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Conferir mês', exact: true }).click()
  await page.route('**/domain/apply', route => route.fulfill({ status: 400, json: { error: 'Mês já registrado no domínio.' } }))
  await page.getByRole('button', { name: 'Confirmar fechamento mensal', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Mês já registrado no domínio.' })).toBeVisible()
  const persisted = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(persisted.domain.treasury).toBe(1000)
  await page.setViewportSize({width:320,height:812})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({path:testInfo.outputPath('workflows-mobile.png'),fullPage:true})
})

test('audit history belongs to the selected campaign and errors do not look like an empty history', async ({ page }) => {
  const { headers } = await fixture(page)
  const campaigns = []
  for (const name of ['Audit anterior', 'Audit atual']) {
    const response = await page.request.post('/api/campaigns', { headers, data: { name } })
    expect(response.status()).toBe(201); campaigns.push(await response.json())
  }
  let release!: () => void, fail = false
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/campaigns/*/audit', async route => {
    const older = route.request().url().includes(campaigns[0].id)
    if (older) await gate
    if (fail) return route.fulfill({ status: 503, json: { error: 'Histórico indisponível.' } })
    await route.fulfill({ json: [{ id: older ? 'old' : 'new', details: older ? 'Registro antigo' : 'Registro atual', createdAt: new Date().toISOString() }] })
  })
  await page.goto('/dashboard')
  const filter = page.getByRole('combobox', { name: 'Filtrar fichas por campanha' })
  await filter.selectOption(campaigns[0].id)
  const requested = page.waitForRequest(r => r.url().endsWith(`${campaigns[0].id}/audit`))
  await page.getByRole('button', { name: 'Log de Alterações', exact: true }).click(); await requested
  await filter.selectOption(campaigns[1].id)
  await page.getByRole('button', { name: 'Log de Alterações', exact: true }).click()
  await expect(page.getByText('Registro atual', { exact: true })).toBeVisible()
  const oldResponse = page.waitForResponse(r => r.url().endsWith(`${campaigns[0].id}/audit`))
  release(); await oldResponse
  await expect(page.getByText('Registro antigo', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Registro atual', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Ocultar Logs', exact: true }).click(); fail = true
  await page.getByRole('button', { name: 'Log de Alterações', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Histórico indisponível.')
  await expect(page.getByText('Nenhuma alteração recente registrada.')).toHaveCount(0)
  await expect(page.getByText('Registro atual', { exact: true })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Tentar carregar histórico novamente' }).click()
  await expect(page.getByText('Registro atual', { exact: true })).toBeVisible()
  await page.route('**/api/campaigns', route => route.fulfill({ json: [{ ...campaigns[0], masterId: 'another-master' }] }))
  await page.reload()
  await filter.selectOption(campaigns[0].id)
  await expect(page.getByRole('button', { name: 'Log de Alterações', exact: true })).toHaveCount(0)
})

test('replacing an import file ignores late results and imports the displayed document', async ({ page }) => {
  const { character, headers } = await fixture(page)
  await page.goto('/dashboard')
  await page.evaluate(() => {
    const original = File.prototype.text
    File.prototype.text = function () {
      if (this.name !== 'older.json') return original.call(this)
      return new Promise<string>(resolve => { (window as any).releaseImportRead = () => { resolve('{}'); (window as any).importReadReleased = true } })
    }
  })
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click()
  const dialog = page.getByRole('dialog'), input = dialog.locator('input[type=file]')
  await input.setInputFiles({ name: 'older.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await expect(dialog.getByRole('status')).toContainText('Lendo arquivo')
  await expect(dialog.getByRole('button', { name: 'Criar ficha importada' })).toBeDisabled()
  const document = characterExport({ ...character, characterName: 'Arquivo escolhido por último' })
  await input.setInputFiles({ name: 'latest.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) })
  await expect(dialog.getByText('Arquivo escolhido por último', { exact: true })).toBeVisible()
  await page.evaluate(() => (window as any).releaseImportRead())
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  await expect(dialog.getByText('Arquivo escolhido por último', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Criar ficha importada' }).click()
  await expect(page).toHaveURL(/\/character\//)
  const importedId = page.url().split('/').at(-1)
  const persisted = (await (await page.request.get(`/api/characters/${importedId}`, { headers })).json()).character
  expect(persisted.characterName).toBe('Arquivo escolhido por último')
})

async function navigateInApp(page: Page, path: string) {
  await page.evaluate(path => (document.getElementById('app') as any).__vue_app__.config.globalProperties.$router.push(path), path)
}

test('adventure previews disable edits and ignore responses for changed values', async ({ page }) => {
  const { character, headers }=await fixture(page)
  await page.getByRole('button',{name:'Evolução & Regras',exact:true}).click()
  await page.getByLabel('Identificador único da aventura').fill('conferencia-concorrente')
  await page.getByLabel('Valor do tesouro elegível (GP)').fill('2000')
  let release!:()=>void
  const gate=new Promise<void>(resolve=>{release=resolve})
  await page.route('**/adventures/preview',async route=>{await gate;await route.continue()})
  const requested=page.waitForRequest(r=>r.url().endsWith('/adventures/preview'))
  await page.getByRole('button',{name:'Conferir distribuição de XP'}).click();await requested
  await expect(page.getByLabel('Valor do tesouro elegível (GP)')).toBeDisabled()
  await expect(page.getByLabel('Resultados individuais dos dados')).toBeDisabled()
  await page.getByLabel('Valor do tesouro elegível (GP)').evaluate((input:HTMLInputElement)=>{input.value='3000';input.dispatchEvent(new Event('input',{bubbles:true}))})
  release()
  await expect(page.getByRole('alert').filter({hasText:'Os dados mudaram durante a conferência'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Confirmar concessão de XP'})).toHaveCount(0)
  await page.unroute('**/adventures/preview')
  await page.getByRole('button',{name:'Conferir distribuição de XP'}).click()
  await expect(page.getByText('Tesouro: 3000 XP · monstros: 0 XP',{exact:true})).toBeVisible()
  const current=(await(await page.request.get(`/api/characters/${character.id}`,{headers})).json()).character
  expect((await page.request.put(`/api/characters/${character.id}`,{headers,data:{version:current.version,notes:'Mudança paralela'}})).status()).toBe(200)
  await page.getByRole('button',{name:'Confirmar concessão de XP'}).click()
  await expect(page.getByRole('alert').filter({hasText:'A ficha mudou'})).toBeVisible()
  const persisted=(await(await page.request.get(`/api/characters/${character.id}`,{headers})).json()).character
  expect(persisted.xp).toBe(0)
})

test('changing only the character route saves pending edits or blocks navigation on failure', async ({ page }) => {
  const { character, headers } = await fixture(page)
  const created = await page.request.post('/api/characters/guided', { headers, data: { characterName: 'Outra ficha de navegação', classKey: 'catalog:fighter', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6 } })
  expect(created.status()).toBe(201)
  const other = (await created.json()).character
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  const path = `/api/characters/${character.id}/items/${character.items[0].id}`
  await page.route(`**${path}`, route => route.fulfill({ status: 503, json: { error: 'A alteração ainda não foi salva.' } }))
  await page.getByLabel('Quantidade de Session rope').fill('3'); await page.getByLabel('Quantidade de Session rope').blur()
  await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  await navigateInApp(page, `/character/${other.id}`)
  await expect(page).toHaveURL(new RegExp(`/character/${character.id}$`))
  await expect(page.getByLabel('Quantidade de Session rope')).toHaveValue('3')
  await page.unroute(`**${path}`)
  await navigateInApp(page, `/character/${other.id}`)
  await expect(page.getByRole('heading', { name: other.characterName, exact: true })).toBeVisible()
  const previous = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(previous.items[0].quantity).toBe(3)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  const next = (await (await page.request.get(`/api/characters/${other.id}`, { headers })).json()).character
  expect(next.characterName).toBe(other.characterName)
  expect(next.items).toHaveLength(0)
})

test('changing campaign route reloads settings and writes to the new campaign', async ({ page }) => {
  const { headers } = await fixture(page)
  const campaigns=[]
  for(const [name,year] of [['Primeira campanha',2],['Segunda campanha',5]] as const){
    const response=await page.request.post('/api/campaigns',{headers,data:{name}})
    expect(response.status()).toBe(201)
    const campaign=await response.json();campaigns.push(campaign)
    expect((await page.request.put(`/api/campaigns/${campaign.id}/settings`,{headers,data:{currentYear:year}})).status()).toBe(200)
  }
  await page.goto(`/campaigns/${campaigns[0].id}/manage`)
  const settings=page.locator('fieldset').filter({has:page.getByRole('heading',{name:'Regras Opcionais e Calendário',exact:true})})
  await expect(settings.getByRole('spinbutton').nth(0)).toHaveValue('2')
  await navigateInApp(page,`/campaigns/${campaigns[1].id}/manage`)
  await expect(settings.getByRole('spinbutton').nth(0)).toHaveValue('5')
  await settings.getByRole('spinbutton').nth(0).fill('6')
  const saved=page.waitForResponse(r=>r.url().endsWith(`${campaigns[1].id}/settings`) && r.request().method()==='PUT')
  await page.getByRole('button',{name:'Salvar Configurações',exact:true}).click()
  expect((await saved).status()).toBe(200)
  expect((await(await page.request.get(`/api/campaigns/${campaigns[0].id}/settings`,{headers})).json()).currentYear).toBe(2)
  expect((await(await page.request.get(`/api/campaigns/${campaigns[1].id}/settings`,{headers})).json()).currentYear).toBe(6)
})

test('changing creation campaign query protects the draft and resets choices only after confirmation', async ({ page }) => {
  const { headers }=await fixture(page)
  const response=await page.request.post('/api/campaigns',{headers,data:{name:'Destino da criação'}})
  expect(response.status()).toBe(201)
  const campaign=await response.json()
  await page.goto('/characters/new')
  await page.getByRole('button',{name:'Continuar',exact:true}).click()
  await page.getByRole('combobox',{name:'Classe',exact:true}).selectOption('catalog:fighter')
  await page.getByRole('button',{name:'Continuar',exact:true}).click()
  await page.getByLabel('Nome',{exact:true}).fill('Rascunho protegido')
  page.once('dialog',dialog=>dialog.dismiss())
  await navigateInApp(page,`/characters/new?campaignId=${campaign.id}`)
  await expect(page).toHaveURL(/\/characters\/new$/)
  await expect(page.getByLabel('Nome',{exact:true})).toHaveValue('Rascunho protegido')
  page.once('dialog',dialog=>dialog.accept())
  await navigateInApp(page,`/characters/new?campaignId=${campaign.id}`)
  await expect(page.getByRole('combobox',{name:'Campanha',exact:true})).toHaveValue(campaign.id)
  await expect(page.getByRole('heading',{name:'Campanha e atributos',exact:true})).toBeVisible()
})
