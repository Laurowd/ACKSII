export async function isResponsibleMaster(user: any, character: any, db: any) {
  if (user.role !== 'MASTER') return false
  if (!character.campaignId) return character.userId === user.id
  return (await db.campaign.findUnique({ where: { id: character.campaignId } }))?.masterId === user.id
}
