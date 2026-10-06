import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { normalized, SPELL_LIST } from '../lib/gameRules'
import { campaignSpellChoices, campaignSpellError as fail, campaignSpellReferences, managedCampaign } from '../lib/campaignSpells'
import { SPELL_TYPES } from '../lib/warlockPaths'

const fields = {
  name: { type: 'string', minLength: 1, maxLength: 160 },
  level: { type: 'integer', minimum: 1, maximum: 6 }, tradition: { type: 'string', enum: ['arcane', 'divine'] },
  description: { type: 'string', minLength: 1, maxLength: 10000 },
  types: {type:'array',uniqueItems:true,maxItems:14,items:{type:'string',enum:SPELL_TYPES.map(type=>type.key)}},
  range: { type: 'string', maxLength: 300 }, duration: { type: 'string', maxLength: 300 },
  visibility: { type: 'string', enum: ['SECRET', 'CAMPAIGN', 'CHARACTERS'] },
  characterIds: { type: 'array', uniqueItems: true, maxItems: 200, items: { type: 'string', minLength: 1, maxLength: 160 } },
}
const schema = (update: boolean) => ({ type: 'object', additionalProperties: false,
  required: ['name', 'level', 'tradition', 'description', 'visibility', ...(update ? ['version'] : [])],
  properties: { ...fields, ...(update ? { version: { type: 'integer', minimum: 0 } } : {}) } })

export async function campaignSpellsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)
  app.get('/:id/spell-options', { schema: { querystring: { type: 'object', additionalProperties: false,
    properties: { characterId: { type: 'string', minLength: 1, maxLength: 160 } } } } }, async req => {
    const id = (req.params as any).id, user = req.user as any, characterId = (req.query as any).characterId
    const campaign = await prisma.campaign.findUnique({ where: { id }, select: { masterId: true } })
    const membership = campaign && await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId: id, userId: user.id } } })
    if (!campaign || (campaign.masterId !== user.id && membership?.status !== 'ACCEPTED')) throw fail('Campanha não encontrada ou sem permissão.', 404)
    if (characterId && !await prisma.character.findFirst({ where: { id: characterId, campaignId: id,
      ...(campaign.masterId === user.id ? {} : { userId: user.id }) } })) throw fail('Ficha não encontrada ou sem permissão.', 404)
    return { spells: await campaignSpellChoices(id, characterId) }
  })
  app.get('/:id/spells', async req => {
    const id = (req.params as any).id
    await managedCampaign(id, req.user as any)
    const spells = await prisma.campaignSpell.findMany({ where: { campaignId: id }, include: { reveals: { select: { characterId: true } } }, orderBy: { name: 'asc' } })
    return { spells: spells.map(({ reveals, ...spell }) => ({ ...spell, characterIds: reveals.map(r => r.characterId) })) }
  })
  for (const update of [false, true]) app.route({ method: update ? 'PUT' : 'POST', url: update ? '/:id/spells/:spellId' : '/:id/spells',
    schema: { body: schema(update) }, handler: async req => {
      const id = (req.params as any).id, input = req.body as any, user = req.user as any
      return prisma.$transaction(async tx => {
        await managedCampaign(id, user, tx)
        const before = update ? await tx.campaignSpell.findFirst({ where: { id: (req.params as any).spellId, campaignId: id } }) : null
        if (update && !before) throw fail('Magia não encontrada.', 404)
        if (before && before.version !== input.version) throw fail('A magia mudou. Atualize a lista antes de salvar.', 409)
        const name = input.name.trim(), nameKey = normalized(name), description = input.description.trim()
        if (!nameKey || !description) throw fail('Informe nome e descrição da magia.')
        if (SPELL_LIST.some(s => normalized(s.name) === nameKey && s.tradition === input.tradition)) throw fail('Este nome já pertence ao catálogo do livro; escolha um nome próprio para a magia de campanha.')
        const duplicate = await tx.campaignSpell.findFirst({ where: { campaignId: id, nameKey, tradition: input.tradition, ...(before ? { id: { not: before.id } } : {}) } })
        if (duplicate) throw fail('Já existe uma magia com esse nome e tradição nesta campanha.', 409)
        const characterIds: string[] = input.visibility === 'CHARACTERS' ? input.characterIds || [] : []
        if (input.visibility === 'CHARACTERS' && !characterIds.length) throw fail('Escolha ao menos um personagem para revelar a magia.')
        if (characterIds.length && await tx.character.count({ where: { id: { in: characterIds }, campaignId: id } }) !== characterIds.length) throw fail('Todos os personagens escolhidos precisam pertencer a esta campanha.')
        if (before) {
          const references = await campaignSpellReferences(before, tx)
          if (references.length && (before.nameKey !== nameKey || before.level !== input.level || before.tradition !== input.tradition)) throw fail('Remova a magia das fichas antes de alterar seu nome, nível ou tradição.', 409)
          if (references.some((r: any) => input.visibility === 'SECRET' || (input.visibility === 'CHARACTERS' && !characterIds.includes(r.characterId)))) throw fail('Esta magia já foi aprendida. Remova-a das fichas afetadas antes de ocultá-la.', 409)
        }
        const data = { name, nameKey, description, types:input.types ?? before?.types ?? [], level: input.level, tradition: input.tradition, range: (input.range || '').trim(), duration: (input.duration || '').trim(), visibility: input.visibility }
        const spell = before ? await tx.campaignSpell.update({ where: { id: before.id }, data: { ...data, version: { increment: 1 } } })
          : await tx.campaignSpell.create({ data: { ...data, campaignId: id } })
        await tx.campaignSpellReveal.deleteMany({ where: { spellId: spell.id } })
        if (characterIds.length) await tx.campaignSpellReveal.createMany({ data: characterIds.map(characterId => ({ spellId: spell.id, characterId })) })
        await tx.campaign.update({ where: { id }, data: { updatedAt: new Date() } })
        // No secret name/effect is copied into a general campaign activity log.
        return { spell: { ...spell, characterIds } }
      }, { isolationLevel: 'Serializable' })
    } })
  app.delete('/:id/spells/:spellId', { schema: { body: { type: 'object', additionalProperties: false, required: ['version'], properties: { version: { type: 'integer', minimum: 0 } } } } }, async req => {
    const id = (req.params as any).id
    return prisma.$transaction(async tx => {
      await managedCampaign(id, req.user as any, tx)
      const spell = await tx.campaignSpell.findFirst({ where: { id: (req.params as any).spellId, campaignId: id } })
      if (!spell) throw fail('Magia não encontrada.', 404)
      if (spell.version !== (req.body as any).version) throw fail('A magia mudou. Atualize a lista antes de remover.', 409)
      if ((await campaignSpellReferences(spell, tx)).length) throw fail('Remova esta magia das fichas antes de excluir o cadastro.', 409)
      await tx.campaignSpell.delete({ where: { id: spell.id } })
      await tx.campaign.update({ where: { id }, data: { updatedAt: new Date() } })
      return { ok: true }
    }, { isolationLevel: 'Serializable' })
  })
}
