export function domainEconomy(d: Record<string, any>) {
  const families = Number(d.peasantFamilies ?? 0)
  const land = families * Number(d.revenuePerFamily ?? 3)
  const services = families * Number(d.servicePerFamily ?? 4)
  const taxes = families * Number(d.taxPerFamily ?? 2)
  const gross = land + services + taxes
  const expenses = ['garrisonCost', 'civilExpenses', 'constructionCosts', 'mercenaryPayroll',
    'specialistPayroll', 'maintenanceCost', 'liturgiesCost', 'titheCost'].reduce((sum, k) => sum + Number(d[k] ?? 0), 0)
  return { land, services, taxes, gross, expenses, balance: gross + Number(d.eventModifier ?? 0) - expenses }
}
