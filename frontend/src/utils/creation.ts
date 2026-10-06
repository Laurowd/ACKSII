import type { CatalogClass } from './catalog'

export function absorbAutomaticProficiencies(choices: { name: string; category: string }[], grants: { name: string }[]) {
  const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const remaining = new Set(grants.map(grant => key(grant.name)))
  return choices.filter(choice => {
    if (key(choice.name) === 'adventuring') return false
    if (remaining.has(key(choice.name))) { remaining.delete(key(choice.name)); return false }
    return true
  })
}

export function creationSettings(klass?: CatalogClass) {
  if (!klass) return {}
  if (klass.source === 'catalog') return klass
  try {
    const settings = JSON.parse(klass.creationRules || '{}')
    return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {}
  } catch { return {} }
}

export function purchaseSummary(gold: number, purchases: { entryId: string; quantity: number }[], equipment: { id: string; name: string; costGp?: number }[]) {
  let spentCopper = 0
  let valid = true
  const lines = purchases.map(purchase => {
    const entry = equipment.find(item => item.id === purchase.entryId)
    const price = entry?.costGp
    if (!entry || price == null || !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(purchase.quantity) || purchase.quantity < 1 || purchase.quantity > 100) valid = false
    const costCopper = price == null ? 0 : Math.round(price * 100) * purchase.quantity
    spentCopper += costCopper
    return { name: entry?.name || 'Equipamento não selecionado', quantity: purchase.quantity, costGp: costCopper / 100 }
  })
  const remainingCopper = Math.round(gold * 100) - spentCopper
  return { valid, lines, spentGp: spentCopper / 100, remainingGp: remainingCopper / 100,
    coins: { gp: Math.floor(remainingCopper / 100), sp: Math.floor(remainingCopper % 100 / 10), cp: remainingCopper % 10 } }
}
