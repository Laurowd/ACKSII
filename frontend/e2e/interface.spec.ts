import { test, expect, type Page } from '@playwright/test'
let account: any

async function openMage(page: Page) {
  const suffix = `ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  if (!account) {
    const registration = await page.request.post('/api/auth/register', {
      data: { username: suffix, email: `${suffix}@test.invalid`, password: 'browser-test-password', role: 'MASTER' },
    })
    expect(registration.status()).toBe(201)
    account = await registration.json()
  }
  const { token, user } = account
  const headers = { authorization: `Bearer ${token}` }
  const created = await page.request.post('/api/characters/guided', { headers, data: {
    characterName: suffix, classKey: 'catalog:mage', str: 10, int: 16, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 4,
    spells: [{ name: 'Slumber', level: 1, tradition: 'arcane' }],
  } })
  expect(created.status()).toBe(201)
  const { character } = await created.json()
  await page.goto('/login')
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }, { token, user })
  await page.goto(`/character/${character.id}`)
  return { character, headers }
}

test('help opens only at its trigger and works with hover, keyboard and Escape', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openMage(page)
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByText('Valor da biblioteca', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  const help = page.getByRole('button', { name: 'Ajuda: Valor da biblioteca', exact: true })
  await help.hover()
  await expect(page.getByRole('tooltip')).toContainText('biblioteca arcana')
  await page.getByRole('tooltip').hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.getByLabel('Valor da biblioteca', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await page.getByLabel('Valor da biblioteca', { exact: true }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(help).toBeFocused()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await page.getByRole('button', { name: 'Geral & Combate', exact: true }).click()
  await page.getByRole('button', { name: 'Ajuda: Movement', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('velocidades básicas')
  await page.getByRole('button', { name: 'Domínio & Seguidores', exact: true }).click()
  await page.getByLabel('Maintenance Cost (GP)', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ajuda: Maintenance Cost', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('Custos fixos mensais')
  expect(errors).toEqual([])
})

test('spell suggestions show names, persist selection and report save failures', async ({ page }) => {
  const { character, headers } = await openMage(page)
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  const options = page.locator('#acks-spell-compendium-1 option')
  await expect(options.first()).toHaveAttribute('label', /\S/)
  expect(await options.evaluateAll(nodes => nodes.every(node => {
    const option = node as HTMLOptionElement
    return option.label === option.value && !option.textContent?.trim()
  }))).toBe(true)
  expect(await page.locator('datalist option[value="Spell Name"]').count()).toBe(0)
  await page.getByText('Repertório manual e exceções (mestre)', {exact:true}).click()
  const spell = page.getByRole('combobox', { name: 'Magia de nível 1', exact: true })
  await expect(spell).not.toHaveAttribute('title')
  await spell.fill('Arcane Armor')
  const saved = page.waitForResponse(r => r.url().includes('/spells/') && r.request().method() === 'PUT')
  await spell.press('Tab')
  expect((await saved).status()).toBe(200)
  await page.reload()
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByText('Repertório manual e exceções (mestre)', {exact:true}).click()
  await expect(spell).toHaveValue('Arcane Armor')
  await page.getByRole('button', { name: 'Ajuda: Arcane Armor', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('invisible suit of armor')
  const stored = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(stored.spells[0].tradition).toBe('arcane')
  await page.route('**/api/characters/*/spells/*', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Falha simulada ao salvar magia.' }),
  }))
  await spell.fill('Slumber')
  await spell.press('Tab')
  await expect(page.getByRole('alert')).toContainText('Falha simulada ao salvar magia.')
})

test('editing inventory keeps the full shop and suggestions available', async ({ page }) => {
  const { character, headers } = await openMage(page)
  expect((await page.request.put(`/api/characters/${character.id}`, {
    headers, data: { version: character.version, coinGP: 0, coinSP: 100 },
  })).status()).toBe(200)
  await page.reload()
  await expect(page.locator('#acks-weapon-compendium option')).toHaveCount(22)
  await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  await page.getByRole('button', { name: /Loja/ }).click()
  const torch = page.locator('[title="Torches (6)"]').locator('../..')
  await expect(torch.getByRole('button', { name: 'Comprar', exact: true })).toBeEnabled()
  await expect(torch.getByRole('button', { name: 'Comprar', exact: true })).toHaveClass(/bg-gold/)
  await page.getByRole('button', { name: '+ Adicionar', exact: true }).click()
  const item = page.getByPlaceholder('Item', { exact: true }).first()
  await item.fill('Rope')
  await item.press('Tab')
  await expect(torch).toBeVisible()
  const suggestions = page.locator('#acks-item-compendium option')
  expect(await suggestions.evaluateAll(nodes => nodes.length > 0 && nodes.every(node => {
    const option = node as HTMLOptionElement
    return option.label === option.value
  }))).toBe(true)
})

test.describe('touch help', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test('help toggles on tap, stays within the viewport and dismisses outside', async ({ page }, testInfo) => {
    await openMage(page)
    await page.getByRole('button', { name: 'Magia', exact: true }).tap()
    const help = page.getByRole('button', { name: 'Ajuda: Valor da oficina', exact: true })
    await help.tap()
    const tip = page.getByRole('tooltip')
    await expect(tip).toContainText('Estrutura material')
    const bounds = await tip.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
    await page.screenshot({ path: testInfo.outputPath('magic-help-mobile.png') })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await help.tap()
    await expect(tip).toHaveCount(0)
    await help.tap()
    await expect(tip).toBeVisible()
    await page.getByLabel('Valor da oficina', { exact: true }).tap()
    await expect(tip).toHaveCount(0)
  })
})
