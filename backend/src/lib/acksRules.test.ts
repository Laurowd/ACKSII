import { describe, expect, it, vi } from 'vitest'
import { calculateItemResearch, itemResearchRate, researchData } from './magicResearch'
import { domainEconomy } from './domainEconomy'
import { advanceCampaignCalendar } from './campaignCalendar'

describe('ACKS II campaign rules', () => {
  it('separates land, services, taxes and expenses without a morale multiplier', () => {
    expect(domainEconomy({ peasantFamilies: 100, revenuePerFamily: 6, peasantMorale: 10,
      garrisonCost: 200, maintenanceCost: 100, liturgiesCost: 100, titheCost: 100 })).toEqual({
      land: 600, services: 400, taxes: 200, gross: 1200, expenses: 500, balance: 700,
    })
    expect(domainEconomy({ peasantFamilies: 100, revenuePerFamily: 6, taxPerFamily: 0 }).taxes).toBe(0)
  })
  it('accounts for all three research costs and uses labor rate for time', () => {
    expect(calculateItemResearch({ effectType: 'ONE_USE', effectCount: 1, spellLevel: 1, researchRateGp: 50 })).toMatchObject({
      componentCostGp: 500, materialCostGp: 500, researchCostGp: 500, totalCostGp: 1500, daysRequired: 10, weeksRequired: 2,
    })
    expect(calculateItemResearch({ effectType: 'CHARGED', effectCount: 10, spellLevel: 3, researchRateGp: 600 }).totalCostGp).toBe(45000)
    expect(calculateItemResearch({ effectType: 'BONUS', effectCount: 3, spellLevel: 1, researchRateGp: 1750 }).totalCostGp).toBe(105000)
    expect(itemResearchRate(14)).toBe(1750)
  })
  it('rejects invalid research and checks workshop and caster prerequisites', () => {
    const caster = { level: 9, isSpellcaster: true, workshopValue: 4000 }
    expect(() => researchData({ status: 'IN_PROGRESS' }, caster)).toThrow('fórmula/amostra')
    expect(() => researchData({ status: 'IN_PROGRESS', hasFormula: true }, { ...caster, workshopValue: 0 })).toThrow('Oficina')
    expect(() => researchData({ effectType: 'BONUS', effectCount: 4 }, caster)).toThrow('Bônus')
    expect(() => researchData({ researchRateGp: -1 }, caster)).toThrow('inválidos')
    const project = researchData({ hasFormula: true, status: 'IN_PROGRESS' }, caster)
    expect(project.remainingDays).toBe(1)
    expect(() => researchData({ status: 'COMPLETED' }, caster, project)).toThrow('tempo')
    expect(() => researchData({ spellLevel: 2 }, caster, project)).toThrow('antes de iniciar')
  })
  it('advances campaign and character work together and waits for research resolution', async () => {
    const activity = () => ({ findMany: vi.fn().mockResolvedValue([{ id: 'a', remainingWeeks: 1 }]), update: vi.fn() })
    const tx = { campaign: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, campaignActivity: activity(), characterActivity: activity(),
      magicItemResearch: { findMany: vi.fn().mockResolvedValue([{ id: 'r', remainingDays: 3 }]), update: vi.fn() } }
    expect(await advanceCampaignCalendar(tx, { id: 'c', currentWeek: 4, currentMonth: 12, currentYear: 1 }, 1))
      .toEqual({ currentWeek: 1, currentMonth: 1, currentYear: 2 })
    expect(tx.characterActivity.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { remainingWeeks: 0, status: 'COMPLETED' } })
    expect(tx.magicItemResearch.update).toHaveBeenCalledWith({ where: { id: 'r' }, data: { remainingDays: 0, status: 'READY' } })
  })
  it('does not progress activities after a concurrent calendar change', async () => {
    const tx = { campaign: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } }
    await expect(advanceCampaignCalendar(tx, { id: 'c', currentWeek: 1, currentMonth: 1, currentYear: 1 }, 1)).rejects.toThrow('CALENDAR_CONFLICT')
  })
})
