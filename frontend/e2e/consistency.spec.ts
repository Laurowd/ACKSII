import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
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
