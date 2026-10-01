export interface SessionMagic {
  supported: boolean
  pools: Array<{ tradition: string; casterLevel: number; slots: number[] }>
  used: Record<string, number>
  lastRestDay?: number | null
}

export interface SessionMagicResource {
  key: string
  tradition: string
  level: number
  remaining: number
  total: number
}

export function sessionMagicResources(magic?: SessionMagic): SessionMagicResource[] {
  if (!magic?.supported) return []
  return magic.pools.flatMap(pool => pool.slots.flatMap((total, index) => {
    if (total <= 0) return []
    const key = `${pool.tradition}:${index + 1}`
    return [{ key, tradition: pool.tradition, level: index + 1,
      remaining: Math.max(0, total - Math.max(0, magic.used[key] || 0)), total }]
  }))
}

export function sessionHpRatio(current: number, maximum: number): number {
  return maximum > 0 ? Math.min(100, Math.max(0, current / maximum * 100)) : 0
}

export function sessionHpStatus(current: number, maximum: number): string {
  if (current <= 0) return 'Sem PV'
  if (maximum > 0 && current <= maximum / 2) return 'Ferido'
  return 'Pronto'
}

export function magicTraditionName(tradition: string): string {
  return tradition === 'arcane' ? 'Arcana' : tradition === 'divine' ? 'Divina' : tradition
}
