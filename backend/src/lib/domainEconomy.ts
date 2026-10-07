import incomeFactors from '../data/domainIncomeFactors.json'

export function domainEconomy(d: Record<string, any>) {
  const families = Number(d.peasantFamilies ?? 0)
  const land = families * Number(d.revenuePerFamily ?? 3)
  const services = families * Number(d.servicePerFamily ?? 4)
  const taxes = families * Number(d.taxPerFamily ?? 2)
  const gross = land + services + taxes
  const incomeFactor = domainIncomeFactor(d.peasantMorale), revenue = gross * incomeFactor
  const expenses = ['garrisonCost', 'civilExpenses', 'constructionCosts', 'mercenaryPayroll',
    'specialistPayroll', 'maintenanceCost', 'liturgiesCost', 'titheCost'].reduce((sum, k) => sum + Number(d[k] ?? 0), 0)
  return { land, services, taxes, gross, incomeFactor, revenue, expenses, balance: revenue + Number(d.eventModifier ?? 0) - expenses }
}

export function domainIncomeFactor(morale: number) {
  const current = Math.max(-4, Math.min(4, Number(morale) || 0))
  return (incomeFactors as Record<string, number>)[String(current)] ?? 1
}
