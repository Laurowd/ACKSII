import prisma from './prisma'
import { normalized, SPELL_LIST } from './gameRules'

export const campaignSpellError = (message: string, statusCode = 400) => Object.assign(new Error(message), { statusCode })

// Character context is required for individual reveals. Secrets never become
// choices merely because the caller is the master; publishing is explicit.
export async function campaignSpellChoices(campaignId: string | null | undefined, characterId?: string, db: any = prisma) {
  if (!campaignId) return []
  const rows = await db.campaignSpell.findMany({ where: { campaignId, OR: [
    { visibility: 'CAMPAIGN' },
    ...(characterId ? [{ visibility: 'CHARACTERS', reveals: { some: { characterId } } }] : []),
  ] }, orderBy: [{ level: 'asc' }, { name: 'asc' }] })
  return rows.map((row: any) => ({ campaignSpellId: row.id, name: row.name, level: row.level, tradition: row.tradition,
    description: row.description, range: row.range, duration: row.duration }))
}
export async function characterSpellCatalog(character: { id?: string; campaignId?: string | null }, user: { id: string }, db: any = prisma) {
  if (character.campaignId) {
    const campaign = await db.campaign.findUnique({ where: { id: character.campaignId }, select: { masterId: true } })
    const membership = campaign?.masterId !== user.id && await db.campaignMember.findUnique({ where: { campaignId_userId: { campaignId: character.campaignId, userId: user.id } } })
    if (!campaign || (campaign.masterId !== user.id && membership?.status !== 'ACCEPTED')) return [...SPELL_LIST]
  }
  return [...SPELL_LIST, ...await campaignSpellChoices(character.campaignId, character.id, db)]
}
export async function managedCampaign(id: string, user: { id: string; role: string }, db: any = prisma) {
  const campaign = await db.campaign.findUnique({ where: { id }, select: { id: true, masterId: true } })
  if (!campaign || user.role !== 'MASTER' || campaign.masterId !== user.id) throw campaignSpellError('Campanha não encontrada ou sem permissão.', 404)
  return campaign
}
export async function campaignSpellReferences(spell: any, db: any) {
  const rows = await db.spell.findMany({ where: { character: { campaignId: spell.campaignId }, level: spell.level,
    tradition: { in: ['', spell.tradition] } }, select: { characterId: true, name: true } })
  return rows.filter((row: any) => normalized(row.name) === spell.nameKey)
}
