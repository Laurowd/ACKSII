export const SHEET_TABS = [
  { id: 'session', label: 'Sessão' },
  { id: 'rules', label: 'Evolução & Regras' },
  { id: 'combat', label: 'Geral & Combate' },
  { id: 'inventory', label: 'Inventário & Tesouro' },
  { id: 'magic', label: 'Magia' },
  { id: 'domain', label: 'Domínio & Seguidores' },
  { id: 'activities', label: 'Atividades e Downtime' },
] as const
export type SheetTab = typeof SHEET_TABS[number]['id']
const key = (userId: string, characterId: string) => `acks:sheet-tab:${userId}:${characterId}`
export function readSheetTab(userId: string, characterId: string): SheetTab {
  if (!userId || !characterId) return 'combat'
  try {
    const saved = localStorage.getItem(key(userId, characterId))
    if (SHEET_TABS.some(tab => tab.id === saved)) return saved as SheetTab
  } catch { /* Navigation remains available without browser storage. */ }
  return 'combat'
}
export function saveSheetTab(userId: string, characterId: string, tab: string) {
  if (!userId || !characterId || !SHEET_TABS.some(entry => entry.id === tab)) return
  try { localStorage.setItem(key(userId, characterId), tab) } catch { /* Keep the active tab for this visit. */ }
}
