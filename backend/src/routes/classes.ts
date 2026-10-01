import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { CLASS_CATALOG, canReadCampaign } from '../lib/classCatalog'
import { readState } from '../lib/gameRules'

const integer = { type: 'integer', minimum: -30, maximum: 100 }
const attributes = ['str', 'int', 'dex', 'wil', 'con', 'cha']
const bodySchema = {
  type: 'object', additionalProperties: false,
  required: ['name', 'hitDie', 'conBonus', 'xpPerLevel', 'titles', 'attackThrows', 'savingThrows'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 80 },
    description: { type: 'string', maxLength: 4000 },
    classFeatures: { type: 'string', maxLength: 20000 },
    baseClassKey: { type: 'string', maxLength: 100 },
    creationRules: { type: 'object', additionalProperties: false, properties: {
      spellcaster: { type: 'boolean' },
      keyAttributes: { type: 'array', uniqueItems: true, maxItems: 6, items: { type: 'string', enum: attributes } },
      minimumAttributes: { type: 'object', additionalProperties: false,
        properties: Object.fromEntries(attributes.map(k => [k, { type: 'integer', minimum: 3, maximum: 18 }])) },
    } },
    hitDie: { type: 'string', pattern: '^1d(4|6|8|10|12)$' }, conBonus: { type: 'boolean' },
    xpPerLevel: { type: 'array', minItems: 1, maxItems: 14, items: { type: 'integer', minimum: 0, maximum: 2147483647 } },
    titles: { type: 'array', minItems: 1, maxItems: 14, items: { type: 'string', maxLength: 120 } },
    attackThrows: { type: 'array', minItems: 1, maxItems: 14, items: integer },
    savingThrows: { type: 'array', minItems: 1, maxItems: 14, items: {
      type: 'object', required: ['death', 'paralysis', 'blast', 'implements', 'spells'],
      properties: { level: { type: 'integer', minimum: 1, maximum: 14 }, death: integer, paralysis: integer, blast: integer, implements: integer, spells: integer },
      additionalProperties: false,
    } },
    thiefSkills: { type: 'array', maxItems: 14, items: { type: 'object', additionalProperties: integer } },
    rebukingUndead: { type: 'array', maxItems: 14, items: { type: 'object', additionalProperties: { anyOf: [{ type: 'string', maxLength: 20 }, integer] } } },
  },
}

export async function customClassesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)

  app.get('/catalog', async (request, reply) => {
    const { campaignId } = request.query as { campaignId?: string }
    const { id } = request.user as { id: string }
    if (campaignId && !(await canReadCampaign(campaignId, id))) return reply.code(403).send({ message: 'Sem acesso à campanha.' })
    const custom = campaignId ? await prisma.customClass.findMany({ where: { campaignId }, orderBy: { name: 'asc' } }) : []
    return [...CLASS_CATALOG, ...custom.map(c => ({ ...c, ...readState(c.creationRules), source: 'campaign' }))]
  })

  app.get('/:campaignId', async (request, reply) => {
    const { campaignId } = request.params as { campaignId: string }
    if (!(await canReadCampaign(campaignId, (request.user as { id: string }).id))) return reply.code(403).send({ message: 'Sem acesso à campanha.' })
    return prisma.customClass.findMany({ where: { campaignId }, orderBy: { name: 'asc' } })
  })

  for (const method of ['POST', 'PUT'] as const) {
    app.route({ method, url: method === 'POST' ? '/:campaignId' : '/:campaignId/:classId', schema: { body: bodySchema }, handler: async (request, reply) => {
      const { campaignId, classId } = request.params as { campaignId: string; classId?: string }
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
      if (!campaign || campaign.masterId !== (request.user as { id: string }).id) return reply.code(403).send({ message: 'Somente o mestre desta campanha pode alterar classes.' })
      const existing = classId ? await prisma.customClass.findFirst({ where: { id: classId, campaignId } }) : null
      if (classId && !existing) return reply.code(404).send({ message: 'Classe não encontrada nesta campanha.' })
      if (existing && readState(existing.creationRules).build) return reply.code(409).send({message:'Classes construídas por pontos preservam sua definição. Crie uma cópia no editor manual para alterar as tabelas.'})
      const b = request.body as { name: string; hitDie: string; conBonus: boolean; description?: string; classFeatures?: string; baseClassKey?: string; xpPerLevel: number[]; titles: string[]; attackThrows: number[]; savingThrows: unknown[]; thiefSkills?: unknown[]; rebukingUndead?: unknown[] }
      const construction = (request.body as any).creationRules
      const length = b.xpPerLevel.length
      if (!b.name.trim() || b.xpPerLevel[0] !== 0 || b.xpPerLevel.some((xp, i) => i > 0 && xp <= b.xpPerLevel[i - 1]!) ||
        [b.titles, b.attackThrows, b.savingThrows].some(a => a.length !== length)) {
        return reply.code(400).send({ message: 'Use XP inicial 0, XP crescente e uma linha completa para cada nível.' })
      }
      if (b.baseClassKey && !CLASS_CATALOG.some(c => c.id === b.baseClassKey)) return reply.code(400).send({ message: 'Classe base inválida.' })
      if ([b.thiefSkills, b.rebukingUndead].some(a => a?.length && a.length !== length)) return reply.code(400).send({ message: 'As tabelas opcionais devem ter uma linha por nível ou ficar vazias.' })
      if (existing && await prisma.character.count({ where: { campaignId, level: { gt: length }, OR: [{ classKey: existing.id }, { classKey: '', className: existing.name }] } })) return reply.code(409).send({ message: 'Há fichas acima do novo nível máximo. Ajuste essas fichas antes de reduzir a progressão.' })
      const duplicate = await prisma.customClass.findFirst({ where: { campaignId, name: { equals: b.name.trim(), mode: 'insensitive' }, ...(classId ? { id: { not: classId } } : {}) } })
      if (duplicate) return reply.code(409).send({ message: 'Já existe uma classe com este nome na campanha.' })
      const data = { name: b.name.trim(), hitDie: b.hitDie, conBonus: b.conBonus,
        ...(construction !== undefined ? { creationRules: JSON.stringify(construction) } : {}),
        description: b.description ?? '', classFeatures: b.classFeatures ?? '', baseClassKey: b.baseClassKey ?? '',
        xpPerLevel: JSON.stringify(b.xpPerLevel), titles: JSON.stringify(b.titles), attackThrows: JSON.stringify(b.attackThrows),
        savingThrows: JSON.stringify(b.savingThrows), thiefSkills: JSON.stringify(b.thiefSkills ?? []), rebukingUndead: JSON.stringify(b.rebukingUndead ?? []),
      }
      const result = await prisma.$transaction(async tx => {
        const result = classId ? await tx.customClass.update({ where: { id: classId }, data }) : await tx.customClass.create({ data: { ...data, campaignId } })
        if (existing) await tx.character.updateMany({ where: { campaignId, OR: [{ classKey: existing.id }, { classKey: '', className: existing.name }] }, data: { classKey: result.id, className: result.name } })
        return result
      })
      return reply.code(classId ? 200 : 201).send(result)
    } })
  }

  app.delete('/:campaignId/:classId', async (request, reply) => {
    const { campaignId, classId } = request.params as { campaignId: string; classId: string }
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign || campaign.masterId !== (request.user as { id: string }).id) return reply.code(403).send({ message: 'Somente o mestre desta campanha pode remover classes.' })
    const existing = await prisma.customClass.findFirst({ where: { id: classId, campaignId } })
    if (!existing) return reply.code(404).send({ message: 'Classe não encontrada nesta campanha.' })
    const used = await prisma.character.count({ where: { campaignId, OR: [{ classKey: classId }, { classKey: '', className: existing.name }] } })
    if (used) return reply.code(409).send({ message: 'Esta classe está em uso. Troque a classe das fichas antes de removê-la.' })
    await prisma.customClass.delete({ where: { id: classId } })
    return { message: 'Classe removida.' }
  })
}
