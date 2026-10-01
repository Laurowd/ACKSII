// Revised Rulebook: Creating Magic Items. One effect; complex combinations are manual.
export const EFFECT_MULTIPLIERS: Record<string, number> = {
  ONE_USE: 1, CHARGED: 1, WEEKLY: 6, THREE_WEEKLY: 8, DAILY: 10, THREE_DAILY: 12,
  HOURLY: 16, THREE_TURNS: 25, EACH_TURN: 33, AT_WILL: 50,
  PERMANENT_DAY: 15, PERMANENT_HOUR: 24, PERMANENT_THREE_TURNS: 38,
  PERMANENT_TURN: 50, PERMANENT_CASTER_LEVEL: 38,
}
const rates = [2.5, 5, 7, 15, 25, 50, 100, 200, 400, 600, 900, 1750]
export function itemResearchRate(casterLevel: number) { return rates[Math.min(11, Math.max(0, casterLevel))]! }

export function calculateItemResearch(input: { effectType: string; spellLevel: number; effectCount: number; researchRateGp: number }) {
  const { effectType, spellLevel, effectCount, researchRateGp } = input
  if (!Number.isInteger(spellLevel) || spellLevel < 1 || spellLevel > 6 || !Number.isInteger(effectCount) || effectCount < 1 || effectCount > 1000 || !Number.isFinite(researchRateGp) || researchRateGp <= 0) throw new Error('Parâmetros de pesquisa inválidos.')
  let base: number
  if (effectType === 'BONUS') {
    if (effectCount > 3) throw new Error('Bônus permanente suportado: +1 a +3.')
    base = [0, 5000, 15000, 35000][effectCount]!
  } else {
    const multiplier = EFFECT_MULTIPLIERS[effectType]
    if (multiplier === undefined) throw new Error('Tipo de efeito inválido.')
    base = 500 * spellLevel * multiplier * (effectType === 'CHARGED' ? effectCount : 1)
  }
  const days = Math.ceil(base / researchRateGp)
  return { componentCostGp: base, materialCostGp: base, researchCostGp: base,
    totalCostGp: base * 3, daysRequired: days, weeksRequired: Math.ceil(days / 7),
    isPermanent: effectType !== 'ONE_USE' }
}

export function researchData(body: Record<string, any>, character: { level: number; isSpellcaster: boolean; workshopValue: number | null }, previous?: Record<string, any>) {
  const data = { itemName: 'Novo projeto', spellLevel: 1, effectType: 'ONE_USE', effectCount: 1,
    casterLevel: Math.min(14, Math.max(1, character.level)), researchRateGp: itemResearchRate(character.level),
    componentCostGp: 0, materialCostGp: 0, researchCostGp: 0, totalCostGp: 0, weeksRequired: 1, isPermanent: false,
    hasFormula: false, hasSample: false, knowsEffect: false, status: 'QUEUED', ...previous, ...body }
  if (typeof data.itemName !== 'string' || !data.itemName.trim() || data.itemName.length > 200) throw new Error('Informe o nome do projeto (até 200 caracteres).')
  if (!['QUEUED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(data.status)) throw new Error('Estado de pesquisa inválido.')
  for (const key of ['hasFormula', 'hasSample', 'knowsEffect'] as const) if (typeof data[key] !== 'boolean') throw new Error('Marque fórmula, amostra e conhecimento do efeito corretamente.')
  if (!Number.isInteger(data.casterLevel) || data.casterLevel < 1 || data.casterLevel > 14) throw new Error('Nível de conjurador inválido.')
  const result = data.effectType === 'MANUAL' ? {
    componentCostGp: Number(data.componentCostGp ?? 0), materialCostGp: Number(data.materialCostGp ?? 0), researchCostGp: Number(data.researchCostGp ?? 0),
    totalCostGp: Number(data.totalCostGp ?? 0), weeksRequired: Number(data.weeksRequired ?? 1),
    daysRequired: Number(data.weeksRequired ?? 1) * 7, isPermanent: data.isPermanent !== false,
  } : calculateItemResearch(data)
  for (const value of Object.values(result)) if (typeof value === 'number' && (!Number.isFinite(value) || value < 0 || value > 1e12)) throw new Error('Custo ou prazo inválido.')
  if (!Number.isInteger(result.weeksRequired) || result.weeksRequired < 1 || result.daysRequired > 1000000) throw new Error('Prazo de pesquisa inválido.')
  const definitionChanged = previous && ['effectType', 'effectCount', 'spellLevel', 'researchRateGp', 'weeksRequired'].some(k => body[k] !== undefined && body[k] !== previous[k])
  if (definitionChanged && previous.status !== 'QUEUED') throw new Error('Edite os parâmetros antes de iniciar. Para reformular, crie outro projeto.')
  if (data.status === 'IN_PROGRESS') {
    if (data.effectType !== 'MANUAL') {
      const levelRequired = data.effectType === 'ONE_USE' ? 5 : 9
      if (!character.isSpellcaster || data.casterLevel < levelRequired || data.casterLevel > character.level) throw new Error(`Este projeto exige conjurador de nível ${levelRequired} ou superior.`)
      const workshopTier = data.effectType === 'BONUS' ? data.effectCount : data.spellLevel
      if ((character.workshopValue ?? 0) < 4000 + (workshopTier - 1) * 2000) throw new Error('Oficina insuficiente: mínimo 4.000 GP + 2.000 por nível de efeito/bônus adicional.')
      if (!data.hasFormula && !data.hasSample && !data.knowsEffect) throw new Error('É necessário conhecer o efeito ou possuir fórmula/amostra.')
    }
  }
  const remainingDays = definitionChanged || !previous ? result.daysRequired : previous.remainingDays
  if (['COMPLETED', 'FAILED'].includes(data.status) && remainingDays > 0) throw new Error('Conclua o tempo de trabalho antes de registrar o resultado.')
  const { daysRequired, ...costs } = result
  return { itemName: data.itemName.trim(), spellLevel: data.spellLevel, effectType: data.effectType,
    effectCount: data.effectCount, casterLevel: data.casterLevel, researchRateGp: data.researchRateGp,
    hasFormula: data.hasFormula, hasSample: data.hasSample, knowsEffect: data.knowsEffect,
    status: data.status, remainingDays, ...costs }
}
