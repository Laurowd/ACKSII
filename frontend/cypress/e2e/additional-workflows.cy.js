import { mutateCharacter } from '../support/characterMutations'

const freeClass = {
  name: 'Fighter', hitDie: '1d8', conBonus: true, xpPerLevel: [0, 2000],
  titles: ['Veteran', 'Warrior'], attackThrows: [10, 9],
  savingThrows: Array.from({ length: 2 }, () => ({ death: 14, paralysis: 15, blast: 16, implements: 17, spells: 18 })),
}
describe('Classes livres, consulta e operações complementares', () => {
  beforeEach(() => cy.makeUser('MASTER').as('account'))

  it('edita e remove uma classe livre; rejeita tabelas inconsistentes (API)', function () {
    cy.api(this.account, 'POST', '/campaigns', { name: 'Custom classes' }, 201).then(campaign => {
      const path = `/classes/${campaign.id}`
      cy.api(this.account, 'POST', path, { ...freeClass, titles: [] }, 400)
      cy.api(this.account, 'POST', path, freeClass, 201).then(klass => {
        cy.api(this.account, 'PUT', `${path}/${klass.id}`, { ...freeClass, name: 'Veteran' }).its('name').should('eq', 'Veteran')
        cy.api(this.account, 'GET', path).should('have.length', 1)
        cy.api(this.account, 'DELETE', `${path}/${klass.id}`)
        cy.api(this.account, 'GET', path).should('have.length', 0)
      })
    })
  })

  it('identifica Fighter livre e exige aprovação manual antes de criar', function () {
    cy.api(this.account, 'POST', '/campaigns', { name: 'Manual creation' }, 201).then(campaign => {
      cy.api(this.account, 'POST', `/classes/${campaign.id}`, freeClass, 201).then(klass => {
        cy.signIn(this.account, `/characters/new?campaignId=${campaign.id}`)
        cy.button('Continuar').click()
        cy.findByLabelText(/^Classe/).select(klass.id)
        cy.button('Continuar').click()
        cy.findByRole('alert').should('contain.text', 'exige modo manual')
        cy.button('Usar ajustes aprovados pelo mestre').click()
        cy.button('Continuar').click()
        cy.findByRole('alert').should('contain.text', 'Registre a decisão do mestre')
        cy.findByLabelText(/^Decisão do mestre/).type('Approved for this test campaign')
        cy.button('Continuar').click()
        cy.field('Nome').type('Lief Cypress')
        cy.findByLabelText(/^PV iniciais/).clear().type('8')
        cy.button('Continuar').click()
        cy.button('Continuar').click()
        cy.intercept('POST', '/api/characters/guided').as('create')
        cy.button('Confirmar e abrir ficha').click()
        cy.wait('@create').then(({ response }) => {
          expect(response.statusCode).to.eq(201)
          expect(response.body.character.classKey).to.eq(klass.id)
          expect(JSON.parse(response.body.character.rulesState).creationMode).to.eq('manual')
        })
        cy.api(this.account, 'DELETE', `/classes/${campaign.id}/${klass.id}`, undefined, 409)
      })
    })
  })

  it('consulta regras reais e navega pelas tabelas do mestre', function () {
    cy.signIn(this.account, '/dashboard/judge')
    cy.button('Consultar regras').click()
    cy.intercept('GET', '/api/rules/search*').as('search')
    cy.field('Pesquisar regras').type('Morale')
    cy.wait('@search').its('response.statusCode').should('eq', 200)
    cy.get('.markdown-body').should('have.length.greaterThan', 0)
    cy.button('Morale').click()
    cy.findByRole('heading', { name: 'Morale Rolls (2d6)' }).should('be.visible')
    cy.button('Combat & Init').click()
    cy.findByRole('heading', { name: 'Initiative (1d6)' }).should('be.visible')
    cy.button('Reactions').click()
    cy.findByRole('heading', { name: 'Encounter Reactions (2d6)' }).should('be.visible')
  })

  it('salva configurações, economia e resolve atividade individual (API)', function () {
    cy.api(this.account, 'POST', '/campaigns', { name: 'Economy' }, 201).then(c => {
      const path = `/campaigns/${c.id}`
      cy.api(this.account, 'PUT', `${path}/settings`, { currentYear: 2, currentMonth: 12, currentWeek: 4, optionalRules: { enableActivityQueue: true } })
      cy.api(this.account, 'GET', `${path}/settings`).should('include', { currentYear: 2, currentMonth: 12, currentWeek: 4 })
      cy.api(this.account, 'PUT', `${path}/economy`, { notes: 'Fair', monthlyEvent: 'Harvest', stability: 2 })
      cy.api(this.account, 'GET', `${path}/economy`).should('include', { notes: 'Fair', monthlyEvent: 'Harvest' })
      cy.api(this.account, 'POST', `${path}/activities`, { title: 'Travel', type: 'travel', durationWeeks: 1 }, 201).then(activity => {
        cy.api(this.account, 'POST', `${path}/activities/${activity.id}/resolve`, {}).its('status').should('eq', 'COMPLETED')
      })
    })
  })

  it('fecha aventura uma vez, rejeita o atalho de XP e invalida versões antigas (API)', function () {
    cy.character(this.account).then(c => {
      const path = `/characters/${c.id}`
      const award = { awardId: 'Cypress treasure', gp: 100, sp: 0, cp: 0 }
      cy.api(this.account, 'POST', `${path}/treasure/convert-xp`, award, 409).its('code').should('eq', 'USE_ADVENTURE_SETTLEMENT')
      const settlement = { awardId: award.awardId, treasureGp: 100, participants: [{ id: c.id, version: c.version, share: 1 }] }
      cy.api(this.account, 'POST', '/game-rules/adventures/apply', settlement)
      cy.api(this.account, 'GET', path).its('character').then(current => {
        cy.api(this.account, 'POST', '/game-rules/adventures/apply', { ...settlement, participants: [{ id: c.id, version: current.version, share: 1 }] }, 409)
      })
      cy.api(this.account, 'PUT', path, { version: c.version, xp: 0 }, 409)
      cy.api(this.account, 'GET', path).its('character').should('include', { xp: 100, coinGP: 100 })
      mutateCharacter(this.account, 'POST', `${path}/maintenance/recalculate`)
    })
  })

  it('venda rejeita versão antiga sem alterações e não pode ser creditada duas vezes (API)', function () {
    cy.character(this.account).then(c => {
      const path = `/characters/${c.id}`
      mutateCharacter(this.account, 'POST', `${path}/mercantile`, { cargoName: 'Silk', baseValueGp: 100, originMarketClass: 4, destMarketClass: 2 }, 201).its('venture').then(venture => {
        const sale = `${path}/mercantile/${venture.id}/sell`
        cy.api(this.account, 'POST', sale, { version: 100 }, 409)
        cy.api(this.account, 'GET', path).its('character').then(stored => {
          expect(stored.coinGP).to.eq(100)
          expect(stored.mercantileVentures[0].status).to.eq('IN_TRANSIT')
        })
        mutateCharacter(this.account, 'POST', sale).then(result => {
          expect(result.character.coinGP).to.eq(220)
          cy.api(this.account, 'POST', sale, { version: result.character.version }, 409)
          // Manual status edits must not allow crediting the same cargo again.
          mutateCharacter(this.account, 'PUT', `${path}/mercantile/${venture.id}`, { status: 'IN_TRANSIT' }, 400)
          mutateCharacter(this.account, 'POST', sale, {}, 409)
          cy.api(this.account, 'GET', path).its('character.coinGP').should('eq', 220)
        })
      })
    })
  })
})
