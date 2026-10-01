describe('Campanhas, classes e mestre', () => {
  beforeEach(() => cy.makeUser('MASTER').as('master'))

  it('cria campanha pela interface móvel sem duplicar o envio', function () {
    cy.viewport(390, 844)
    cy.signIn(this.master, '/campaigns')
    cy.button('+ Nova Campanha').click()
    cy.field('Nome da campanha').type('Cypress campaign')
    cy.intercept('POST', '/api/campaigns', req => req.on('response', res => res.setDelay(500))).as('create')
    cy.button('Criar').click()
    cy.button('Criando…').should('be.disabled')
    cy.wait('@create').its('response.statusCode').should('eq', 201)
    cy.findByRole('heading', { name: 'Cypress campaign' }).should('be.visible')
    cy.document().its('documentElement.scrollWidth').should('be.lte', 390)
    cy.get('@create.all').should('have.length', 1)
  })

  it('solicita ingresso, aprova, atribui ficha e remove membro (API)', function () {
    cy.makeUser().then(player => {
      cy.api(this.master, 'POST', '/campaigns', { name: 'Membership' }, 201).then(campaign => {
        const path = `/campaigns/${campaign.id}`
        cy.api(player, 'POST', '/campaigns/join', { joinCode: campaign.joinCode }, 201).its('status').should('eq', 'PENDING')
        cy.api(player, 'GET', `${path}/members`, undefined, 403)
        cy.api(this.master, 'GET', `${path}/invites`).should('have.length', 1)
        cy.api(this.master, 'PUT', `${path}/invites/${player.user.id}`, { status: 'ACCEPTED' })
        cy.api(player, 'GET', `${path}/members`).then(members => expect(members.map(member => member.userId)).to.include(player.user.id))
        cy.character(player).then(c => {
          cy.api(player, 'PUT', `/characters/${c.id}/assignment`, { campaignId: campaign.id })
          cy.api(this.master, 'GET', `/characters/${c.id}`).its('character.campaignId').should('eq', campaign.id)
        })
        cy.api(player, 'POST', `${path}/calendar/advance`, { mode: 'week' }, 403)
        cy.api(this.master, 'DELETE', `${path}/members/${player.user.id}`)
        cy.api(player, 'GET', `${path}/members`, undefined, 403)
      })
    })
  })

  it('avança calendário pela interface e conclui atividades', function () {
    cy.api(this.master, 'POST', '/campaigns', { name: 'Calendar' }, 201).then(campaign => {
      cy.api(this.master, 'POST', `/campaigns/${campaign.id}/activities`, { title: 'Build bridge', durationWeeks: 1, status: 'ACTIVE' }, 201)
      cy.signIn(this.master, `/campaigns/${campaign.id}/manage`)
      cy.intercept('POST', `/api/campaigns/${campaign.id}/calendar/advance`).as('calendar')
      cy.button('Avançar Semana').click()
      cy.wait('@calendar').its('response.statusCode').should('eq', 200)
      cy.api(this.master, 'GET', `/campaigns/${campaign.id}/settings`).its('currentWeek').should('eq', 2)
      cy.api(this.master, 'GET', `/campaigns/${campaign.id}/activities`).then(rows => {
        expect(rows.find(row => row.title === 'Build bridge').status).to.eq('COMPLETED')
      })
      cy.button('Avançar Mês').click()
      cy.wait('@calendar').its('response.statusCode').should('eq', 200)
      cy.api(this.master, 'GET', `/campaigns/${campaign.id}/settings`).its('currentMonth').should('eq', 2)
    })
  })

  it('cria classe por pontos com progressão revisada', function () {
    cy.api(this.master, 'POST', '/campaigns', { name: 'Builder' }, 201).then(campaign => {
      cy.signIn(this.master, `/campaigns/${campaign.id}/manage`)
      cy.findByText('Construir classe por pontos', { exact: true }).click()
      cy.contains('details', 'Construir classe por pontos').within(() => {
        cy.field('Nome').clear().type('Reviewed Fighter')
        cy.button('Conferir construção').click()
        cy.contains('Salva como Fighter').should('be.visible')
        cy.button('Criar classe na campanha').click()
        cy.findByRole('status').should('contain.text', 'Classe criada')
      })
      cy.api(this.master, 'GET', `/classes/${campaign.id}`).then(classes => {
        const c = classes.find(c => c.name === 'Reviewed Fighter')
        expect(JSON.parse(c.xpPerLevel)[1]).to.eq(2000)
        expect(JSON.parse(c.creationRules).rules.levels).to.have.length(14)
      })
    })
  })

  it('filtra catálogo e abre criação com a classe escolhida', function () {
    cy.signIn(this.master, '/classes')
    cy.field('Buscar classe').type('Fighter')
    cy.findByRole('button', { name: /Catálogo base Fighter/ }).click()
    cy.findByRole('table').should('be.visible')
    cy.findByRole('link', { name: 'Criar personagem desta classe' }).click()
    cy.location('pathname').should('eq', '/characters/new')
    cy.location('search').should('contain', 'classKey=catalog')
  })

  it('impede jogador de criar campanha e mestre de administrar campanha alheia (API)', function () {
    cy.makeUser().then(player => cy.api(player, 'POST', '/campaigns', { name: 'Forbidden' }, 403))
    cy.makeUser('MASTER').then(other => {
      cy.api(this.master, 'POST', '/campaigns', { name: 'Private' }, 201).then(c => {
        cy.api(other, 'PUT', `/campaigns/${c.id}/economy`, { notes: 'Unauthorized' }, 403)
        cy.api(other, 'GET', `/campaigns/${c.id}/audit`, undefined, 403)
        cy.api(other, 'POST', `/campaigns/${c.id}/calendar/advance`, { mode: 'week' }, 403)
      })
    })
  })
})
