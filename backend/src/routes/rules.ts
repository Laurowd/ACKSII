import { FastifyInstance } from 'fastify'
import { authGuard } from '../middleware/auth'
import rulesCompendiumData from '../data/rules_compendium.json'

const rulesCompendium = rulesCompendiumData as Array<{
  chapter: string
  heading: string
  content: string
}>

export async function rulesRoutes(fastify: FastifyInstance) {
  // Protected routes require authentication
  fastify.addHook('preHandler', authGuard)

  fastify.get('/search', async (request, reply) => {
    const { q, limit = '20' } = request.query as { q?: string, limit?: string }
    
    if (!q || q.trim() === '') {
      return []
    }

    const searchQuery = q.toLowerCase()
    const parsedLimit = Number.parseInt(limit, 10)
    const limitNum = Math.min(100, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 20))

    const matches = rulesCompendium.filter(rule => {
      // Basic free-text search match
      return rule.heading.toLowerCase().includes(searchQuery) ||
             rule.content.toLowerCase().includes(searchQuery)
    })

    // Sort: Headings that match the query exactly get priority, then headings that contain it
    matches.sort((a, b) => {
      const aHead = a.heading.toLowerCase()
      const bHead = b.heading.toLowerCase()
      
      const aExact = aHead === searchQuery
      const bExact = bHead === searchQuery
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      const aStartsWith = aHead.startsWith(searchQuery)
      const bStartsWith = bHead.startsWith(searchQuery)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      
      const aContains = aHead.includes(searchQuery)
      const bContains = bHead.includes(searchQuery)
      if (aContains && !bContains) return -1
      if (!aContains && bContains) return 1
      
      return 0
    })

    return matches.slice(0, limitNum)
  })
}
