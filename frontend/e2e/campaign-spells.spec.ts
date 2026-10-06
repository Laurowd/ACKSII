import { test, expect, type Page } from '@playwright/test'
const accounts: Record<string, any> = {}
async function account(page: Page, role: string) {
  if (!accounts[role]) {
    const name = `brew_${role.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
    const data = { username: name, email: `${name}@test.invalid`, password: 'browser-test-password', role }
    let response = await page.request.post('/api/auth/register', { data })
    if (response.status() === 429) {
      const delay = Number(response.headers()['retry-after']); expect(delay).toBeGreaterThanOrEqual(1); expect(delay).toBeLessThanOrEqual(60)
      test.setTimeout(120_000); await new Promise(resolve => setTimeout(resolve, delay * 1000 + 250)); response = await page.request.post('/api/auth/register', { data })
    }
    expect(response.status(), await response.text()).toBe(201); accounts[role] = await response.json()
  }
  return accounts[role]
}
async function signIn(page: Page, actor: any, path: string) {
  await page.goto('/login'); await page.evaluate(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, actor); await page.goto(path)
}
async function fixture(page: Page) {
  const master = await account(page, 'MASTER'), player = await account(page, 'PLAYER')
  const headers = { authorization: `Bearer ${master.token}` }, playerHeaders = { authorization: `Bearer ${player.token}` }
  const created = await page.request.post('/api/campaigns', { headers, data: { name: `Homebrew ${Date.now()}` } }); expect(created.status()).toBe(201); const campaign = await created.json()
  expect((await page.request.post('/api/campaigns/join', { headers: playerHeaders, data: { joinCode: campaign.joinCode } })).status()).toBe(201)
  expect((await page.request.put(`/api/campaigns/${campaign.id}/invites/${player.user.id}`, { headers, data: { status: 'ACCEPTED' } })).status()).toBe(200)
  const sheets = []
  for (const name of ['Aprendiz revelado', 'Aprendiz sem revelação']) {
    const response = await page.request.post('/api/characters/guided', { headers: playerHeaders, data: { campaignId: campaign.id, characterName: name, classKey: 'catalog:mage', str: 10, int: 16, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 4 } })
    expect(response.status(), await response.text()).toBe(201); sheets.push((await response.json()).character)
  }
  return { master, player, campaign, sheets, headers, playerHeaders }
}
const select = async (page: Page, label: string, name: string) => {
  await page.getByLabel(label, { exact: true }).fill(name)
  await page.getByRole('listbox', { name: `Opções de ${label}`, exact: true }).getByText(name, { exact: true }).click()
}
test('master secrets are revealed to one sheet and become readable, searchable and castable only there', async ({ page }, info) => {
  const f = await fixture(page), name = `Chama oculta ${Date.now()}`
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await signIn(page, f.master, `/campaigns/${f.campaign.id}/manage`)
  await page.getByRole('button', { name: 'Nova magia de campanha', exact: true }).click()
  await expect(page.getByLabel('Visibilidade', { exact: true })).toHaveValue('SECRET')
  await page.getByLabel('Nome da magia de campanha', { exact: true }).fill(name)
  await page.getByLabel('Descrição e efeitos').fill('Uma chama azul revela inscrições invisíveis sem causar dano.')
  await page.getByLabel('Alcance', { exact: true }).fill('60 pés'); await page.getByLabel('Duração', { exact: true }).fill('1 turno')
  await page.getByRole('button', { name: 'Salvar magia de campanha', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Magia salva como secreta' })).toBeVisible()
  const hidden = await page.request.get(`/api/campaigns/${f.campaign.id}/spell-options?characterId=${f.sheets[0].id}`, { headers: f.playerHeaders })
  expect((await hidden.json()).spells).toEqual([])
  await page.getByRole('button', { name: `Editar ${name}`, exact: true }).click()
  await page.getByLabel('Visibilidade', { exact: true }).selectOption('CHARACTERS')
  await page.getByRole('checkbox', { name: /^Aprendiz revelado/ }).check()
  await page.getByRole('button', { name: 'Salvar magia de campanha', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Magia disponibilizada' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('campaign-spells-master.png'), fullPage: true })
  await page.goto(`/character/${f.sheets[0].id}`)
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByText('Exceções de magia (mestre)', { exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar magia de nível 1', exact: true }).click()
  await page.getByRole('button', { name: 'Mostrar opções de Nome da nova magia de nível 1', exact: true }).click()
  const manualOptions = page.getByRole('listbox', { name: 'Opções de Nome da nova magia de nível 1', exact: true })
  await expect(manualOptions.getByText(name, { exact: true })).toBeAttached()
  await page.getByLabel('Nome da nova magia de nível 1', { exact: true }).fill('chama oculta')
  await expect(manualOptions.getByRole('option')).toHaveCount(1)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await signIn(page, f.player, `/character/${f.sheets[0].id}`)
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByText('Editar repertório com validação', { exact: true }).click()
  await page.getByRole('button', { name: '+ Adicionar magia', exact: true }).click()
  await select(page, 'Nome da magia 1', name)
  await page.getByRole('button', { name: 'Salvar repertório', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Repertório registrado' })).toBeVisible()
  const list = page.getByRole('region', { name: 'Magias do personagem', exact: true })
  await expect(list.getByText('Arcana · Magia de campanha', { exact: true })).toBeVisible()
  await list.getByRole('button', { name: `Ajuda: ${name}`, exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('Uma chama azul'); await expect(page.getByRole('tooltip')).toContainText('Alcance: 60 pés'); await expect(page.getByRole('tooltip')).toContainText('Duração: 1 turno')
  await page.keyboard.press('Escape')
  await list.getByRole('button', { name: `Conjurar ${name}`, exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Uso de magia registrado' })).toBeVisible()
  await expect(list.getByRole('button', { name: `Conjurar ${name}`, exact: true })).toBeDisabled()
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: info.outputPath('campaign-spell-player-mobile.png'), fullPage: true })
  await page.goto(`/character/${f.sheets[1].id}`); await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByText('Editar repertório com validação', { exact: true }).click(); await page.getByRole('button', { name: '+ Adicionar magia', exact: true }).click()
  await page.getByLabel('Nome da magia 1', { exact: true }).fill(name)
  await expect(page.getByRole('listbox')).toContainText('Nenhuma opção encontrada')
  expect((await (await page.request.get(`/api/game-rules/characters/${f.sheets[1].id}`, { headers: f.playerHeaders })).json()).campaignSpells).toEqual([])
  expect(errors).toEqual([])
})
test('campaign spells and proficiencies can be browsed or searched with the keyboard during creation', async ({ page }, info) => {
  const f = await fixture(page), name = `Luz pública ${Date.now()}`
  expect((await page.request.post(`/api/campaigns/${f.campaign.id}/spells`, { headers: f.headers, data: { name, description: 'Luz prateada durante um turno.', level: 1, tradition: 'arcane', visibility: 'CAMPAIGN' } })).status()).toBe(200)
  await page.setViewportSize({ width: 320, height: 812 })
  await signIn(page, f.player, `/characters/new?campaignId=${f.campaign.id}&classKey=catalog:mage`)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await expect(page.getByRole('combobox', { name: 'Classe', exact: true })).toHaveValue('catalog:mage')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.getByLabel('Nome', { exact: true }).fill('Aprendiz novo')
  await page.getByRole('button', { name: '+ Proficiência', exact: true }).click(); await page.getByLabel('Categoria', { exact: true }).last().selectOption('class')
  await select(page, 'Nome da proficiência', 'Alchemy')
  await page.getByRole('button', { name: '+ Proficiência', exact: true }).click()
  const proficiency = page.getByLabel('Nome da proficiência', { exact: true }).last()
  await proficiency.fill('cav'); await proficiency.press('ArrowDown'); await proficiency.press('Enter'); await expect(proficiency).toHaveValue('Caving')
  await page.getByRole('button', { name: '+ Magia inicial', exact: true }).click()
  await page.getByRole('button', { name: 'Mostrar opções de Nome da magia inicial 1', exact: true }).click()
  const options = page.getByRole('listbox', { name: 'Opções de Nome da magia inicial 1', exact: true })
  await options.getByText(name, { exact: true }).scrollIntoViewIfNeeded()
  await expect(options.getByText(name, { exact: true })).toBeVisible()
  await page.getByLabel('Nome da magia inicial 1', { exact: true }).fill('luz publica')
  await expect(options.getByRole('option')).toHaveCount(1)
  await page.getByLabel('Nome da magia inicial 1', { exact: true }).press('Enter'); await expect(page.getByLabel('Nome da magia inicial 1', { exact: true })).toHaveValue(name)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: info.outputPath('creation-searchable-choices.png'), fullPage: true })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Equipamento inicial' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const created = page.waitForResponse(r => r.url().endsWith('/characters/guided') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Confirmar e abrir ficha', exact: true }).click(); expect((await created).status()).toBe(201)
})
test('proficiency searches keep class and general lists separate in the existing sheet', async ({ page }) => {
  const f = await fixture(page)
  await signIn(page, f.player, `/character/${f.sheets[0].id}`)
  await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  const choice = page.getByLabel('Nome da escolha de proficiência', { exact: true })
  await expect(choice).toBeEnabled()
  await page.getByRole('button', { name: 'Mostrar opções de Nome da escolha de proficiência', exact: true }).click()
  const options = page.getByRole('listbox', { name: 'Opções de Nome da escolha de proficiência', exact: true })
  await expect(options.getByText('Alchemy', { exact: true })).toBeVisible()
  await expect(options.getByText('Seduction', { exact: true })).toHaveCount(0)
  await choice.fill('Seduction')
  await expect(page.getByRole('listbox')).toContainText('Nenhuma opção encontrada')
  await page.getByLabel('Categoria da escolha de proficiência').selectOption('general')
  await choice.fill('sed'); await expect(page.getByRole('listbox').getByText('Seduction', { exact: true })).toBeVisible()
  await choice.press('Enter'); await expect(choice).toHaveValue('Seduction')
  await page.getByRole('button', { name: 'Adicionar escolha', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Proficiência adicionada' })).toBeVisible()
  const stored = (await (await page.request.get(`/api/characters/${f.sheets[0].id}`, { headers: f.playerHeaders })).json()).character
  expect(stored.proficiencies.some((row: any) => row.name === 'Seduction' && row.category === 'general')).toBe(true)
})
