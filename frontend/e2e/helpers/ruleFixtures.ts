import { expect, type Page } from '@playwright/test'

export async function openSheetExport(page: Page) {
  const menu = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: /^Exportar ficha$/ }) })
  if (!await menu.evaluate((element: HTMLDetailsElement) => element.open)) await menu.locator('summary').click()
}
export async function editSheetSection(page: Page, title: string) {
  await page.getByRole('heading', { name: title, exact: true }).waitFor()
  const edit = page.getByRole('button', { name: `Editar ${title}`, exact: true })
  if (await edit.isVisible()) await edit.click()
}

/** Explicit master fixture setup, separate from normal XP-gated advancement. */
export async function setTestLevel(page:Page,headers:Record<string,string>,characterUrl:string,level:number,fields:any={}) {
  let hero=(await(await page.request.get(characterUrl,{headers})).json()).character
  if(Object.keys(fields).length) {
    const edited=await page.request.put(characterUrl,{headers,data:{...fields,version:hero.version}})
    expect(edited.status(),await edited.text()).toBe(200)
    hero=(await edited.json()).character
  }
  return page.request.post(`/api/game-rules/characters/${hero.id}/level-adjustment`,{headers,data:{version:hero.version,level,hpMax:hero.hpMax,reason:'Prepare disposable browser fixture'}})
}

export async function approveStudyCorrection(page:Page) {
  const reason=page.getByLabel('Justificativa do ajuste de estudo',{exact:true})
  if(await reason.isVisible())await reason.fill('Correct the recorded repertoire')
}
