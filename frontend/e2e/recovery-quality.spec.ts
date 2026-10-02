import { test, expect, type Page } from '@playwright/test'

let sharedAccount: { token: string; user: any } | undefined
async function account(page: Page, isolated = false) {
  let session = isolated ? undefined : sharedAccount
  if (!session) {
    const suffix = `recovery_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    const response = await page.request.post('/api/auth/register', { data: { username: suffix, email: `${suffix}@test.invalid`, password: 'browser-test-password', role: 'MASTER' } })
    expect(response.status()).toBe(201)
    session = await response.json()
    if (!isolated) sharedAccount = session
  }
  const { token, user } = session!
  await page.goto('/login')
  await page.evaluate(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, { token, user })
  return { headers: { authorization: `Bearer ${token}` }, user }
}
async function hero(page: Page, headers: Record<string, string>, name = 'Recovery Hero', klass = 'fighter') {
  const response = await page.request.post('/api/characters/guided', { headers, data: { characterName: name, classKey: `catalog:${klass}`, str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: klass === 'mage' ? 4 : 6 } })
  expect(response.status()).toBe(201)
  return (await response.json()).character
}
const nameInput = (page: Page) => page.getByText('Character Name', { exact: true }).locator('..').locator('input')
async function reload(page: Page) { page.once('dialog', dialog => dialog.accept()); await page.reload() }

test('creation choices, class and HP survive reload without submitting a new character', async ({ page }) => {
  await account(page)
  let created = 0
  page.on('request', req => { if (req.url().endsWith('/api/characters/guided') && req.method() === 'POST') created++ })
  await page.goto('/characters/new')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('combobox', { name: 'Classe', exact: true }).selectOption('catalog:fighter')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Guardado no navegador')
  await page.getByRole('spinbutton', { name: /^PV iniciais/ }).fill('8')
  await reload(page)
  await page.getByRole('button', { name: 'Recuperar criação' }).click()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Guardado no navegador')
  await expect(page.getByRole('spinbutton', { name: /^PV iniciais/ })).toHaveValue('8')
  expect(created).toBe(0)
})

test('failed scalar edits survive reload and need an explicit save after recovery', async ({ page }) => {
  const { headers, user } = await account(page), character = await hero(page, headers)
  await page.goto(`/character/${character.id}`)
  await page.route(`**/api/characters/${character.id}`, route => route.request().method() === 'PUT' ? route.abort('failed') : route.continue())
  await nameInput(page).fill('Nome ainda não salvo')
  await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  await reload(page)
  await expect(nameInput(page)).toHaveValue('Recovery Hero')
  let writes = 0
  page.on('request', req => { if (req.method() === 'PUT' && req.url().endsWith(`/characters/${character.id}`)) writes++ })
  await page.getByRole('button', { name: 'Recuperar rascunho', exact: true }).click()
  await expect(nameInput(page)).toHaveValue('Nome ainda não salvo')
  expect(writes).toBe(0)
  await page.unroute(`**/api/characters/${character.id}`)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
  const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(saved.characterName).toBe('Nome ainda não salvo'); expect(saved.version).toBe(character.version + 1)
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), `acks:draft:v1:${user.id}:sheet%3A${character.id}`)).toBeNull()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Recuperar rascunho', exact: true })).toHaveCount(0)
})

test('stale drafts stay downloadable and never overwrite a newer server revision', async ({ page }) => {
  const { headers } = await account(page), character = await hero(page, headers)
  await page.goto(`/character/${character.id}`)
  await page.route(`**/api/characters/${character.id}`, route => route.request().method() === 'PUT' ? route.abort('failed') : route.continue())
  await nameInput(page).fill('Meu rascunho em conflito')
  await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  const changed = await page.request.put(`/api/characters/${character.id}`, { headers, data: { version: character.version, characterName: 'Nome de outra sessão' } })
  expect(changed.status()).toBe(200)
  await reload(page)
  await expect(page.getByText('A ficha mudou no servidor.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recuperar rascunho', exact: true })).toHaveCount(0)
  await expect(nameInput(page)).toHaveValue('Nome de outra sessão')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar rascunho', exact: true }).click()
  expect((await download).suggestedFilename()).toMatch(/rascunho\.json$/)
})

test('a failed item editor is recovered and sends its original version only on save', async ({ page }) => {
  const { headers } = await account(page), character = await hero(page, headers)
  const added = await page.request.post(`/api/characters/${character.id}/items`, { headers, data: { version: character.version, name: 'Rope', quantity: 1, weight: 1 } })
  expect(added.status()).toBe(201)
  const item = (await added.json()).item
  await page.goto(`/character/${character.id}`)
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  await page.route(`**/api/characters/${character.id}/items/${item.id}`, route => route.abort('failed'))
  await page.getByLabel('Nome do item Rope', { exact: true }).fill('Corda recuperada')
  await page.getByLabel('Quantidade de Corda recuperada', { exact: true }).click()
  await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  await reload(page)
  await page.getByRole('button', { name: 'Recuperar rascunho', exact: true }).click()
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  await expect(page.getByLabel('Nome do item Corda recuperada', { exact: true })).toHaveValue('Corda recuperada')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  await expect(page.getByText(/1 alteração\(ões\) recuperada/)).toBeVisible()
  await page.unroute(`**/api/characters/${character.id}/items/${item.id}`)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText(/alteração\(ões\) recuperada/)).toHaveCount(0)
  const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(saved.items[0].name).toBe('Corda recuperada'); expect(saved.version).toBe(2)
})

test('an invalid recovered item can be corrected in its editor and saved as a new intent', async ({ page }) => {
  const { headers } = await account(page), character = await hero(page, headers)
  const added = await page.request.post(`/api/characters/${character.id}/items`, { headers, data: { version: character.version, name: 'Rope', quantity: 1, weight: 1 } })
  expect(added.status()).toBe(201)
  await page.goto(`/character/${character.id}`)
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  await page.getByLabel('Quantidade de Rope', { exact: true }).fill('0')
  await page.getByRole('heading', { name: /^Inventário/ }).click()
  await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  await reload(page)
  await page.getByRole('button', { name: 'Recuperar rascunho', exact: true }).click()
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  await expect(page.getByLabel('Quantidade de Rope', { exact: true })).toHaveValue('0')
  await page.getByLabel('Quantidade de Rope', { exact: true }).fill('2')
  await page.getByRole('heading', { name: /^Inventário/ }).click()
  await expect(page.getByText(/alteração\(ões\) recuperada/)).toHaveCount(0)
  await expect.poll(async () => (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character.items[0].quantity).toBe(2)
  const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(saved.version).toBe(2)
})

test('dashboard combines search and sorting, remembers recent sheets and fits a mobile screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { headers } = await account(page, true)
  const aria = await hero(page, headers, 'Ária', 'mage')
  await hero(page, headers, 'Bruno')
  await page.goto(`/character/${aria.id}`)
  await expect(page.getByRole('heading', { name: 'Ária', exact: true })).toBeVisible()
  const summary = page.waitForResponse(r => r.url().includes('/api/characters?view=summary'))
  await page.getByRole('link', { name: 'Voltar', exact: true }).click()
  expect((await summary).status()).toBe(200)
  await expect(page.getByRole('navigation', { name: 'Personagens recentes' }).getByRole('link', { name: 'Ária' })).toBeVisible()
  await page.getByLabel('Buscar personagens', { exact: true }).fill('aria MAGE')
  await expect(page.getByRole('heading', { name: 'Ária', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bruno', exact: true })).toHaveCount(0)
  await page.getByLabel('Buscar personagens', { exact: true }).fill('não existe')
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await page.getByRole('combobox', { name: 'Ordenar personagens', exact: true }).selectOption('name')
  expect(await page.locator('h3').allTextContents()).toEqual(['Ária', 'Bruno'])
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/dashboard-quality-mobile.png', fullPage: true })
})

test('a purchase committed before its response was lost is never replayed on recovery', async ({ page }) => {
  const { headers } = await account(page), character = await hero(page, headers)
  expect((await page.request.put(`/api/characters/${character.id}`, { headers, data: { version: character.version, coinGP: 20 } })).status()).toBe(200)
  await page.goto(`/character/${character.id}`)
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  await page.getByRole('button', { name: /Loja/ }).click()
  let purchases = 0
  await page.route(`**/api/characters/${character.id}/shop/purchase`, async route => {
    purchases++
    expect((await route.fetch()).status()).toBe(201)
    await route.abort('failed')
  })
  const torch = page.locator('[title="Torches (6)"]').locator('../..')
  await torch.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  await reload(page)
  await expect(page.getByText('A ficha mudou no servidor.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recuperar rascunho', exact: true })).toHaveCount(0)
  const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(saved.coinGP).toBe(19); expect(saved.items).toHaveLength(1); expect(purchases).toBe(1)
})
