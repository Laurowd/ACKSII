export function spellTradition(info: any, spell: any): string {
  return spell.tradition || (info.magic?.length === 1 ? info.magic[0].tradition : '')
}

export function remainingSpellUses(info: any, tradition: string, level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 6) return 0
  const pool = info.magic?.find((entry: any) => entry.tradition === tradition)
  if (!pool) return 0
  return Math.max(0, Number(pool.slots?.[level - 1] || 0) - Number(info.used?.[`${tradition}:${level}`] || 0))
}
