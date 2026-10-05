import { FastifyInstance } from 'fastify'
import { advanceCampaignCalendar } from '../lib/campaignCalendar'
import { domainEconomy } from '../lib/domainEconomy'
import prisma from '../lib/prisma'
import { authGuard } from '../middleware/auth'
import { rateLimitByIp } from '../lib/rateLimit'

function parseJsonSafe<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function campaignsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)
  const prismaAny = prisma as any
  const JOIN_CODE_RE = /^[A-Z0-9]{6}$/
  const ACTIVITY_TYPES = new Set(['travel', 'downtime', 'construction', 'research', 'war'])
  const ACTIVITY_STATUSES = new Set(['QUEUED', 'ACTIVE', 'COMPLETED'])
  const settingsRateLimit = rateLimitByIp(60, 60_000, 'campaign-settings')
  const economyRateLimit = rateLimitByIp(60, 60_000, 'campaign-economy')
  const activityCreateRateLimit = rateLimitByIp(40, 60_000, 'campaign-activity-create')
  const activityResolveRateLimit = rateLimitByIp(50, 60_000, 'campaign-activity-resolve')
  const calendarAdvanceRateLimit = rateLimitByIp(30, 60_000, 'campaign-calendar-advance')
  const joinRateLimit = rateLimitByIp(20, 60_000, 'campaign-join')
  const invitesResolveRateLimit = rateLimitByIp(30, 60_000, 'campaign-invite-resolve')

  const joinBodySchema = {
    type: 'object',
    required: ['joinCode'],
    additionalProperties: false,
    properties: { joinCode: { type: 'string', minLength: 6, maxLength: 6 } }
  } as const

  const settingsBodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      currentYear: { type: 'integer', minimum: 1, maximum: 100000 },
      currentMonth: { type: 'integer', minimum: 1, maximum: 12 },
      currentWeek: { type: 'integer', minimum: 1, maximum: 4 },
      optionalRules: { type: 'object', additionalProperties: { type: 'boolean' } }
    }
  } as const

  const activityBodySchema = {
    type: 'object',
    required: ['title'],
    additionalProperties: false,
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 120 },
      type: { type: 'string' },
      status: { type: 'string' },
      details: { type: 'string', maxLength: 3000 },
      costGp: { type: 'number', minimum: 0, maximum: 1000000000 },
      durationWeeks: { type: 'integer', minimum: 1, maximum: 1000000 },
      impactSummary: { type: 'string', maxLength: 500 }
    }
  } as const

  const inviteResolveBodySchema = {
    type: 'object',
    required: ['status'],
    additionalProperties: false,
    properties: { status: { type: 'string', enum: ['ACCEPTED', 'REJECTED'] } }
  } as const

  function normalizedText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
  }

  function toSafeNumber(value: unknown, fallback = 0): number {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }

  function parseOptionalRules(value: unknown): Record<string, boolean> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const out: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v !== 'boolean') return null
      out[k] = v
    }
    return out
  }

  async function ensureCampaignMemberAccess(campaignId: string, userId: string) {
    const membership = await prismaAny.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } }
    })
    if (!membership || membership.status !== 'ACCEPTED') {
      return false
    }
    return true
  }

  function canManageCampaign(campaign: { masterId: string }, currentUser: { id: string; role: string }) {
    return campaign.masterId === currentUser.id
  }

  // CREATE CAMPAIGN
  app.post('/', { schema: { body: { type: 'object', required: ['name'], additionalProperties: false, properties: { name: { type: 'string', minLength: 1, maxLength: 160 } } } } }, async (request, reply) => {
    if (request.user.role !== 'MASTER') return reply.code(403).send({ message: 'Somente mestres podem criar campanhas.' })
    const { name } = request.body as { name: string }
    const normalizedName = normalizedText(name)
    if (!normalizedName) {
      return reply.status(400).send({ message: 'Campaign name is required' })
    }
    if (normalizedName.length < 2) {
      return reply.status(400).send({ message: 'Campaign name must be at least 2 characters' })
    }
    if (normalizedName.length > 80) {
      return reply.status(400).send({ message: 'Campaign name must be at most 80 characters' })
    }
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { id } = request.user as any

    const campaign = await prismaAny.campaign.create({
      data: {
        name: normalizedName,
        joinCode,
        masterId: id,
        optionalRules: JSON.stringify({
          enableDomainEconomy: true,
          enableMercenaryMorale: true,
          enableMagicResearchValidation: true,
          enableTreasureToXp: true,
          enableMonthlyMaintenance: true,
          enableActivityQueue: true,
          enableClassAutoProgression: true
        }),
        members: {
          create: {
            userId: id,
            status: 'ACCEPTED'
          }
        },
        economy: {
          create: {
            grossRevenue: 0,
            domainRevenue: 0,
            mercantileRevenue: 0,
            expensesTotal: 0,
            garrisonExpenses: 0,
            mercenaryExpenses: 0,
            specialistExpenses: 0,
            maintenanceExpenses: 0,
            stability: 0,
            loyalty: 0,
            monthlyEvent: '',
            consolidatedBalance: 0
          }
        }
      }
    })
    return reply.status(201).send(campaign)
  })

  // LIST CAMPAIGNS (As Master or Player)
  app.get('/', async (request, reply) => {
    
    const { id } = request.user as any
    const campaigns = await prismaAny.campaign.findMany({
      where: {
        members: {
          some: { userId: id, status: 'ACCEPTED' }
        }
      },
      include: {
        master: { select: { username: true } },
        members: { include: { user: { select: { username: true } } } },
        customClasses: true,
        economy: true,
      }
    })
    return campaigns
  })

  // GET CAMPAIGN SETTINGS + RULE TOGGLES
  app.get('/:id/settings', async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id } = request.user as any
    const hasAccess = await ensureCampaignMemberAccess(campaignId, id)
    if (!hasAccess) return reply.status(403).send({ message: 'Forbidden' })

    const campaign = await prismaAny.campaign.findUnique({
      where: { id: campaignId },
      include: { economy: true }
    })

    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })

    return {
      id: campaign.id,
      name: campaign.name,
      currentYear: campaign.currentYear,
      currentMonth: campaign.currentMonth,
      currentWeek: campaign.currentWeek,
      updatedAt: campaign.updatedAt,
      optionalRules: parseJsonSafe<Record<string, boolean>>(campaign.optionalRules, {}),
      economy: campaign.economy
    }
  })

  // UPDATE CAMPAIGN SETTINGS + RULE TOGGLES (Master only)
  app.put('/:id/settings', { schema: { body: settingsBodySchema }, preHandler: [settingsRateLimit] }, async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id, role } = request.user as any
    const body = request.body as {
      currentYear?: number
      currentMonth?: number
      currentWeek?: number
      optionalRules?: Record<string, boolean>
    }

    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })
    if (!canManageCampaign(campaign, { id, role })) return reply.status(403).send({ message: 'Only master can update campaign settings' })

    if (body.optionalRules !== undefined) {
      const parsedRules = parseOptionalRules(body.optionalRules)
      if (!parsedRules) {
        return reply.status(400).send({ message: 'optionalRules must be an object of boolean values' })
      }
      body.optionalRules = parsedRules
    }

    const updated = await prismaAny.campaign.update({
      where: { id: campaignId },
      data: {
        ...(body.currentYear !== undefined && { currentYear: Math.max(1, Number(body.currentYear) || 1) }),
        ...(body.currentMonth !== undefined && { currentMonth: Math.min(12, Math.max(1, Number(body.currentMonth) || 1)) }),
        ...(body.currentWeek !== undefined && { currentWeek: Math.min(4, Math.max(1, Number(body.currentWeek) || 1)) }),
        ...(body.optionalRules !== undefined && { optionalRules: JSON.stringify(body.optionalRules || {}) })
      }
    })

    return {
      id: updated.id,
      currentYear: updated.currentYear,
      currentMonth: updated.currentMonth,
      currentWeek: updated.currentWeek,
      optionalRules: parseJsonSafe<Record<string, boolean>>(updated.optionalRules, {})
    }
  })

  // GET CAMPAIGN ECONOMY (calculated + persisted)
  app.get('/:id/economy', async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id } = request.user as any
    const hasAccess = await ensureCampaignMemberAccess(campaignId, id)
    if (!hasAccess) return reply.status(403).send({ message: 'Forbidden' })

    const campaign = await prismaAny.campaign.findUnique({
      where: { id: campaignId },
      include: {
        economy: true,
        characters: {
          include: {
            domain: true,
            henchmen: true
          }
        }
      }
    })

    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })

    let domainRevenue = 0
    let mercantileRevenue = 0
    let garrisonExpenses = 0
    let mercenaryExpenses = 0
    let specialistExpenses = 0
    let maintenanceExpenses = 0
    let stability = 0
    let loyalty = 0

    for (const ch of campaign.characters) {
      if (ch.domain) {
        domainRevenue += domainEconomy(ch.domain).gross
        mercantileRevenue += Number(ch.domain.eventModifier || 0)
        garrisonExpenses += Number(ch.domain.garrisonCost || 0)
        maintenanceExpenses += Number(ch.domain.maintenanceCost || 0) + Number(ch.domain.civilExpenses || 0)
          + Number(ch.domain.constructionCosts || 0) + Number(ch.domain.liturgiesCost || 0) + Number(ch.domain.titheCost || 0)
        mercenaryExpenses += Number(ch.domain.mercenaryPayroll || 0)
        specialistExpenses += Number(ch.domain.specialistPayroll || 0)
        stability += Number(ch.domain.stability || 0)
        loyalty += Number(ch.domain.loyalty || 0)
      }

      for (const h of ch.henchmen) {
        const role = (h.roleType || '').toLowerCase()
        const wage = Number(h.wage || 0)
        if (role === 'mercenary') mercenaryExpenses += wage
        else if (role === 'specialist') specialistExpenses += wage
        else maintenanceExpenses += wage
      }
    }

    const grossRevenue = domainRevenue + mercantileRevenue
    const expensesTotal = garrisonExpenses + mercenaryExpenses + specialistExpenses + maintenanceExpenses
    const consolidatedBalance = grossRevenue - expensesTotal
    const size = Math.max(1, campaign.characters.length)
    const avgStability = Math.round(stability / size)
    const avgLoyalty = Math.round(loyalty / size)

    const persisted = campaign.economy
      ? await prismaAny.campaignEconomy.update({
          where: { campaignId },
          data: {
            grossRevenue,
            domainRevenue,
            mercantileRevenue,
            expensesTotal,
            garrisonExpenses,
            mercenaryExpenses,
            specialistExpenses,
            maintenanceExpenses,
            stability: avgStability,
            loyalty: avgLoyalty,
            consolidatedBalance
          }
        })
      : await prismaAny.campaignEconomy.create({
          data: {
            campaignId,
            grossRevenue,
            domainRevenue,
            mercantileRevenue,
            expensesTotal,
            garrisonExpenses,
            mercenaryExpenses,
            specialistExpenses,
            maintenanceExpenses,
            stability: avgStability,
            loyalty: avgLoyalty,
            consolidatedBalance
          }
        })

    return persisted
  })

  // PATCH CAMPAIGN ECONOMY (Master only)
  app.put('/:id/economy', { preHandler: [economyRateLimit], schema: { body: { type: 'object', additionalProperties: false, properties: {
    monthlyEvent: { type: 'string', maxLength: 200 }, notes: { type: 'string', maxLength: 2000 },
    stability: { type: 'integer', minimum: -1000, maximum: 1000 }, loyalty: { type: 'integer', minimum: -1000, maximum: 1000 },
  } } } }, async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id, role } = request.user as any
    const body = request.body as any
    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })

    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })
    if (!canManageCampaign(campaign, { id, role })) return reply.status(403).send({ message: 'Only master can update economy' })

    if (body.stability !== undefined && !Number.isFinite(Number(body.stability))) {
      return reply.status(400).send({ message: 'stability must be numeric' })
    }
    if (body.loyalty !== undefined && !Number.isFinite(Number(body.loyalty))) {
      return reply.status(400).send({ message: 'loyalty must be numeric' })
    }
    if (body.monthlyEvent !== undefined && normalizedText(body.monthlyEvent).length > 200) {
      return reply.status(400).send({ message: 'monthlyEvent must be at most 200 characters' })
    }
    if (body.notes !== undefined && normalizedText(body.notes).length > 2000) {
      return reply.status(400).send({ message: 'notes must be at most 2000 characters' })
    }

    const economy = await prismaAny.campaignEconomy.upsert({
      where: { campaignId },
      update: {
        ...(body.monthlyEvent !== undefined && { monthlyEvent: String(body.monthlyEvent || '') }),
        ...(body.notes !== undefined && { notes: String(body.notes || '') }),
        ...(body.stability !== undefined && { stability: Number(body.stability || 0) }),
        ...(body.loyalty !== undefined && { loyalty: Number(body.loyalty || 0) })
      },
      create: {
        campaignId,
        monthlyEvent: String(body.monthlyEvent || ''),
        notes: String(body.notes || ''),
        stability: Number(body.stability || 0),
        loyalty: Number(body.loyalty || 0)
      }
    })

    return economy
  })

  // LIST ACTIVITY QUEUE
  app.get('/:id/activities', async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id } = request.user as any
    const hasAccess = await ensureCampaignMemberAccess(campaignId, id)
    if (!hasAccess) return reply.status(403).send({ message: 'Forbidden' })

    const activities = await prismaAny.campaignActivity.findMany({
      where: { campaignId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    })
    return activities
  })

  // CREATE ACTIVITY
  app.post('/:id/activities', { schema: { body: activityBodySchema }, preHandler: [activityCreateRateLimit] }, async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id, role } = request.user as any
    const body = request.body as any
    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })

    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })
    if (!canManageCampaign(campaign, { id, role })) return reply.status(403).send({ message: 'Only master can enqueue activities' })

    const title = normalizedText(body.title || 'New Activity')
    if (!title) return reply.status(400).send({ message: 'Activity title is required' })
    if (title.length > 120) return reply.status(400).send({ message: 'Activity title must be at most 120 characters' })

    const type = normalizedText(body.type || 'downtime').toLowerCase()
    if (!ACTIVITY_TYPES.has(type)) {
      return reply.status(400).send({ message: 'Invalid activity type' })
    }

    const status = normalizedText(body.status || 'QUEUED').toUpperCase()
    if (!ACTIVITY_STATUSES.has(status)) {
      return reply.status(400).send({ message: 'Invalid activity status' })
    }

    const costGp = Math.max(0, toSafeNumber(body.costGp, 0))
    if (!Number.isFinite(costGp)) return reply.status(400).send({ message: 'costGp must be numeric' })

    const durationWeeks = Math.max(1, Number(body.durationWeeks) || 1)
    if (!Number.isFinite(Number(body.durationWeeks ?? durationWeeks))) {
      return reply.status(400).send({ message: 'durationWeeks must be numeric' })
    }
    const activity = await prismaAny.campaignActivity.create({
      data: {
        campaignId,
        type,
        title,
        details: String(body.details || '').substring(0, 3000),
        costGp,
        durationWeeks,
        remainingWeeks: durationWeeks,
        status,
        impactSummary: String(body.impactSummary || '').substring(0, 500)
      }
    })

    return reply.status(201).send(activity)
  })

  // RESOLVE ONE WEEK OF AN ACTIVITY
  app.post('/:id/activities/:activityId/resolve', { preHandler: [activityResolveRateLimit] }, async (request, reply) => {
    const { id: campaignId, activityId } = request.params as { id: string; activityId: string }
    const { id, role } = request.user as any
    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })
    if (!canManageCampaign(campaign, { id, role })) return reply.status(403).send({ message: 'Only master can resolve activities' })

    const activity = await prismaAny.campaignActivity.findFirst({ where: { id: activityId, campaignId } })
    if (!activity) return reply.status(404).send({ message: 'Activity not found' })

    const remainingWeeks = Math.max(0, activity.remainingWeeks - 1)
    const status = remainingWeeks === 0 ? 'COMPLETED' : 'ACTIVE'
    const updated = await prismaAny.campaignActivity.update({
      where: { id: activity.id },
      data: { remainingWeeks, status }
    })
    return updated
  })

  // ADVANCE CALENDAR (week/month), auto-resolving queue
  app.post('/:id/calendar/advance', { preHandler: [calendarAdvanceRateLimit], schema: { body: { type: 'object', additionalProperties: false, required: ['mode'], properties: { mode: { type: 'string', enum: ['week', 'month'] } } } } }, async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id, role } = request.user as any
    const { mode } = request.body as { mode?: 'week' | 'month' }

    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })
    if (!canManageCampaign(campaign, { id, role })) return reply.status(403).send({ message: 'Only master can advance calendar' })

    const stepWeeks = mode === 'month' ? 4 : 1
    if (mode !== 'week' && mode !== 'month') return reply.code(400).send({ message: 'Escolha week ou month.' })
    try {
      return await prismaAny.$transaction((tx: any) => advanceCampaignCalendar(tx, campaign, stepWeeks))
    } catch (e) {
      if (e instanceof Error && e.message === 'CALENDAR_CONFLICT') return reply.code(409).send({ message: 'O calendário mudou. Atualize antes de avançar novamente.' })
      throw e
    }
  })

  // JOIN CAMPAIGN (Player -> Pending)
  app.post('/join', { schema: { body: joinBodySchema }, preHandler: [joinRateLimit] }, async (request, reply) => {
    const { joinCode } = request.body as { joinCode: string }
    const normalizedJoinCode = normalizedText(joinCode).toUpperCase()
    if (!JOIN_CODE_RE.test(normalizedJoinCode)) {
      return reply.status(400).send({ message: 'Join code must contain 6 characters' })
    }
    const { id } = request.user as any
    
    const campaign = await prismaAny.campaign.findUnique({ where: { joinCode: normalizedJoinCode } })
    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })

    const existing = await prismaAny.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId: campaign.id, userId: id } }
    })
    
    if (existing) {
      return reply.status(400).send({ message: 'Already requested or a member' })
    }

    const member = await prismaAny.campaignMember.create({
      data: {
        campaignId: campaign.id,
        userId: id,
        status: 'PENDING'
      }
    })
    return reply.status(201).send(member)
  })

  // GET CAMPAIGN INVITES (Master only)
  app.get('/:id/invites', async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id } = request.user as any

    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })
    if (campaign?.masterId !== id) {
      return reply.status(403).send({ message: 'Only the master can view invites' })
    }

    const invites = await prismaAny.campaignMember.findMany({
      where: { campaignId, status: 'PENDING' },
      include: { user: { select: { username: true } } }
    })
    return invites
  })

  // GET CAMPAIGN MEMBERS
  app.get('/:id/members', async (request, reply) => {
    const { id: campaignId } = request.params as { id: string }
    const { id } = request.user as any

    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return reply.status(404).send()

    const hasAccess = await ensureCampaignMemberAccess(campaignId, id)
    if (!hasAccess) return reply.status(403).send({ message: 'Forbidden' })

    // Master or members can view members conceptually, but for now we'll just require authentication
    const members = await prismaAny.campaignMember.findMany({
      where: { campaignId, status: 'ACCEPTED' },
      include: { user: { select: { username: true } } }
    })
    return members
  })

  // RESOLVE INVITE (Master only)
  app.put('/:id/invites/:userId', { schema: { body: inviteResolveBodySchema }, preHandler: [invitesResolveRateLimit] }, async (request, reply) => {
    const { id: campaignId, userId } = request.params as { id: string; userId: string }
    const { status } = request.body as { status: 'ACCEPTED' | 'REJECTED' }
    const { id, role } = request.user as any
    if (status !== 'ACCEPTED' && status !== 'REJECTED') {
      return reply.status(400).send({ message: 'Invalid invite status' })
    }

    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign || !canManageCampaign(campaign, { id, role })) {
      return reply.status(403).send({ message: 'Only the master can resolve invites' })
    }

    const member = await prismaAny.campaignMember.update({
      where: { campaignId_userId: { campaignId, userId } },
      data: { status }
    })
    return member
  })

  // LEAVE OR KICK OUT OF CAMPAIGN
  app.delete('/:id/members/:userId', async (request, reply) => {
    const { id: campaignId, userId } = request.params as { id: string; userId: string }
    const { id } = request.user as any

    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return reply.status(404).send({ message: 'Campaign not found' })

    const isMaster = campaign.masterId === id
    const isSelf = id === userId

    if (!isMaster && !isSelf) {
      return reply.status(403).send({ message: 'Forbidden' })
    }

    await prismaAny.campaignMember.delete({
      where: { campaignId_userId: { campaignId, userId } }
    })
    return reply.send({ message: 'Member removed' })
  })

  // GET CAMPAIGN AUDIT LOGS
  app.get('/:id/audit', { schema: { querystring: { type: 'object', additionalProperties: false, properties: {
    page: { type: 'string', pattern: '^(?:[1-9][0-9]{0,2}|1000)$' }, action: { type: 'string', pattern: '^[A-Z_]+$', maxLength: 80 },
  } } } }, async (request, reply) => {
    const { id: campaignId } = request.params as { id: string };
    const { id } = request.user as any;
    const campaign = await prismaAny.campaign.findUnique({ where: { id: campaignId } });
    if (campaign?.masterId !== id) {
      return reply.status(403).send({ message: 'Only master can view logs' });
    }
    const query = request.query as { page?: string; action?: string };
    const page = query.page ? Number(query.page) : undefined;
    const where = { campaignId, ...(query.action && { action: query.action }) };
    const logs = await prismaAny.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page ? 25 : 50,
      ...(page && { skip: (page - 1) * 25 }),
      include: { character: { select: { characterName: true } }, user: { select: { username: true } } }
    });
    if (!query.page) return logs;
    const total = await prismaAny.auditLog.count({ where });
    return { items: logs, total, page, pages: Math.max(1, Math.ceil(total / 25)) };
  });
}

