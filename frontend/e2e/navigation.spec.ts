import { test, expect, type Page } from '@playwright/test'

let account: { token: string; user: any } | undefined
async function signIn(page: Page, role = 'MASTER') {
  if (!account) {
  const suffix = `nav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const response = await page.request.post('/api/auth/register', { data: {
    username: suffix, email: `${suffix}@test.invalid`, password: 'browser-test-password', role,
  } })
  expect(response.status()).toBe(201)
  account = await response.json()
  }
  const { token, user } = account!
  await page.goto('/login')
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user))
  }, { token, user })
  return { headers: { authorization: `Bearer ${token}` } }
}

test('login labels, error feedback, skip link and unknown routes remain accessible', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveTitle('Entrar — ACKS II')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await page.getByLabel('Email', { exact: true }).fill('incorrect@test.invalid')
  await page.getByLabel('Senha', { exact: true }).fill('wrong-password')
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('autocomplete', 'current-password')
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, json: { error: 'Credenciais inválidas.' } }))
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Credenciais inválidas.')
  await page.goto('/endereco-inexistente')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL(/login$/)
  await page.getByRole('link', { name: 'Registre-se' }).click()
  await expect(page.getByLabel('Nome de Usuário')).toHaveAttribute('maxlength', '40')
  await expect(page.getByRole('button', { name: 'Jogador', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Mestre', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mestre', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('corrupted session storage recovers to login instead of a blank page', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => { localStorage.setItem('token', 'invalid'); localStorage.setItem('user', '{broken') })
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/login$/)
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()
  expect(errors).toEqual([])
})

test('master can filter unassigned sheets and open cards using the keyboard', async ({ page }) => {
  const { headers } = await signIn(page)
  const createdCampaign = await page.request.post('/api/campaigns', { headers, data: { name: 'Navigation campaign' } })
  expect(createdCampaign.status()).toBe(201)
  const campaign = await createdCampaign.json()
  for (const [name, campaignId] of [['Unassigned hero', ''], ['Campaign hero', campaign.id]]) {
    const response = await page.request.post('/api/characters/guided', { headers, data: {
      characterName: name, campaignId, classKey: 'catalog:fighter', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6,
    } })
    expect(response.status()).toBe(201)
  }
  await page.goto('/dashboard')
  const filter = page.getByRole('combobox', { name: 'Filtrar fichas por campanha' })
  await expect(filter).toHaveValue('ALL')
  await expect(page.getByRole('link', { name: 'Unassigned hero', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Campaign hero', exact: true })).toBeVisible()
  await filter.selectOption('')
  await expect(page.getByRole('link', { name: 'Campaign hero', exact: true })).toHaveCount(0)
  const card = page.getByRole('link', { name: 'Unassigned hero', exact: true })
  await card.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/character\//)
})

test('failed lists show retry instead of claiming there are no records', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/characters', route => route.fulfill({ status: 503, json: { error: 'Falha ao carregar fichas.' } }))
  await page.goto('/dashboard')
  await expect(page.getByRole('alert')).toContainText('Falha ao carregar fichas.')
  await expect(page.getByText(/Nenhum personagem encontrado/)).toHaveCount(0)
  await page.unroute('**/api/characters')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('status', { name: 'Carregando personagens' })).toHaveCount(0)
  await page.route('**/api/campaigns', route => route.fulfill({ status: 503, json: { error: 'Falha ao carregar campanhas.' } }))
  await page.getByRole('link', { name: 'Campanhas', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Falha ao carregar campanhas.')
  await expect(page.getByText('Nenhuma campanha encontrada.')).toHaveCount(0)
  await page.unroute('**/api/campaigns')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('status', { name: 'Carregando campanhas' })).toHaveCount(0)
})

test('sheet load failure offers a working retry', async ({ page }) => {
  const { headers } = await signIn(page)
  const response = await page.request.post('/api/characters/guided', { headers, data: {
    characterName: 'Retry hero', classKey: 'catalog:fighter', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6,
  } })
  expect(response.status()).toBe(201)
  const { character } = await response.json()
  const target = `**/api/characters/${character.id}`
  await page.route(target, route => route.fulfill({ status: 503, json: { error: 'Ficha indisponível temporariamente.' } }))
  await page.goto(`/character/${character.id}`)
  await expect(page.getByRole('alert')).toContainText('Ficha indisponível temporariamente.')
  await page.unroute(target)
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('rules search ignores late responses and reports failures', async ({ page }, testInfo) => {
  await signIn(page)
  let releaseOld!: () => void
  const gate = new Promise<void>(resolve => { releaseOld = resolve })
  await page.route('**/api/rules/search?*', async route => {
    const query = new URL(route.request().url()).searchParams.get('q')
    if (query === 'older') await gate
    if (query === 'failure') return route.fulfill({ status: 503, json: { error: 'Busca temporariamente indisponível.' } })
    return route.fulfill({ json: [{ chapter: 'Test', heading: `Result ${query}`, content: 'Test rule content' }] })
  })
  await page.goto('/dashboard/judge')
  const input = page.getByRole('textbox', { name: 'Pesquisar regras' })
  const olderRequest = page.waitForRequest(r => r.url().includes('q=older'))
  await input.fill('older')
  await olderRequest
  await input.fill('latest')
  await expect(page.getByRole('heading', { name: 'Result latest' })).toBeVisible()
  const olderResponse = page.waitForResponse(r => r.url().includes('q=older'))
  releaseOld()
  await olderResponse
  await expect(page.getByRole('heading', { name: 'Result older' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Result latest' })).toBeVisible()
  await input.fill('failure')
  await expect(page.getByRole('alert')).toContainText('Busca temporariamente indisponível.')
  await expect(page.getByText(/Nenhuma regra encontrada/)).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('judge-mobile.png') })
})

test('guided creation explains free classes and prevents overspending before submission', async ({ page }) => {
  const { headers } = await signIn(page)
  const campaignResponse = await page.request.post('/api/campaigns', { headers, data: { name: 'Guided campaign' } })
  expect(campaignResponse.status()).toBe(201)
  const campaign = await campaignResponse.json()
  const catalog = await (await page.request.get('/api/classes/catalog', { headers })).json()
  const fighter = catalog.find((c: any) => c.id === 'catalog:fighter')
  const classResponse = await page.request.post(`/api/classes/${campaign.id}`, { headers, data: {
    name: 'Fighter', hitDie: fighter.hitDie, conBonus: fighter.conBonus,
    xpPerLevel: JSON.parse(fighter.xpPerLevel), titles: JSON.parse(fighter.titles),
    attackThrows: JSON.parse(fighter.attackThrows), savingThrows: JSON.parse(fighter.savingThrows),
    creationRules: { keyAttributes: ['str'], minimumAttributes: { str: 9 }, spellcaster: false },
  } })
  expect(classResponse.status()).toBe(201)
  const custom = await classResponse.json()
  await page.goto(`/characters/new?campaignId=${campaign.id}`)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel(/^Classe/).selectOption(custom.id)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('exige modo manual')
  await expect(page.getByRole('heading', { name: 'Escolha sua classe' })).toBeVisible()
  await page.getByRole('button', { name: 'Usar ajustes aprovados pelo mestre', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Registre a decisão do mestre')
  await page.getByLabel(/^Decisão do mestre/).fill('Definição de Fighter da campanha aprovada para este teste.')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Lief test')
  await page.getByLabel(/^PV iniciais/).fill('8')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel(/Comprar com orçamento/).check()
  for (const [i, id] of ['i-horse-riding', 'w-crossbow'].entries()) {
    await page.getByRole('button', { name: '+ Comprar equipamento', exact: true }).click()
    await page.getByRole('combobox', { name: 'Equipamento comprado', exact: true }).nth(i).selectOption(id)
  }
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('excedem o ouro inicial em 5.00 GP')
  await expect(page.getByRole('heading', { name: 'Equipamento inicial' })).toBeVisible()
  await page.getByLabel('Ouro inicial', { exact: true }).fill('110')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByText('1 × Horse, Riding — 75.00 GP', { exact: true })).toBeVisible()
  await expect(page.getByText('1 × Crossbow — 30.00 GP', { exact: true })).toBeVisible()
  await expect(page.getByText(/8 PV · 5 GP · 0 SP · 0 CP/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar e abrir ficha' }).click()
  await expect(page).toHaveURL(/\/character\//)
  const id = new URL(page.url()).pathname.split('/').at(-1)
  const stored = (await (await page.request.get(`/api/characters/${id}`, { headers })).json()).character
  expect(stored.classKey).toBe(custom.id)
  expect(stored.coinGP).toBe(5)
  expect(stored.items.some((i: any) => i.name === 'Horse, Riding')).toBe(true)
  expect(stored.weapons.some((w: any) => w.catalogId === 'w-crossbow')).toBe(true)
  expect(JSON.parse(stored.rulesState).creationMode).toBe('manual')
})

test('book creation requests starting proficiencies during identity', async ({ page }) => {
  await signIn(page)
  await page.goto('/characters/new')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel(/^Classe/).selectOption('catalog:fighter')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Book fighter')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('ao menos uma proficiência de classe e geral')
  await expect(page.getByRole('heading', { name: 'Identidade e escolhas iniciais' })).toBeVisible()
})

test.describe('small screens', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
  test('campaign form fits the viewport and prevents duplicate submissions', async ({ page }, testInfo) => {
    await signIn(page)
    await page.goto('/campaigns')
    await page.getByRole('button', { name: '+ Nova Campanha', exact: true }).tap()
    await page.getByLabel('Nome da campanha').fill('Mobile campaign')
    let requests = 0
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/campaigns', async route => {
      if (route.request().method() !== 'POST') return route.continue()
      requests++
      await gate
      await route.continue()
    })
    const submit = page.getByRole('button', { name: 'Criar', exact: true })
    await submit.tap()
    await expect(page.getByRole('button', { name: 'Criando…', exact: true })).toBeDisabled()
    await page.getByLabel('Nome da campanha').press('Enter')
    expect(requests).toBe(1)
    release()
    await expect(page.getByRole('heading', { name: 'Mobile campaign', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await page.screenshot({ path: testInfo.outputPath('campaign-mobile.png') })
  })
})
