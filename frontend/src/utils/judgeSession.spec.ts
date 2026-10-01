import { describe, expect, it } from 'vitest'
import { sessionMagicResources, sessionHpRatio, sessionHpStatus } from './judgeSession'

describe('resumo de sessão', () => {
  it('separa tradições e desconta somente os usos do nível correspondente', () => {
    expect(sessionMagicResources({ supported: true, pools: [
      { tradition: 'arcane', casterLevel: 3, slots: [2, 1, 0] },
      { tradition: 'divine', casterLevel: 1, slots: [1, 0] },
    ], used: { 'arcane:1': 1, 'arcane:2': 1, 'divine:1': 0 } })).toEqual([
      { key: 'arcane:1', tradition: 'arcane', level: 1, remaining: 1, total: 2 },
      { key: 'arcane:2', tradition: 'arcane', level: 2, remaining: 0, total: 1 },
      { key: 'divine:1', tradition: 'divine', level: 1, remaining: 1, total: 1 },
    ])
  })

  it('não inventa recursos automáticos para classes manuais ou sem magia', () => {
    expect(sessionMagicResources()).toEqual([])
    expect(sessionMagicResources({ supported: false, pools: [], used: {} })).toEqual([])
    expect(sessionMagicResources({ supported: true, pools: [], used: {} })).toEqual([])
  })

  it('limita barras de PV e reconhece personagens incapacitados', () => {
    expect(sessionHpRatio(20, 10)).toBe(100)
    expect(sessionHpRatio(-4, 10)).toBe(0)
    expect(sessionHpRatio(0, 0)).toBe(0)
    expect(sessionHpStatus(-1, 8)).toBe('Sem PV')
    expect(sessionHpStatus(4, 8)).toBe('Ferido')
    expect(sessionHpStatus(5, 8)).toBe('Pronto')
  })
})
