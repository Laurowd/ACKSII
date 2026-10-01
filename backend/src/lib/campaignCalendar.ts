export async function advanceCampaignCalendar(tx: any, campaign: any, stepWeeks: number) {
  let week = campaign.currentWeek + stepWeeks, month = campaign.currentMonth, year = campaign.currentYear
  while (week > 4) { week -= 4; month++; if (month > 12) { month = 1; year++ } }
  const updated = await tx.campaign.updateMany({
    where: { id: campaign.id, currentWeek: campaign.currentWeek, currentMonth: campaign.currentMonth, currentYear: campaign.currentYear },
    data: { currentWeek: week, currentMonth: month, currentYear: year },
  })
  if (!updated.count) throw new Error('CALENDAR_CONFLICT')
  let options: Record<string, boolean> = {}
  try { options = JSON.parse(campaign.optionalRules || '{}') } catch { /* defaults */ }
  if (options.enableActivityQueue !== false) {
    const groups = [
      [tx.campaignActivity, { campaignId: campaign.id, status: { in: ['QUEUED', 'ACTIVE'] } }],
      [tx.characterActivity, { character: { campaignId: campaign.id }, status: 'ACTIVE' }],
    ] as const
    for (const [model, where] of groups) {
      for (const activity of await model.findMany({ where })) {
        const remainingWeeks = Math.max(0, activity.remainingWeeks - stepWeeks)
        await model.update({ where: { id: activity.id }, data: { remainingWeeks, status: remainingWeeks ? 'ACTIVE' : 'COMPLETED' } })
      }
    }
    const projects = await tx.magicItemResearch.findMany({ where: { character: { campaignId: campaign.id }, status: 'IN_PROGRESS' }, include: { character: { select: { rulesState: true } } } })
    for (const project of projects) {
      // Tracked research advances through explicit work reports, avoiding duplicate days.
      if (JSON.parse(project.character?.rulesState || '{}').research?.[project.id]) continue
      const remainingDays = Math.max(0, project.remainingDays - stepWeeks * 7)
      await tx.magicItemResearch.update({ where: { id: project.id }, data: { remainingDays, status: remainingDays ? 'IN_PROGRESS' : 'READY' } })
    }
  }
  return { currentWeek: week, currentMonth: month, currentYear: year }
}
