import { approveStudyCorrection } from './helpers/ruleFixtures'
import { test, expect, type Page } from '@playwright/test'

let account: { token: string; user: any }
async function signIn(page: Page) {
  if (!account) {
    const name = `choices_${Date.now().toString(36)}`
    const response = await page.request.post('/api/auth/register', { data: { username: name, email: `${name}@test.invalid`, password: 'browser-test-password', role: 'MASTER' } })
    expect(response.status()).toBe(201)
    account = await response.json()
  }
  await page.goto('/login')
  await page.evaluate(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, account)
  return { authorization: `Bearer ${account.token}` }
}
async function start(page: Page, klass: string) {
  await signIn(page)
  await page.goto('/characters/new')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('combobox', { name: 'Classe', exact: true }).selectOption(`catalog:${klass}`)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill(`Choices ${klass}`)
  if (klass === 'barbarian') {
    await page.getByRole('combobox', {name:'Especialização de dano',exact:true}).fill('Corpo a corpo')
    await page.getByRole('listbox', {name:'Opções de Especialização de dano',exact:true}).getByText('Corpo a corpo',{exact:true}).click()
  }
  if (klass === 'venturer') {
    await page.getByRole('combobox', {name:'Expert Traveling · escolha gratuita',exact:true}).fill('Driving')
    await page.getByRole('listbox', {name:'Opções de Expert Traveling · escolha gratuita',exact:true}).getByText('Driving',{exact:true}).click()
  }
}
async function addProf(page: Page, name: string, category: string) {
  await page.getByRole('button', { name: '+ Proficiência', exact: true }).click()
  await page.getByLabel('Nome da proficiência', { exact: true }).last().fill(name)
  await page.getByLabel('Categoria', { exact: true }).last().selectOption(category)
}
async function chooseSpell(page: Page, label: string, name: string) {
  await page.getByLabel(label, { exact: true }).fill(name)
  await page.getByRole('listbox', { name: `Opções de ${label}`, exact: true }).getByText(name, { exact: true }).click()
}
async function review(page: Page) {
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Equipamento inicial' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revisar personagem' })).toBeVisible()
}
async function confirm(page: Page) {
  const request = page.waitForResponse(r => r.url().endsWith('/api/characters/guided') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Confirmar e abrir ficha', exact: true }).click()
  const response = await request
  expect(response.status(), await response.text()).toBe(201)
  await expect(page).toHaveURL(/\/character\//)
  return (await response.json()).character
}

test('Tribal Warrior receives origin proficiencies without consuming class or general choices', async ({ page }, info) => {
  await start(page, 'barbarian')
  await page.getByLabel('Nome', { exact: true }).fill('Roderick')
  await page.getByLabel('Terra natal', { exact: true }).fill('Corvanthis')
  await page.getByLabel('PV iniciais').fill('6')
  await addProf(page, 'Adventuring', 'general'); await addProf(page, 'Ambushing', 'class'); await addProf(page, 'Tracking', 'general')
  await addProf(page, 'Running', 'class'); await addProf(page, 'Endurance', 'general')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Escolha a origem do bárbaro')
  const origin = page.getByRole('combobox', { name: 'Origem do bárbaro', exact: true })
  const free = page.getByRole('region', { name: 'Proficiências concedidas automaticamente', exact: true })
  await origin.selectOption('jutland'); await expect(free).toContainText('Climbing'); await expect(free).toContainText('Seafaring')
  await origin.selectOption('skysostan'); await expect(free).toContainText('Precise Shooting'); await expect(free).not.toContainText('Climbing')
  await origin.selectOption('ivory-kingdoms')
  await expect(free).toContainText('Running'); await expect(free).toContainText('Endurance'); await expect(free).not.toContainText('Riding')
  await expect(page.getByLabel('Nome da proficiência', { exact: true })).toHaveCount(2)
  await expect(page.getByLabel('Nome da proficiência', { exact: true }).first()).toHaveValue('Ambushing')
  await expect(page.getByLabel('Nome da proficiência', { exact: true }).last()).toHaveValue('Tracking')
  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: info.outputPath('barbarian-origin-creation-mobile.png'), fullPage: true })
  await review(page)
  await expect(page.getByText('Origem do bárbaro: Ivory Kingdoms · Running, Endurance (concedidas)', { exact: true })).toBeVisible()
  const hero = await confirm(page)
  const saved = (await (await page.request.get(`/api/characters/${hero.id}`, { headers: { authorization: `Bearer ${account.token}` } })).json()).character
  expect(saved.proficiencies.filter((p: any) => p.category === 'natural').map((p: any) => p.name).sort()).toEqual(['Endurance', 'Running'])
  expect(saved.proficiencies.filter((p: any) => p.category === 'class')).toHaveLength(1)
  expect(saved.proficiencies.filter((p: any) => p.category === 'general')).toHaveLength(1)
  await expect(page.getByRole('heading', { name: 'Proficiências naturais', exact: true })).toBeVisible()
  await expect(page.getByLabel('Alvo da proficiência Running', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  await expect(page.getByText('Escolhas permitidas no nível atual:', { exact: false })).toContainText('1 de classe e 1 gerais')
})

test('masters preview and confirm the correction of a legacy barbarian sheet', async ({ page }) => {
  const headers = await signIn(page)
  const response = await page.request.post('/api/characters/guided', { headers, data: { characterName: 'Bárbaro antigo', classKey: 'catalog:barbarian', str: 13, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6, rulesMode: 'manual', exceptionReason: 'Ficha anterior à correção.', proficiencies: [{ name: 'Ambushing', category: 'class' }, { name: 'Tracking', category: 'general' }, { name: 'Running', category: 'class' }, { name: 'Endurance', category: 'general' }] } })
  expect(response.status()).toBe(201); const hero = (await response.json()).character
  await page.goto(`/character/${hero.id}`)
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  await page.getByRole('combobox', { name: 'Origem a conferir', exact: true }).selectOption('ivory-kingdoms')
  await page.getByRole('button', { name: 'Conferir proficiências da origem', exact: true }).click()
  await expect(page.getByText('Mover para gratuitas:', { exact: false })).toContainText('Running')
  const before = (await (await page.request.get(`/api/characters/${hero.id}`, { headers })).json()).character
  expect(before.proficiencies.filter((p:any) => p.category === 'natural')).toHaveLength(0)
  await page.getByRole('button', { name: 'Confirmar proficiências da origem', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Origem registrada.' })).toBeVisible()
  const stored = (await (await page.request.get(`/api/characters/${hero.id}`, { headers })).json()).character
  expect(stored.proficiencies.filter((p:any) => p.category === 'natural')).toHaveLength(2)
  expect(stored.proficiencies.filter((p:any) => ['class','general'].includes(p.category))).toHaveLength(2)
  await page.getByRole('button', { name: 'Geral & Combate', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Proficiências naturais', exact: true })).toBeVisible()
})

test('reported Venturer choices are corrected in identity before any creation request', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await start(page, 'venturer')
  await page.getByLabel('PV iniciais').fill('6')
  await addProf(page, 'Caving', 'general')
  await addProf(page, 'Seduction', 'class')
  let creations = 0; page.on('request', r => { if (r.url().endsWith('/api/characters/guided')) creations++ })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('categoria Geral')
  await expect(page.getByRole('alert')).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Identidade e escolhas iniciais' })).toBeVisible()
  expect(creations).toBe(0)
  await page.getByLabel('Nome da proficiência', { exact: true }).nth(0).fill('Seduction')
  await page.getByLabel('Nome da proficiência', { exact: true }).nth(1).fill('Navigation')
  await review(page)
  const character = await confirm(page)
  const stored = (await (await page.request.get(`/api/characters/${character.id}`, { headers: { authorization: `Bearer ${account.token}` } })).json()).character
  expect(stored.proficiencies).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Seduction', category: 'general' }), expect.objectContaining({ name: 'Navigation', category: 'class' })]))
  expect(errors).toEqual([])
})

test('Mage requires an initial spell and rejects duplicates before review, including mobile layout', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await start(page, 'mage')
  await addProf(page, 'Alchemy', 'class'); await addProf(page, 'Caving', 'general')
  await expect(page.getByLabel('Este personagem usa magia')).toBeChecked()
  await expect(page.getByLabel('Este personagem usa magia')).toBeDisabled()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('primeira magia arcana')
  for (let i = 1; i <= 2; i++) {
    await page.getByRole('button', { name: '+ Magia inicial', exact: true }).click()
    await expect(page.getByLabel(`Tradição da magia inicial ${i}`)).toHaveValue('arcane')
    expect(await page.getByLabel(`Tradição da magia inicial ${i}`).locator('option').count()).toBe(1)
    await chooseSpell(page, `Nome da magia inicial ${i}`, 'Arcane Armor')
  }
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('repetida')
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo', exact: true })).not.toBeInViewport()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('creation-errors-320.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.getByRole('button', { name: 'Usar tema pergaminho', exact: true }).click()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveCSS('background-color', 'rgb(245, 240, 232)')
  await page.screenshot({ path: testInfo.outputPath('creation-errors-parchment-320.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: testInfo.outputPath('creation-errors-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Remover magia inicial 2', exact: true }).click()
  await review(page)
  await expect(page.getByText('Arcane Armor · arcana · nível 1', { exact: true })).toBeVisible()
  await confirm(page)
})

test('switching class preserves choices and requires correcting incompatible magic', async ({ page }) => {
  await start(page, 'mage')
  await addProf(page, 'Alchemy', 'class'); await addProf(page, 'Caving', 'general')
  await page.getByRole('button', { name: '+ Magia inicial', exact: true }).click()
  await chooseSpell(page, 'Nome da magia inicial 1', 'Arcane Armor')
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('combobox', { name: 'Classe', exact: true }).selectOption('catalog:crusader')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('indisponível')
  await expect(page.getByLabel('Nome da magia inicial 1', { exact: true })).toHaveValue('Arcane Armor')
  await page.getByLabel('Nome da proficiência', { exact: true }).first().fill('Healing')
  await page.getByLabel('Tradição da magia inicial 1').selectOption('divine')
  await expect(page.getByLabel('Nome da magia inicial 1', { exact: true })).toHaveValue('')
  await chooseSpell(page, 'Nome da magia inicial 1', 'Cure Light Injury')
  await review(page); await confirm(page)
})

test('delayed spellcasters do not offer unavailable first-level magic', async ({ page }) => {
  await start(page, 'elven-nightblade')
  await addProf(page, 'Blind Fighting', 'class'); await addProf(page, 'Caving', 'general')
  await expect(page.getByText('Esta classe não possui magias disponíveis no nível 1.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Magia inicial', exact: true })).toBeDisabled()
  await review(page); await confirm(page)
})

test('manual mode accepts campaign magic, while book mode revalidates the same draft', async ({ page }) => {
  await start(page, 'mage')
  await addProf(page, 'Alchemy', 'class'); await addProf(page, 'Caving', 'general')
  await page.getByLabel('Modo de criação').selectOption('manual')
  await page.getByLabel('Decisão do mestre (obrigatória)').fill('Magia da campanha aprovada pelo mestre.')
  await page.getByRole('button', { name: '+ Magia inicial', exact: true }).click()
  await page.getByLabel('Nome da magia inicial 1', { exact: true }).fill('Campaign ward')
  await page.getByLabel('Modo de criação').selectOption('standard')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('modo manual')
  await page.getByLabel('Modo de criação').selectOption('manual')
  await review(page)
  const character = await confirm(page)
  expect(JSON.parse(character.rulesState).creationMode).toBe('manual')
})

test('server rejection returns to the relevant step and locks the draft during submission', async ({ page }) => {
  await start(page, 'fighter')
  await addProf(page, 'Intimidation', 'class'); await addProf(page, 'Caving', 'general')
  await review(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/characters/guided', async route => { await gate; await route.fulfill({ status: 400, json: { message: 'As regras mudaram: confira as escolhas.', step: 2 } }) })
  await page.getByRole('button', { name: 'Confirmar e abrir ficha', exact: true }).click()
  await expect(page.getByLabel('Modo de criação')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Voltar', exact: true })).toBeDisabled()
  release()
  await expect(page.getByRole('heading', { name: 'Identidade e escolhas iniciais' })).toBeVisible()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Choices fighter')
  await expect(page.getByLabel('Nome da proficiência', { exact: true }).first()).toHaveValue('Intimidation')
})

test('validated repertoire keeps draft on disclosure reopen and rejects invalid spells without posting', async ({ page }) => {
  const headers = await signIn(page)
  const response = await page.request.post('/api/characters/guided', { headers, data: { characterName: 'Repertoire draft', classKey: 'catalog:mage', str: 10, int: 16, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 4, spells: [{ name: 'Slumber', level: 1, tradition: 'arcane' }] } })
  expect(response.status()).toBe(201)
  const { character } = await response.json()
  await page.goto(`/character/${character.id}`)
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  const summary = page.getByText('Ajustar repertório com validação (mestre)', { exact: true })
  await summary.click()
  await page.getByLabel('Nome da magia 1', { exact: true }).fill('Not a catalog spell')
  await summary.click(); await summary.click()
  await expect(page.getByLabel('Nome da magia 1', { exact: true })).toHaveValue('Not a catalog spell')
  let posts = 0; page.on('request', r => { if (r.url().endsWith('/magic/repertoire')) posts++ })
  await approveStudyCorrection(page); await page.getByRole('button', { name: 'Salvar repertório', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('modo manual')
  expect(posts).toBe(0)
  expect(await page.getByLabel('Nível da magia 1', { exact: true }).locator('option').allTextContents()).toEqual(['1'])
  await page.getByLabel('Nome da magia 1', { exact: true }).fill('Arcane Armor')
  await approveStudyCorrection(page); await page.getByRole('button', { name: 'Salvar repertório', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Repertório registrado' })).toBeVisible()
  const stored = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(stored.spells[0].name).toBe('Arcane Armor')
})

test('class catalog campaign retry actually reloads the failed campaign list', async ({ page }) => {
  const headers = await signIn(page)
  const response = await page.request.post('/api/campaigns', { headers, data: { name: 'Catalog retry campaign' } })
  expect(response.status()).toBe(201)
  const campaign = await response.json()
  await page.route('**/api/campaigns', route => route.fulfill({ status: 503, json: { message: 'Campanhas indisponíveis.' } }))
  await page.goto('/classes')
  await expect(page.getByRole('alert')).toContainText('Campanhas indisponíveis')
  await page.unroute('**/api/campaigns')
  await page.getByRole('button', { name: 'Tentar carregar campanhas novamente', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Campanha', exact: true }).selectOption(campaign.id)
  await expect(page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'Venturer', exact: true }) })).toBeVisible()
})
