const identity = () => {
  cy.button('Continuar').click()
  cy.findByLabelText(/^Classe/).select('catalog:fighter')
  cy.button('Continuar').click()
  cy.field('Nome').type('Cypress Fighter')
}
const proficiencies = () => {
  cy.button('+ Proficiência').click()
  cy.findAllByLabelText('Nome da proficiência').eq(0).type('Combat Reflexes')
  cy.findAllByLabelText('Categoria', { exact: true }).eq(0).select('class')
  cy.button('+ Proficiência').click()
  cy.findAllByLabelText('Nome da proficiência').eq(1).type('Manual of Arms')
}

describe('Criação guiada', () => {
  beforeEach(() => cy.makeUser('MASTER').as('account'))

  it('aguarda campanhas e catálogo antes de habilitar Continuar', function () {
    cy.intercept('GET', '/api/campaigns', req => req.on('response', res => res.setDelay(1500))).as('campaigns')
    cy.intercept('GET', '/api/game-rules/metadata').as('metadata')
    cy.signIn(this.account, '/characters/new')
    cy.wait('@metadata')
    cy.findByText('Carregando regras e equipamentos...', { exact: true }).should('not.exist')
    cy.button('Continuar').should('be.disabled')
    cy.wait('@campaigns')
    cy.button('Continuar').should('be.enabled').click()
    cy.findByLabelText(/^Classe/).should('be.visible')
  })

  it('cria Fighter do catálogo com proficiências e orçamento conferido', function () {
    cy.signIn(this.account, '/characters/new')
    identity()
    proficiencies()
    cy.button('Continuar').click()
    cy.findByLabelText(/Comprar com orçamento/).check()
    for (const [index, entry] of ['i-horse-riding', 'w-crossbow'].entries()) {
      cy.button('+ Comprar equipamento').click()
      cy.findAllByRole('combobox', { name: 'Equipamento comprado', exact: true }).eq(index).select(entry)
    }
    cy.button('Continuar').click()
    cy.findByRole('alert').should('contain.text', 'excedem o ouro inicial em 5.00 GP')
    cy.field('Ouro inicial').clear().type('110')
    cy.button('Continuar').click()
    cy.contains('1 × Horse, Riding — 75.00 GP').should('be.visible')
    cy.contains('1 × Crossbow — 30.00 GP').should('be.visible')
    cy.intercept('POST', '/api/characters/guided').as('create')
    cy.button('Confirmar e abrir ficha').click()
    cy.wait('@create').then(({ response }) => {
      expect(response.statusCode).to.eq(201)
      const c = response.body.character
      cy.api(this.account, 'GET', `/characters/${c.id}`).its('character').then(stored => {
        expect(stored.coinGP).to.eq(5)
        expect(stored.items.some(i => i.name === 'Horse, Riding')).to.eq(true)
        expect(stored.weapons.some(i => i.catalogId === 'w-crossbow')).to.eq(true)
      })
    })
    cy.location('pathname').should('match', /^\/character\//)
  })

  it('impede avançar sem as proficiências obrigatórias', function () {
    cy.signIn(this.account, '/characters/new')
    identity()
    cy.button('Continuar').click()
    cy.findByRole('alert').should('contain.text', 'ao menos uma proficiência de classe e geral')
    cy.findByRole('heading', { name: 'Identidade e escolhas iniciais' }).should('be.visible')
  })

  it('exige decisão do mestre no modo manual', function () {
    cy.signIn(this.account, '/characters/new')
    cy.field('Modo de criação').select('manual')
    cy.button('Continuar').click()
    cy.findByLabelText(/^Classe/).select('catalog:fighter')
    cy.button('Continuar').click()
    cy.findByRole('alert').should('contain.text', 'Registre a decisão do mestre')
  })

  it('rejeita atributos e orçamento inválidos também na API', function () {
    const body = { characterName: 'Invalid', classKey: 'catalog:fighter', str: 2, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6 }
    cy.api(this.account, 'POST', '/characters/guided', body, 400)
    cy.api(this.account, 'POST', '/characters/guided', { ...body, str: 10, startingGoldGp: 100,
      purchases: [{ entryId: 'i-horse-riding', quantity: 1 }, { entryId: 'w-crossbow', quantity: 1 }] }, 400)
  })
})
