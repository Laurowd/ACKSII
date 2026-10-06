import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
const accounts: Record<string, any> = {}

test('player proficiency edits use validated choices while test targets stay editable', async ({ page }) => {
  const { character, headers } = await openMage(page, 'PLAYER')
  const base = `/api/characters/${character.id}`
  expect((await page.request.put(base, { headers, data: { version: character.version, classKey: 'catalog:venturer', int: 10 } })).status()).toBe(200)
  await page.reload()
  await expect(page.getByRole('button', { name: /Adicionar proficiência:/ })).toHaveCount(0)
  await expect(page.getByLabel('Nome da proficiência Climbing', { exact: true })).toHaveAttribute('readonly', '')
  await page.getByRole('button', { name: 'Escolher proficiências com validação' }).click()
  await page.getByLabel('Nome da escolha de proficiência', { exact: true }).fill('Seduction')
  await page.getByRole('button', { name: 'Adicionar escolha', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Seduction' })).toBeVisible()
  await page.getByLabel('Categoria da escolha de proficiência').selectOption('general')
  await page.getByRole('button', { name: 'Adicionar escolha', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Proficiência' })).toBeVisible()
  await page.getByRole('button', { name: 'Geral & Combate', exact: true }).click()
  await expect(page.getByLabel('Nome da proficiência Seduction', { exact: true })).toHaveAttribute('readonly', '')
  await page.getByLabel('Alvo da proficiência Seduction', { exact: true }).fill('8')
  await page.getByLabel('Alvo da proficiência Seduction', { exact: true }).blur()
  await expect.poll(async () => (await (await page.request.get(base, { headers })).json()).character.proficiencies.find((p: any) => p.name === 'Seduction')?.throwTarget).toBe(8)
})

async function openMage(page: Page, role = 'MASTER') {
  const suffix = `ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  if (!accounts[role]) {
    const registration = await page.request.post('/api/auth/register', {
      data: { username: suffix, email: `${suffix}@test.invalid`, password: 'browser-test-password', role },
    })
    expect(registration.status()).toBe(201)
    accounts[role] = await registration.json()
  }
  const { token, user } = accounts[role]
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
  await page.getByText('Aprendizado e pesquisa de magia', { exact: true }).click()
  await page.getByText('Valor da biblioteca', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  const help = page.getByRole('button', { name: 'Ajuda: Valor da biblioteca', exact: true })
  await help.hover()
  await expect(page.getByRole('tooltip')).toContainText('biblioteca arcana')
  await page.getByRole('tooltip').hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.evaluate(() => window.scrollBy(0, 100))
  await expect(page.getByRole('tooltip')).toHaveCount(0)
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
  await page.getByLabel('Manutenção (GP)', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ajuda: Manutenção', exact: true }).hover()
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
  await page.getByText('Exceções de magia (mestre)', {exact:true}).click()
  const spell = page.getByRole('combobox', { name: 'Magia de nível 1', exact: true })
  await expect(spell).not.toHaveAttribute('title')
  await spell.fill('Arcane Armor')
  const saved = page.waitForResponse(r => r.url().includes('/spells/') && r.request().method() === 'PUT')
  await spell.press('Tab')
  expect((await saved).status()).toBe(200)
  await page.reload()
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByText('Exceções de magia (mestre)', {exact:true}).click()
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

test('players consult descriptions in the main spell list without opening an editor', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const { character, headers } = await openMage(page, 'PLAYER')
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  const list = page.getByRole('region', { name: 'Magias do personagem', exact: true })
  await expect(list.getByRole('region', { name: 'Magias de nível 1' })).toBeVisible()
  await expect(list.getByText('Slumber', { exact: true })).toHaveCount(1)
  await expect(page.getByText('Exceções de magia (mestre)', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Valor da biblioteca', { exact: true })).toBeHidden()
  await list.getByText('Slumber', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  const help = list.getByRole('button', { name: 'Ajuda: Slumber', exact: true })
  await help.hover()
  await expect(page.getByRole('tooltip')).toContainText('This spell')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await help.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.keyboard.press('Escape')
  await list.getByRole('button', { name: 'Conjurar Slumber', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  const persisted = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(persisted.version).toBe(character.version)
  expect(persisted.spells).toHaveLength(1)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('magic-player-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath('magic-player-mobile.png'), fullPage: true })
  await page.getByText('Aprendizado e pesquisa de magia', { exact: true }).click()
  await expect(page.getByText('Defina custo e tempo de pesquisa para validação automática.', { exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('description loading failure offers retry while spells and casting remain available', async ({ page }) => {
  await openMage(page)
  await page.route('**/api/compendium/search?*', route => new URL(route.request().url()).searchParams.get('type') === 'spell'
    ? route.fulfill({ status: 503, json: { error: 'Descrições temporariamente indisponíveis.' } }) : route.continue())
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  const list = page.getByRole('region', { name: 'Magias do personagem', exact: true })
  await expect(list.getByRole('alert')).toContainText('Descrições temporariamente indisponíveis.')
  await expect(list.getByRole('button', { name: 'Conjurar Slumber', exact: true })).toBeEnabled()
  await list.getByRole('button', { name: 'Ajuda: Slumber', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('consulta às descrições está indisponível')
  await page.keyboard.press('Escape')
  await page.unroute('**/api/compendium/search?*')
  await list.getByRole('button', { name: 'Tentar carregar descrições novamente' }).click()
  await expect(list.getByRole('alert')).toHaveCount(0)
  await list.getByRole('button', { name: 'Ajuda: Slumber', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('This spell')
})

test('invalid divine entries are explained and cannot block casting a valid spell', async ({ page }) => {
  const { character, headers } = await openMage(page)
  expect((await page.request.put(`/api/characters/${character.id}`, { headers, data: { version: character.version, classKey: 'catalog:priestess', level: 8 } })).status()).toBe(200)
  const stored = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect((await page.request.post(`/api/game-rules/characters/${character.id}/magic/repertoire`, { headers, data: { version: stored.version, orderApproved: true, spells: [{ name: 'Discern Gist', level: 1, tradition: 'divine' }] } })).status()).toBe(200)
  const current = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect((await page.request.post(`/api/characters/${character.id}/spells`, { headers, data: { version: current.version, name: 'Magia', level: 1, tradition: 'divine' } })).status()).toBe(201)
  await page.reload()
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  const list = page.getByRole('region', { name: 'Magias do personagem', exact: true })
  await expect(list.getByRole('button', { name: 'Conjurar Magia', exact: true })).toBeDisabled()
  await expect(list.getByText(/Conjuração automática indisponível/)).toBeVisible()
  await expect(list.getByRole('button', { name: 'Conjurar Discern Gist', exact: true })).toBeEnabled()
  const cast = page.waitForResponse(r => r.url().endsWith('/magic/cast') && r.request().method() === 'POST')
  await list.getByRole('button', { name: 'Conjurar Discern Gist', exact: true }).click()
  expect((await cast).status()).toBe(200)
  await expect(page.getByRole('status').filter({ hasText: 'Uso de magia registrado.' })).toBeVisible()
  const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(JSON.parse(saved.rulesState).used['divine:1']).toBe(1)
  expect(saved.spells.some((spell: any) => spell.name === 'Magia')).toBe(true)
})

test('adding a manual spell creates nothing until a name is confirmed and cancellation creates no placeholder', async ({ page }) => {
  const { character, headers } = await openMage(page)
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByText('Exceções de magia (mestre)', { exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar magia de nível 1', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirmar magia', exact: true })).toBeDisabled()
  const count = async () => (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character.spells.length
  expect(await count()).toBe(1)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(await count()).toBe(1)
  await page.getByRole('button', { name: 'Adicionar magia de nível 1', exact: true }).click()
  await page.getByLabel('Nome da nova magia de nível 1', { exact: true }).fill('Arcane Armor')
  await page.getByLabel('Tradição da nova magia de nível 1', { exact: true }).selectOption('arcane')
  const added = page.waitForResponse(r => r.url().endsWith('/spells') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Confirmar magia', exact: true }).click()
  expect((await added).status()).toBe(201)
  await page.reload()
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Magias do personagem', exact: true }).getByText('Arcane Armor', { exact: true })).toBeVisible()
  const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(saved.spells).toHaveLength(2)
  expect(saved.spells.find((spell: any) => spell.name === 'Arcane Armor').tradition).toBe('arcane')
})

test('login and magic run under production CSP without inline scripts or local file links', async ({ page }) => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
  const policy = config.headers.flatMap((rule: any) => rule.headers).find((header: any) => header.key === 'Content-Security-Policy').value
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
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Entrar', exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as any).violations)).toEqual([])
  await openMage(page)
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByRole('button', { name: 'Ajuda: Slumber', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('This spell')
  await page.keyboard.press('Escape')
  const cast = page.waitForResponse(r => r.url().endsWith('/magic/cast') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Conjurar Slumber', exact: true }).click()
  expect((await cast).status()).toBe(200)
  await expect(page.getByRole('status').filter({ hasText: 'Uso de magia registrado.' })).toBeVisible()
  expect(await page.locator('script:not([src]), [href^="file:"], [src^="file:"]').count()).toBe(0)
  expect(await page.evaluate(() => (window as any).violations)).toEqual([])
  expect(errors).toEqual([])
})

test('legacy spells remain readable without automatic casting and unknown descriptions have an explanation', async ({ page }) => {
  const { character, headers } = await openMage(page)
  expect((await page.request.post(`/api/characters/${character.id}/spells`, { headers, data: { version: character.version, name: 'Magia da campanha', level: 3, tradition: 'arcane' } })).status()).toBe(201)
  await page.route(`**/api/game-rules/characters/${character.id}`, route => route.fulfill({ json: { supported: false, reason: 'Magia desta classe usa controle manual.' } }))
  await page.reload()
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  const list = page.getByRole('region', { name: 'Magias do personagem', exact: true })
  await expect(list.getByText('Slumber', { exact: true })).toBeVisible()
  await expect(list.getByRole('region', { name: 'Magias de nível 3' })).toBeVisible()
  await expect(list.getByRole('button', { name: /^Conjurar / })).toHaveCount(0)
  await list.getByRole('button', { name: 'Ajuda: Magia da campanha', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('Descrição não cadastrada no catálogo')
  await page.keyboard.press('Escape')
  await list.getByRole('button', { name: 'Ajuda: Slumber', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('This spell')
})

test.describe('touch help', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test('help toggles on tap, stays within the viewport and dismisses outside', async ({ page }, testInfo) => {
    await openMage(page)
    await page.getByRole('button', { name: 'Magia', exact: true }).tap()
    await page.getByText('Aprendizado e pesquisa de magia', { exact: true }).tap()
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
    const spellHelp = page.getByRole('button', { name: 'Ajuda: Slumber', exact: true })
    await spellHelp.tap()
    await expect(tip).toContainText('This spell')
    const spellBounds = await tip.boundingBox()
    expect(spellBounds!.x + spellBounds!.width).toBeLessThanOrEqual(390)
    await spellHelp.tap()
    await expect(tip).toHaveCount(0)
  })
})
