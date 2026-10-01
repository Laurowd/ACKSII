// Revised Rulebook pp. 126, 128–130. Values are per listed unit/bundle.
export const WEAPONS = [
  ['sword', 'Sword', '1d6', '1d8', 1/6, 10, 0, 0, 0],
  ['short-sword', 'Short Sword', '1d6', '', 1/6, 7, 0, 0, 0],
  ['longbow', 'Longbow', '1d6', '', 1, 7, 120, 240, 360],
  ['spear', 'Spear', '1d6', '1d8', 1, 3, 30, 60, 120],
  ['dagger', 'Dagger', '1d4', '', 1/6, 3, 15, 30, 45],
  ['mace', 'Mace', '1d6', '1d8', 1/6, 5, 0, 0, 0],
  ['battle-axe', 'Battle Axe', '1d6', '1d8', 1/6, 7, 0, 0, 0],
  ['staff', 'Staff', '1d4', '1d6', 1, 1, 0, 0, 0],
  ['great-axe', 'Great Axe', '1d10', '', 1, 10, 0, 0, 0],
  ['two-handed-sword', 'Two-Handed Sword', '1d10', '', 1, 15, 0, 0, 0],
  ['crossbow', 'Crossbow', '1d6', '', 1/6, 30, 140, 280, 420],
  ['shortbow', 'Short Bow', '1d6', '', 1/6, 3, 75, 150, 300],
  ['arbalest', 'Arbalest', '1d8', '', 1, 50, 180, 360, 480],
  ['composite-bow', 'Composite Bow', '1d6', '', 1, 40, 120, 240, 360],
  ['hand-axe', 'Hand Axe', '1d6', '', 1/6, 4, 15, 30, 45],
  ['club', 'Club', '1d4', '', 1/6, 1, 0, 0, 0],
  ['flail', 'Flail', '1d6', '1d8', 1/6, 5, 0, 0, 0],
  ['morning-star', 'Morning Star', '1d10', '', 1, 10, 0, 0, 0],
  ['warhammer', 'Warhammer', '1d6', '', 1/6, 5, 15, 30, 45],
  ['javelin', 'Javelin', '1d6', '', 1/6, 1, 30, 60, 120],
  ['polearm', 'Polearm', '1d10', '', 1, 7, 0, 0, 0],
  ['sling', 'Sling', '1d4', '', 1/6, 2, 60, 120, 240],
].map(([id, name, damage, damageTwoHanded, encumbrance, costGp, rangeShort, rangeMed, rangeLong]) => ({
  id: `w-${id}`, type: 'weapon' as const, name: String(name), damage: String(damage),
  damageTwoHanded: String(damageTwoHanded), encumbrance: Number(encumbrance), costGp: Number(costGp),
  rangeShort: Number(rangeShort), rangeMed: Number(rangeMed), rangeLong: Number(rangeLong),
  notes: 'Revised Rulebook p. 126. Dano base, antes de atributos, classe e magia.',
}))

export function weaponCatalogValues(catalogId: string, style: string) {
  const entry = WEAPONS.find(w => w.id === catalogId)
  if (!entry) throw new Error('Arma não encontrada no catálogo.')
  return { damage: style === 'Two-Handed Weapon' && entry.damageTwoHanded ? entry.damageTwoHanded : entry.damage,
    encumbrance: entry.encumbrance, rangeShort: entry.rangeShort, rangeMed: entry.rangeMed, rangeLong: entry.rangeLong }
}
export function defaultWeaponStyle(catalogId:string) {
  if(['w-great-axe','w-two-handed-sword','w-morning-star','w-polearm'].includes(catalogId))return 'Two-Handed Weapon'
  if(['w-longbow','w-shortbow','w-composite-bow','w-crossbow','w-arbalest','w-sling'].includes(catalogId))return 'Missile Weapon'
  return 'Single Weapon'
}

export const ADVENTURING_EQUIPMENT = [
  { id: 'i-backpack', name: 'Backpack', encumbrance: 1/6, costGp: 2, notes: 'Capacidade: 4 stone.' },
  { id: 'i-rations', name: 'Iron Rations (1 week)', encumbrance: 1, costGp: 5, notes: 'Preço adotado: 5 GP; faixa do livro: 1–6 GP.' },
  { id: 'i-torch', name: 'Torches (6)', encumbrance: 1, costGp: 0.1 },
  { id: 'i-lantern', name: 'Lantern', encumbrance: 1, costGp: 10 },
  { id: 'i-rope', name: 'Rope (50 ft)', encumbrance: 1, costGp: 1 },
  { id: 'i-grappling-hook', name: 'Grappling Hook', encumbrance: 1/6, costGp: 25 },
  { id: 'i-waterskin', name: 'Waterskin', encumbrance: 1/6, costGp: 0.6 },
  { id: 'i-healing-kit', name: 'Healing Kit (custom)', encumbrance: 1, costGp: 25, notes: 'Kit personalizado: conteúdo e preço devem ser definidos pelo mestre.' },
].map(item => ({ ...item, type: 'item' as const }))
