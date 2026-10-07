import { openSheetExport } from './helpers/ruleFixtures'
import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { characterPrintHtml } from '../src/utils/characterExport'
const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

const accounts: Record<string, any> = {}
async function fixture(page: Page, role = 'MASTER', campaignId?: string) {
  const suffix = `reward_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  if (!accounts[role]) {
    const response = await page.request.post('/api/auth/register', { data: { username: suffix, email: `${suffix}@test.invalid`, password: 'browser-test-password', role } })
    expect(response.status()).toBe(201); accounts[role] = await response.json()
  }
  const account = accounts[role], headers = { authorization: `Bearer ${account.token}` }
  const response = await page.request.post('/api/characters/guided', { headers, data: { characterName: suffix, classKey: 'catalog:fighter', str: 18, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6, ...(campaignId && { campaignId }) } })
  expect(response.status(), await response.text()).toBe(201)
  const character = (await response.json()).character
  await page.goto('/login')
  await page.evaluate(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, account)
  await page.goto(`/character/${character.id}`)
  return { character, headers }
}

test('master enters final XP and gold independently, checks totals and commits once', async ({ page }) => {
  const { character, headers } = await fixture(page)
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  await page.getByLabel(`XP para ${character.characterName}`, { exact: true }).fill('750')
  await page.getByLabel(`Ouro para ${character.characterName}`, { exact: true }).fill('40')
  await page.getByRole('button', { name: 'Conferir recompensas', exact: true }).click()
  await expect(page.locator('[aria-label="Prévia das recompensas"]')).toContainText('XP: 0 + 750 = 750')
  expect((await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character.xp).toBe(0)
  await page.getByRole('button', { name: 'Confirmar XP e ouro', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'XP e ouro registrados' })).toBeVisible()
  const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(saved.xp).toBe(750); expect(saved.coinGP).toBe(40); expect(saved.level).toBe(1)
  await page.getByRole('button', { name: 'Geral & Combate', exact: true }).click()
  await expect(page.locator('header').filter({ hasText: character.characterName })).toContainText('750')
})

test('master dashboard grants equal rewards to a campaign without mixing another campaign', async ({ page }, testInfo) => {
  await fixture(page)
  const headers = { authorization: `Bearer ${accounts.MASTER.token}` }
  const response = await page.request.post('/api/campaigns', { headers, data: { name: `Rewards ${Date.now()}` } })
  expect(response.status()).toBe(201); const campaign = await response.json()
  const first = (await fixture(page, 'MASTER', campaign.id)).character
  const second = (await fixture(page, 'MASTER', campaign.id)).character
  await page.goto('/dashboard/judge')
  await page.getByRole('combobox', { name: 'Campanha', exact: true }).selectOption(campaign.id)
  await page.getByRole('button', { name: 'Distribuir XP e ouro', exact: true }).click()
  await page.getByText('Preencher o mesmo valor para os selecionados', { exact: true }).click()
  await page.getByLabel('XP por personagem', { exact: true }).fill('300')
  await page.getByLabel('Ouro por personagem (GP)', { exact: true }).fill('25')
  await page.getByRole('button', { name: 'Preencher selecionados', exact: true }).click()
  await page.getByRole('button', { name: 'Conferir recompensas', exact: true }).click()
  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath('reward-preview-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Confirmar XP e ouro', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'XP e ouro registrados' })).toBeVisible()
  for (const character of [first, second]) {
    const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
    expect(saved.xp).toBe(300); expect(saved.coinGP).toBe(25)
  }
})

test('uncertain reward response survives reload with its receipt and never credits twice', async ({ page }) => {
  const { character, headers } = await fixture(page)
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  await page.getByLabel(`XP para ${character.characterName}`, { exact: true }).fill('75')
  await page.getByRole('button', { name: 'Conferir recompensas', exact: true }).click()
  await page.route('**/game-rules/rewards/apply', async route => { await route.fetch(); await route.abort('failed') })
  await page.getByRole('button', { name: 'Confirmar XP e ouro', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /conexão|rede|confirmar/i }).first()).toBeVisible()
  await page.unroute('**/game-rules/rewards/apply')
  await page.reload()
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  await page.getByRole('button', { name: 'Recuperar lançamento', exact: true }).click()
  await expect(page.getByLabel(`XP para ${character.characterName}`, { exact: true })).toHaveValue('75')
  await page.getByRole('button', { name: 'Conferir recompensas', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'já foi registrada' })).toBeVisible()
  expect((await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character.xp).toBe(75)
})

test('reward previews reject late responses and stale participant versions without granting anything', async ({ page }) => {
  const { character, headers } = await fixture(page)
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  const input = page.getByLabel(`XP para ${character.characterName}`, { exact: true })
  await input.fill('100')
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/game-rules/rewards/preview', async route => { await gate; await route.continue() })
  const requested = page.waitForRequest(request => request.url().endsWith('/rewards/preview'))
  await page.getByRole('button', { name: 'Conferir recompensas', exact: true }).click(); await requested
  await expect(input).toBeDisabled()
  await input.evaluate((input: HTMLInputElement) => { input.value = '200'; input.dispatchEvent(new Event('input', { bubbles: true })) })
  release()
  await expect(page.getByRole('alert').filter({ hasText: 'Os valores mudaram' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar XP e ouro', exact: true })).toHaveCount(0)
  await page.unroute('**/game-rules/rewards/preview')
  await page.getByRole('button', { name: 'Conferir recompensas', exact: true }).click()
  const current = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect((await page.request.put(`/api/characters/${character.id}`, { headers, data: { version: current.version, notes: 'Parallel edit' } })).status()).toBe(200)
  await page.getByRole('button', { name: 'Confirmar XP e ouro', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: /ficha mudou/i }).first()).toBeVisible()
  expect((await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character.xp).toBe(0)
})

test('players see master-managed rewards without grant or adjustment controls', async ({ page }) => {
  await fixture(page, 'PLAYER')
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  await expect(page.getByText('O mestre registra o XP e o ouro da sessão.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conferir recompensas', exact: true })).toHaveCount(0)
  await expect(page.getByText('Ajuste excepcional de XP (mestre)', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Calcular XP pelo livro (avançado)', { exact: true })).toHaveCount(0)
})

test('sheet and exported HTML run under production CSP without inline scripts or file links', async ({ page }) => {
  const policy = vercel.headers.flatMap((rule: any) => rule.headers).find((header: any) => header.key === 'Content-Security-Policy')!.value
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript(() => {
    (window as any).violations = []
    document.addEventListener('securitypolicyviolation', event => (window as any).violations.push(event.effectiveDirective + ':' + event.blockedURI))
  })
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue()
    const response = await route.fetch()
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } })
  })
  const { character } = await fixture(page)
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  await page.getByLabel(`XP para ${character.characterName}`, { exact: true }).fill('100')
  await page.getByRole('button', { name: 'Conferir recompensas', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await openSheetExport(page); await page.getByRole('button', { name: 'Ficha para impressão/PDF', exact: true }).click()
  const html = await readFile((await (await downloaded).path())!, 'utf8')
  expect(html).toContain('Ctrl+P'); expect(html).not.toMatch(/<script\b|\sonclick=|file:\/\//i)
  expect(await page.evaluate(() => (window as any).violations)).toEqual([])
  expect(errors).toEqual([])
  // Load the portable export as a document with the same CSP, rather than
  // injecting it with setContent (which cannot test inherited response policy).
  await page.route('**/portable-sheet', route => route.fulfill({ contentType: 'text/html', headers: { 'Content-Security-Policy': policy }, body: characterPrintHtml(character) }))
  await page.goto('/portable-sheet')
  await expect(page.getByRole('heading', { name: `${character.characterName} — ACKS II`, exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as any).violations)).toEqual([])
  expect(errors).toEqual([])
})
