import { test, expect, type Page } from '@playwright/test'
import { editSheetSection } from './helpers/ruleFixtures'
let account: any
async function fixture(page: Page, mage = false) {
  if (!account) {
    const name = `ux_${Date.now().toString(36)}`
    const data = { username: name, email: `${name}@test.invalid`, password: 'local-browser-password', role: 'MASTER' }
    let response = await page.request.post('/api/auth/register', { data })
    if (response.status() === 429) {
      const delay = Number(response.headers()['retry-after']); expect(delay).toBeGreaterThanOrEqual(1); expect(delay).toBeLessThanOrEqual(60)
      test.setTimeout(120_000); await new Promise(resolve => setTimeout(resolve, delay * 1000 + 250)); response = await page.request.post('/api/auth/register', { data })
    }
    expect(response.status(), await response.text()).toBe(201); account = await response.json()
  }
  const headers = { authorization: `Bearer ${account.token}` }
  const response = await page.request.post('/api/characters/guided', { headers, data: { characterName: `Personagem ${Date.now()}`, classKey: mage ? 'catalog:mage' : 'catalog:fighter', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 4, ...(mage ? { spells: [{ name: 'Slumber', level: 1, tradition: 'arcane' }] } : {}) } })
  expect(response.status(), await response.text()).toBe(201)
  const hero = (await response.json()).character
  await page.goto('/login'); await page.evaluate(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, account)
  await page.goto(`/character/${hero.id}`)
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled()
  return { hero, headers }
}
test('last tab survives reload, stays scoped to the character and supports keyboard navigation', async ({ page }) => {
  await fixture(page, true)
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.reload()
  const magic = page.getByRole('button', { name: 'Magia', exact: true })
  await expect(magic).toHaveAttribute('aria-pressed', 'true')
  await magic.focus(); await magic.press('Control+Home')
  await expect(magic).toHaveAttribute('aria-pressed', 'true')
  await magic.focus(); await magic.press('ArrowLeft')
  await expect(page.getByRole('button', { name: 'Inventário & Tesouro', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.getByRole('button', { name: 'Sessão', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await fixture(page)
  await expect(page.getByRole('button', { name: 'Geral & Combate', exact: true })).toHaveAttribute('aria-pressed', 'true')
})
test('sections start in consultation and edits still save when returning to consultation', async ({ page }, info) => {
  const { hero, headers } = await fixture(page)
  await expect(page.getByLabel('Nome do personagem', { exact: true })).toHaveCount(0)
  await editSheetSection(page, 'Identidade do personagem')
  await page.getByLabel('Nome do personagem', { exact: true }).fill('Nome revisado')
  await page.getByRole('button', { name: 'Voltar à consulta Identidade do personagem', exact: true }).click()
  await expect(page.getByLabel('Nome do personagem', { exact: true })).toHaveCount(0)
  await expect.poll(async () => (await (await page.request.get(`/api/characters/${hero.id}`, { headers })).json()).character.characterName).toBe('Nome revisado')
  await editSheetSection(page, 'Atributos')
  await page.getByLabel('DEX', { exact: true }).fill('16')
  await page.getByRole('button', { name: 'Voltar à consulta Atributos', exact: true }).click()
  await expect.poll(async () => (await (await page.request.get(`/api/characters/${hero.id}`, { headers })).json()).character.dex).toBe(16)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: info.outputPath('sheet-consultation-desktop.png'), fullPage: true })
})
test('long spell descriptions work on mobile and restore focus without spending a use', async ({ page }, info) => {
  const description = 'A descrição completa explica o efeito desta magia. '.repeat(35)
  await page.route('**/api/compendium/search?*', route => new URL(route.request().url()).searchParams.get('type') === 'spell' ? route.fulfill({ json: { entries: [{ name: 'Slumber', level: 1, range: '60 pés', duration: '1 turno', notes: description }] } }) : route.continue())
  const { hero, headers } = await fixture(page, true)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  const open = page.getByRole('button', { name: 'Ler descrição de Slumber', exact: true })
  await open.click()
  const dialog = page.getByRole('dialog', { name: 'Slumber', exact: true })
  await expect(dialog).toBeVisible(); await expect(dialog).toContainText(description.trim())
  await expect(dialog).toContainText('60 pés'); await expect(dialog).toContainText('1 turno')
  await expect(dialog.getByRole('button', { name: 'Fechar descrição da magia' })).toBeFocused()
  await page.screenshot({ path: info.outputPath('spell-description-mobile.png') })
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(open).toBeFocused()
  const current = (await (await page.request.get(`/api/characters/${hero.id}`, { headers })).json()).character
  expect(current.version).toBe(hero.version)
})
test('mobile shortcuts reach health controls and navigation remains visible when scrolling', async ({ page }, info) => {
  await fixture(page)
  await page.setViewportSize({ width: 320, height: 812 })
  await page.getByRole('button', { name: 'Dano / cura', exact: true }).click()
  await expect(page.getByLabel('Quantidade de PV', { exact: true })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Salvar ficha', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Geral & Combate', exact: true }).click()
  await page.evaluate(() => window.scrollBy(0, 800))
  const nav = await page.locator('.sheet-navigation').boundingBox()
  expect(nav?.y).toBeGreaterThanOrEqual(-1); expect(nav?.y).toBeLessThanOrEqual(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: info.outputPath('sheet-mobile-navigation.png') })
})
test('creation shows completed steps, choice counts and the health error next to its field', async ({ page }, info) => {
  await fixture(page)
  await page.goto('/characters/new')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Classe', { exact: true }).selectOption('catalog:fighter')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByText('Etapa 3 de 5 · Identidade', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar etapa 1: Atributos' })).toBeVisible()
  await page.getByLabel('Nome', { exact: true }).fill('Novo aventureiro')
  await page.getByLabel('PV iniciais', { exact: true }).fill('99'); await page.getByLabel('PV iniciais', { exact: true }).blur()
  await expect(page.getByLabel('PV iniciais', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#creation-hp-error')).toContainText('entre 4 e 8')
  await page.getByRole('button', { name: '+ Proficiência', exact: true }).click()
  await page.getByLabel('Nome da proficiência', { exact: true }).fill('Caving')
  await expect(page.getByText('Geral: 1 de 1 escolha', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('guided-creation-progress.png'), fullPage: true })
})
