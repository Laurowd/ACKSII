import { setTestLevel, openSheetExport } from './helpers/ruleFixtures'
import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

let account: { token: string; user: any }
async function signIn(page: Page) {
  if (!account) {
    const name = `additional_ui_${Date.now().toString(36)}`
    const result = await page.request.post('/api/auth/register', { data: { username: name, email: `${name}@test.invalid`, password: 'local-browser-password', role: 'MASTER' } })
    expect(result.status()).toBe(201); account = await result.json()
  }
  await page.goto('/login')
  await page.evaluate(({ token, user }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)) }, account)
  return { authorization: `Bearer ${account.token}` }
}
async function prof(page: Page, name: string, category: string) {
  await page.getByRole('button', { name: '+ Proficiência', exact: true }).click()
  await page.getByLabel('Nome da proficiência', { exact: true }).last().fill(name)
  await page.getByLabel('Categoria', { exact: true }).last().selectOption(category)
}
for (const name of ['Manual of Arms', 'Siege Engineering']) test(`book creation permits additional ${name} grades`, async ({ page }) => {
  await signIn(page); await page.goto('/characters/new')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('combobox', { name: 'Classe', exact: true }).selectOption('catalog:fighter')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill(`Two grades ${name}`)
  await prof(page, name, 'class'); await prof(page, name, 'general')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Equipamento inicial', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revisar personagem', exact: true })).toBeVisible()
  const response = page.waitForResponse(r => r.url().endsWith('/api/characters/guided') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Confirmar e abrir ficha', exact: true }).click()
  expect((await response).status()).toBe(201); await expect(page).toHaveURL(/\/character\//)
})
const creation = { characterName: 'Additional browser character', rulesMode: 'standard', str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 4 }
async function character(page: Page, classKey: string, additions: any = {}) {
  const headers = await signIn(page)
  const result = await page.request.post('/api/characters/guided', { headers, data: { ...creation, classKey, proficiencies: [{ name: classKey === 'catalog:mage' ? 'Battle Magic' : 'Combat Reflexes', category: 'class' }, { name: 'Caving', category: 'general' }], ...additions } })
  expect(result.status(), await result.text()).toBe(201)
  return { headers, hero: (await result.json()).character }
}
test('session, combat and printing agree on the Fighter damage bonus', async ({ page }) => {
  const { headers, hero } = await character(page, 'catalog:fighter')
  const advanced = await setTestLevel(page,headers,`/api/characters/${hero.id}`, 6, {}); expect(advanced.status()).toBe(200)
  const weapon = await page.request.post(`/api/characters/${hero.id}/weapons`, { headers, data: { version: (await advanced.json()).character.version, name: 'Sword', catalogId: 'w-sword', style: 'Single Weapon', automaticDamage: true } }); expect(weapon.status(), await weapon.text()).toBe(201)
  await page.goto(`/character/${hero.id}`)
  const row = page.locator('tr').filter({ has: page.getByLabel('Nome da arma Sword', { exact: true }) }); await expect(row).toContainText('classe +3')
  await page.getByRole('button', { name: 'Sessão', exact: true }).click()
  const summary = page.locator('#sheet-session article').filter({ hasText: 'Sword' }); await expect(summary).toContainText('Dano 1d6'); await expect(summary).toContainText('classe +3')
  const download = page.waitForEvent('download'); await openSheetExport(page); await page.getByRole('button', { name: 'Ficha para impressão/PDF', exact: true }).click()
  expect(await readFile((await (await download).path())!, 'utf8')).toContain('bônus de dano da classe: 3')
})
test('Paladin Sense Evil tooltip states the revised range and usage', async ({ page }) => {
  const { hero } = await character(page, 'catalog:paladin')
  await page.goto(`/character/${hero.id}`)
  await page.getByRole('button', { name: 'Ajuda: Sense Evil', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('45 pés')
  await expect(page.getByRole('tooltip')).toContainText('uma vez por turno')
})
test('old Craftpriest targets remain editable with the corrected rank reference', async ({ page }) => {
  const { headers, hero } = await character(page, 'catalog:dwarven-craftpriest', { classChoices: { craft: 'Craft (brewing)' }, spells: [{ name: 'Discern Gist', level: 1, tradition: 'divine' }], proficiencies: [{ name: 'Alchemy', category: 'class' }, { name: 'Theology', category: 'general' }] })
  const current = (await (await page.request.get(`/api/characters/${hero.id}`, { headers })).json()).character
  const proficiency = current.proficiencies.find((p: any) => p.name === 'Theology')
  expect(proficiency.throwTarget).toBe(4)
  const edited = await page.request.put(`/api/characters/${hero.id}/proficiencies/${proficiency.id}`, { headers, data: { version: current.version, throwTarget: 8 } }); expect(edited.status()).toBe(200)
  await page.goto(`/character/${hero.id}`)
  const target = page.getByLabel('Alvo da proficiência Theology', { exact: true }); await expect(target).toHaveValue('8')
  await expect(page.getByText('Referência com as graduações gratuitas da classe: 4+.', { exact: false })).toBeVisible()
  const response = page.waitForResponse(r => r.url().endsWith(`/proficiencies/${proficiency.id}`) && r.request().method() === 'PUT')
  await target.fill('4'); await target.press('Tab'); expect((await response).status()).toBe(200)
  await page.reload(); await expect(page.getByLabel('Alvo da proficiência Theology', { exact: true })).toHaveValue('4')
})
test('research UI shows the assistant allowance, blocks invalid levels and previews valid work', async ({ page }) => {
  const { headers, hero } = await character(page, 'catalog:mage', { spells: [{ name: 'Arcane Armor', level: 1, tradition: 'arcane' }] })
  const advanced = await setTestLevel(page,headers,`/api/characters/${hero.id}`, 9, {workshopValue: 8000, coinGP: 10000 }); expect(advanced.status()).toBe(200)
  const created = await page.request.post(`/api/characters/${hero.id}/magic-research`, { headers, data: { version: (await advanced.json()).character.version, itemName: 'Weekly effect', effectType: 'WEEKLY', spellLevel: 3, hasFormula: true } }); expect(created.status(), await created.text()).toBe(201)
  await page.goto(`/character/${hero.id}`); await page.getByRole('button', { name: 'Evolução & Regras', exact: true }).click()
  const panel = page.getByRole('heading', { name: 'Pesquisa acompanhada de itens mágicos', exact: true }).locator('..')
  await panel.getByLabel('Projeto de pesquisa', { exact: true }).selectOption((await created.json()).research.id)
  await expect(panel).toContainText('Assistentes diretos: 0 / 1')
  const add = panel.getByRole('button', { name: '+ Assistente', exact: true }); await add.click(); await expect(add).toBeDisabled()
  await panel.getByPlaceholder('Assistente', { exact: true }).fill('Test assistant')
  const level = panel.getByLabel('Nível', { exact: true }); await level.fill('0')
  await panel.getByLabel('Mestre conferiu elegibilidade, efeito, assistência e condições de trabalho').check()
  await expect(panel.getByRole('alert')).toContainText('entre 1 e 14'); await expect(panel.getByRole('button', { name: 'Conferir início da pesquisa', exact: true })).toBeDisabled()
  await level.fill('14'); await panel.getByRole('button', { name: 'Conferir início da pesquisa', exact: true }).click()
  await expect(panel).toContainText('4 dias a 2350 GP/dia')
})
