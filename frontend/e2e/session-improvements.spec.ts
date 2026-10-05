import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const accounts: Record<string, any> = {}
async function fixture(page: Page, kind = 'mage', campaignId?: string) {
  if (!accounts.master) {
    const name = `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const data = { username: name, email: `${name}@test.invalid`, password: 'browser-test-password', role: 'MASTER' }
    let response = await page.request.post('/api/auth/register', { data })
    if (response.status() === 429) {
      // The full suite shares one IP. Respect the real limiter's retry window;
      // do not disable or raise production limits to create fixture accounts.
      const retryAfter = Number(response.headers()['retry-after'])
      expect(retryAfter).toBeGreaterThanOrEqual(1)
      expect(retryAfter).toBeLessThanOrEqual(60)
      test.setTimeout(90_000)
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 + 250))
      response = await page.request.post('/api/auth/register', { data })
    }
    expect(response.status(), await response.text()).toBe(201); accounts.master = await response.json()
  }
  const account = accounts.master, headers = { authorization: `Bearer ${account.token}` }
  const response = await page.request.post('/api/characters/guided', { headers, data: { characterName: `Session ${Date.now()}`, classKey: `catalog:${kind}`, str: 10, int: 16, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 4, ...(campaignId && { campaignId }) } })
  expect(response.status(), await response.text()).toBe(201); const character = (await response.json()).character
  await page.goto('/login'); await page.evaluate(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, account)
  await page.goto(`/character/${character.id}`); await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled()
  return { character, headers }
}
test('a formula enters the grimoire before a week of study puts it into the repertoire', async ({ page }, testInfo) => {
  const { character, headers } = await fixture(page)
  const meta = await (await page.request.get('/api/game-rules/metadata', { headers })).json(), spell = meta.spells.find((s: any) => s.level === 1 && s.tradition === 'arcane')
  const key = `${spell.tradition}:${spell.level}:${spell.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  await page.getByRole('button', { name: 'Magia', exact: true }).click()
  await page.getByText('Aprender ou substituir uma magia por estudo', { exact: true }).click()
  await page.getByText('Registrar fórmula adquirida', { exact: true }).click()
  await page.getByLabel('Fórmula encontrada', { exact: true }).selectOption(key)
  await page.getByLabel('Origem da fórmula', { exact: true }).fill('Grimório das ruínas')
  await page.getByLabel('A fórmula já foi adquirida, é legível e está disponível para estudo.', { exact: true }).check()
  await page.getByRole('button', { name: 'Adicionar fórmula ao grimório', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Fórmula registrada' })).toBeVisible()
  let saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(saved.spells).toHaveLength(0); expect(JSON.parse(saved.spellbook)).toContain(spell.name)
  await page.getByLabel('Fórmula disponível no grimório', { exact: true }).selectOption(key)
  await page.getByLabel('Dia de jogo do início', { exact: true }).fill('10')
  await page.getByLabel('A fórmula está legível e disponível; vou dedicar uma semana ao estudo.', { exact: true }).check()
  await page.getByRole('button', { name: 'Iniciar semana de estudo', exact: true }).click()
  await expect(page.getByRole('heading', { name: `Estudando ${spell.name}`, exact: true })).toBeVisible()
  await page.reload(); await page.getByRole('button', { name: 'Magia', exact: true }).click(); await page.getByText('Aprender ou substituir uma magia por estudo', { exact: true }).click()
  await page.getByLabel('Dia de jogo da conclusão', { exact: true }).fill('16')
  await page.getByLabel('Completei uma semana de estudo dedicado, com a fórmula disponível e legível.', { exact: true }).check()
  await expect(page.getByRole('button', { name: 'Concluir estudo e atualizar repertório', exact: true })).toBeDisabled()
  await page.getByLabel('Dia de jogo da conclusão', { exact: true }).fill('17')
  await page.getByRole('button', { name: 'Concluir estudo e atualizar repertório', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Estudo concluído' })).toBeVisible()
  saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character
  expect(saved.spells.map((s: any) => s.name)).toContain(spell.name)
  await page.setViewportSize({ width: 320, height: 812 }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath('spell-study-mobile.png'), fullPage: true })
})
test('combat origins persist once and exports match the live total', async ({ page }) => {
  const { character, headers } = await fixture(page, 'fighter')
  await page.getByText('Origens dos bônus de CA e iniciativa', { exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar origem de bônus', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Origens atualizadas.' })).toBeVisible()
  await page.getByLabel('Origem do bônus 1', { exact: true }).fill('Proteção da mesa'); await page.getByLabel('Origem do bônus 1', { exact: true }).press('Tab')
  await expect(page.getByRole('status').filter({ hasText: 'Origens atualizadas.' })).toBeVisible()
  await page.getByLabel('Valor do bônus 1', { exact: true }).fill('3'); await page.getByLabel('Valor do bônus 1', { exact: true }).press('Tab')
  await expect(page.getByRole('status').filter({ hasText: 'Origens atualizadas.' })).toBeVisible()
  await page.getByLabel('Ativo', { exact: true }).check()
  await expect(page.getByRole('heading', { name: 'CA sem escudo: 3', exact: true })).toBeVisible()
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click()
  const data = JSON.parse(await readFile((await (await download).path())!, 'utf8')); expect(data.character.acNoShield).toBe(3)
  await page.reload(); expect((await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character.rulesState).toContain('Proteção da mesa')
  await expect(page.locator('header').filter({ hasText: character.characterName })).toContainText('3 / 4')
})
test('session view heals up to maximum HP and keeps favorite spells after reload', async ({ page }, testInfo) => {
  const { character, headers } = await fixture(page)
  const meta = await (await page.request.get('/api/game-rules/metadata', { headers })).json(), spell = meta.spells.find((s: any) => s.level === 1 && s.tradition === 'arcane')
  expect((await page.request.post(`/api/game-rules/characters/${character.id}/magic/repertoire`, { headers, data: { version: character.version, spells: [spell] } })).status()).toBe(200)
  await page.reload(); await page.getByRole('button', { name: 'Sessão', exact: true }).click()
  await page.getByRole('button', { name: 'Registrar dano', exact: true }).click(); await expect(page.getByText('3 / 4 PV', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled()
  await page.getByLabel('Quantidade de PV', { exact: true }).fill('100'); await page.getByRole('button', { name: 'Registrar cura', exact: true }).click()
  await expect(page.getByText('4 / 4 PV', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: `Favoritar ${spell.name}`, exact: true }).click()
  await page.getByLabel('Apenas favoritas', { exact: true }).check(); await expect(page.getByRole('button', { name: `Remover dos favoritos ${spell.name}`, exact: true })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 812 }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath('compact-session-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Salvar', exact: true }).click(); await page.reload(); await page.getByRole('button', { name: 'Sessão', exact: true }).click()
  await expect(page.getByRole('button', { name: `Remover dos favoritos ${spell.name}`, exact: true })).toBeVisible()
})
test('unconfigured recovery is honest and does not submit a request', async ({ page }) => {
  await page.route('**/api/auth/capabilities', route => route.fulfill({ json: { passwordRecovery: false } }))
  await page.goto('/forgot-password')
  await expect(page.getByRole('status').filter({ hasText: 'temporariamente indisponível' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar link', exact: true })).toBeDisabled()
})
test('external changes are announced without overwriting failed local edits', async ({ page }) => {
  await page.clock.install()
  const { character, headers } = await fixture(page, 'fighter')
  await page.route(`**/api/characters/${character.id}`, route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, json: { error: 'Falha simulada' } }) : route.continue())
  await page.getByRole('button', { name: 'Sessão', exact: true }).click(); await page.getByRole('button', { name: 'Registrar dano', exact: true }).click()
  await page.clock.fastForward(2000); await expect(page.getByText('Falha ao salvar', { exact: true })).toBeVisible()
  const response = await page.request.post('/api/game-rules/rewards/apply', { headers, data: { awardId: `external_${Date.now()}`, reason: 'Session reward', participants: [{ id: character.id, version: character.version, xp: 20, gold: 5 }] } }); expect(response.status()).toBe(200)
  await page.clock.fastForward(31_000)
  await expect(page.getByRole('status').filter({ hasText: 'alteradas em outra sessão' })).toBeVisible()
  await expect(page.getByText('3 / 4 PV', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Atualizar ficha sem alterações pendentes', exact: true })).toBeDisabled()
})
test('campaign history paginates readable group rewards and session refresh can be paused', async ({ page }) => {
  await page.clock.install()
  await fixture(page)
  const headers = { authorization: `Bearer ${accounts.master.token}` }
  const response = await page.request.post('/api/campaigns', { headers, data: { name: `Session history ${Date.now()}` } }); expect(response.status()).toBe(201)
  const campaign = await response.json(), { character } = await fixture(page, 'fighter', campaign.id)
  let version = character.version
  for (let i = 0; i < 26; i++) {
    const grant = await page.request.post('/api/game-rules/rewards/apply', { headers, data: { campaignId: campaign.id, awardId: `history_${character.id}_${i}`, reason: `Sessão ${i + 1}`, participants: [{ id: character.id, version, xp: 0, gold: 1 }] } })
    expect(grant.status()).toBe(200); version++
  }
  await page.goto('/dashboard'); await page.getByRole('combobox', { name: 'Filtrar fichas por campanha', exact: true }).selectOption(campaign.id)
  await page.getByRole('button', { name: 'Histórico da campanha', exact: true }).click()
  await page.getByLabel('Tipo de operação', { exact: true }).selectOption('REWARD_SETTLEMENT')
  await expect(page.getByRole('status').filter({ hasText: 'Página 1 de 2' })).toBeVisible()
  await expect(page.getByText('Motivo: Sessão 26', { exact: true })).toBeVisible()
  await expect(page.getByText('Desconhecido', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Próxima página', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Página 2 de 2' })).toBeVisible()
  await expect(page.getByText('Motivo: Sessão 1', { exact: true })).toBeVisible()
  await page.goto('/dashboard/judge'); await page.getByRole('combobox', { name: 'Campanha', exact: true }).selectOption(campaign.id)
  const row = page.getByRole('row').filter({ hasText: character.characterName })
  await expect(row).toContainText(/4\s*\/\s*4/)
  expect((await page.request.put(`/api/characters/${character.id}`, { headers, data: { version, hpCurr: 2 } })).status()).toBe(200)
  await page.clock.fastForward(31_000); await expect(row).toContainText(/2\s*\/\s*4/)
  await page.getByLabel('Atualizar automaticamente', { exact: true }).uncheck()
  expect((await page.request.put(`/api/characters/${character.id}`, { headers, data: { version: version + 1, hpCurr: 1 } })).status()).toBe(200)
  await page.clock.fastForward(31_000); await expect(row).toContainText(/2\s*\/\s*4/)
})
test('inventory search does not change stored items or total carried weight', async ({ page }) => {
  const { character, headers } = await fixture(page, 'fighter')
  let version = character.version
  for (const name of ['Poção de cura', 'Corda']) {
    const response = await page.request.post(`/api/characters/${character.id}/items`, { headers, data: { version, name, weight: 1, quantity: 1, slot: 'backpack' } }); expect(response.status()).toBe(201); version++
  }
  await page.reload(); await page.getByRole('button', { name: 'Inventário & Tesouro', exact: true }).click()
  await page.getByLabel('Buscar no inventário', { exact: true }).fill('pocao')
  await expect(page.getByLabel('Nome do item Poção de cura', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Nome do item Corda', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Inventário.*2.0/ })).toBeVisible()
  const saved = (await (await page.request.get(`/api/characters/${character.id}`, { headers })).json()).character; expect(saved.items).toHaveLength(2)
})
