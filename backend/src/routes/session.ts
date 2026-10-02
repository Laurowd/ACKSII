import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { CLASS_CATALOG, canonicalClass } from '../lib/classCatalog'
import { magicPools, readState, rulesFor } from '../lib/gameRules'

export async function sessionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)
  app.get('/', async (request, reply) => {
    const user = request.user as { id: string; role: string }
    if (user.role !== 'MASTER') return reply.code(403).send({ error: 'Esta visão é reservada ao mestre.' })
    const owned = await prisma.campaign.findMany({ where: { masterId: user.id }, include: { customClasses: true }, orderBy: { name: 'asc' } })
    const characters = await prisma.character.findMany({
      where: { OR: [{ campaignId: { in: owned.map(c => c.id) } }, { userId: user.id, campaignId: null }] },
      include: { user: { select: { username: true } }, items: true, weapons: true, proficiencies: true, spells: true },
      orderBy: { characterName: 'asc' },
    })
    return {
      campaigns: owned.map(({ id, name }) => ({ id, name })),
      characters: characters.map(character => {
        const custom = owned.find(c => c.id === character.campaignId)?.customClasses || []
        const definition = canonicalClass(character.classKey ? [...custom, ...CLASS_CATALOG].find(c => c.id === character.classKey)
          : custom.find(c => c.name === character.className) || CLASS_CATALOG.find(c => c.name.toLowerCase() === character.className.toLowerCase()))
        const classDefinition = definition && !definition.id.startsWith('catalog:')
          ? { ...definition, ...readState((definition as any).creationRules), source: 'campaign' }
          : definition || null
        const rules = rulesFor(definition), state = readState(character.rulesState)
        return { ...character, classDefinition,
          magic: { supported: Boolean(rules), pools: rules ? magicPools(rules, character) : [], used: state?.used || {}, lastRestDay: state?.lastRestDay ?? null } }
      }),
    }
  })
}
