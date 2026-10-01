import prisma from './prisma'
import { DEFAULT_CLASSES } from '../utils/seedClasses'
import { creationRules, abilityModifier } from './creationRules'
import { ruleProfile } from './ruleProfiles'
import { RULE_CLASSES, rulesFor } from './gameRules'

export const catalogKey = (name: string) => `catalog:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

// Preserve the existing dataset; these tables still need a full rulebook audit.
export const CLASS_CATALOG = DEFAULT_CLASSES.map(c => ({
  id: catalogKey(c.name), name: c.name, hitDie: c.hitDie, conBonus: c.conBonus,
  source: 'catalog' as const, baseClassKey: '', description: '', classFeatures: '',
  ...creationRules(c.name), maxLevel: c.xpPerLevel.length,
  ruleProfile: ruleProfile(c.name),
  rules: RULE_CLASSES[c.name],
  xpPerLevel: JSON.stringify(c.xpPerLevel), titles: JSON.stringify(c.titles),
  attackThrows: JSON.stringify(c.attackThrows), savingThrows: JSON.stringify(c.savingThrows),
  thiefSkills: '[]', rebukingUndead: '[]',
}))

export async function canReadCampaign(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return false
  if (campaign.masterId === userId) return true
  const membership = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
  })
  return membership?.status === 'ACCEPTED'
}

export async function resolveClass(classKey: string, campaignId: string | null, name = '') {
  if (classKey.startsWith('catalog:')) return CLASS_CATALOG.find(c => c.id === classKey) ?? null
  if (classKey) {
    if (!campaignId) return null
    return prisma.customClass.findFirst({ where: { id: classKey, campaignId } })
  }
  if (campaignId && name) {
    const custom = await prisma.customClass.findFirst({ where: { campaignId, name } })
    if (custom) return custom
  }
  return CLASS_CATALOG.find(c => c.name.toLowerCase() === name.toLowerCase()) ?? null
}

export function progressionFields(klass: { hitDie: string; titles: string; xpPerLevel: string; savingThrows: string }, level: number, wil = 10) {
  const titles: string[] = JSON.parse(klass.titles)
  const xp: number[] = JSON.parse(klass.xpPerLevel)
  const saves = JSON.parse(klass.savingThrows)[level - 1]
  const modifier = abilityModifier(wil)
  return {
    hitDice: rulesFor(klass)?.levels[level-1]?.hitDice || klass.hitDie,
    ...(titles[level - 1] !== undefined ? { title: titles[level - 1] } : {}),
    xpNext: xp[level] ?? 0,
    ...(saves ? { saveDeath: saves.death - modifier, saveParalysis: saves.paralysis - modifier,
      saveBlast: saves.blast - modifier, saveImplements: saves.implements - modifier, saveSpells: saves.spells - modifier } : {}),
  }
}
