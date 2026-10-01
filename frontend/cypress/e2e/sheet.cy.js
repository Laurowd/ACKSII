describe('Ficha, persistência e componentes', () => {
  beforeEach(() => cy.makeUser().then(account => {
    cy.wrap(account, { log: false }).as('account')
    cy.character(account, { classKey: 'catalog:mage', int: 16, hpMax: 4,
      spells: [{ name: 'Slumber', level: 1, tradition: 'arcane' }],
    }).as('character')
  }))

  it('compra equipamento, salva, recarrega e trata conflito de edição', function () {
    const path = `/characters/${this.character.id}`
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.button('Inventário & Tesouro').click()
    cy.findByRole('button', { name: /Loja/ }).click()
    cy.intercept('POST', '/api/characters/*/shop/purchase').as('purchase')
    cy.get('[title="Torches (6)"]').parent().parent().within(() => cy.button('BUY').click())
    cy.wait('@purchase').its('response.statusCode').should('eq', 201)
    cy.intercept('PUT', `/api${path}`).as('save')
    cy.button('Salvar').click()
    cy.wait('@save').its('response.statusCode').should('eq', 200)
    cy.reload()
    cy.button('Salvar').should('be.visible')
    cy.api(this.account, 'GET', path).its('character').then(c => {
      expect(c.coinGP).to.eq(99)
      cy.api(this.account, 'PUT', path, { version: c.version, notes: 'External change' })
    })
    cy.button('Salvar').click()
    cy.wait('@save').its('response.statusCode').should('eq', 409)
    cy.findByRole('alert').should('contain.text', 'A ficha mudou')
    cy.button('Exportar minhas alterações').should('be.visible')
    cy.button('Carregar versão atual').click()
    cy.findByRole('alert').should('not.exist')
  })

  it('exporta JSON e ficha imprimível sem dados de autenticação', function () {
    const contents = []
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.window().then(win => {
      const original = win.URL.createObjectURL.bind(win.URL)
      cy.stub(win.URL, 'createObjectURL').callsFake(blob => {
        contents.push(blob.text())
        return original(blob)
      }).as('download')
    })
    cy.button('Exportar JSON').click()
    cy.get('@download').should('have.been.calledOnce')
    cy.button('Ficha para impressão/PDF').click()
    cy.get('@download').should('have.been.calledTwice')
    cy.then(() => Promise.all(contents)).then(texts => {
      expect(texts).to.have.length(2)
      for (const text of texts) {
        expect(text).to.contain(this.character.characterName)
        expect(text).not.to.contain('passwordHash').and.not.to.contain(this.account.token)
      }
      expect(JSON.parse(texts[0])).to.be.an('object')
      expect(texts[1].toLowerCase()).to.contain('<!doctype html>')
    })
  })

  it('salva automaticamente edições de combate e preserva a última alteração', function () {
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.intercept('PUT', `/api/characters/${this.character.id}`).as('autosave')
    cy.contains('label', 'Character Name').parent().find('input').clear().type('Edited character').blur()
    cy.contains('label', 'HP Atual').parent().find('input').clear().type('2').blur()
    cy.wait('@autosave').its('response.statusCode').should('eq', 200)
    cy.reload()
    cy.contains('label', 'Character Name').parent().find('input').should('have.value', 'Edited character')
    cy.contains('label', 'HP Atual').parent().find('input').should('have.value', '2')
    cy.api(this.account, 'GET', `/characters/${this.character.id}`).its('character').should('include', { characterName: 'Edited character', hpCurr: 2 })
  })

  it('mostra nomes nas sugestões de magias e persiste a escolha', function () {
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.button('Magia').click()
    cy.get('#acks-spell-compendium-1 option').should('have.length.greaterThan', 1).each(option => {
      expect(option.attr('label')).to.eq(option.val())
      expect(option.text().trim()).to.eq('')
    })
    cy.intercept('PUT', '/api/characters/*/spells/*').as('spell')
    cy.findByRole('combobox', { name: 'Magia de nível 1', exact: true }).clear().type('Arcane Armor').blur()
    cy.wait('@spell').its('response.statusCode').should('eq', 200)
    cy.reload()
    cy.button('Magia').click()
    cy.findByRole('combobox', { name: 'Magia de nível 1', exact: true }).should('have.value', 'Arcane Armor')
    cy.intercept('PUT', '/api/characters/*/spells/*', { statusCode: 503, body: { error: 'Falha simulada ao salvar magia.' } })
    cy.findByRole('combobox', { name: 'Magia de nível 1', exact: true }).clear().type('Slumber').blur()
    cy.findByRole('alert').should('contain.text', 'Falha simulada ao salvar magia.')
  })

  it('mostra ajuda somente no acionador e fecha com Escape', function () {
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.button('Magia').click()
    cy.findByText('Library Value', { exact: true }).trigger('mouseenter')
    cy.findByRole('tooltip').should('not.exist')
    cy.button('Ajuda: Library Value').focus()
    cy.findByRole('tooltip').should('contain.text', 'biblioteca arcana')
    cy.button('Ajuda: Library Value').trigger('keydown', { key: 'Escape' })
    cy.findByRole('tooltip').should('not.exist')
  })

  it('mantém ajuda dentro da tela móvel', function () {
    cy.viewport(390, 844)
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.button('Magia').click()
    cy.button('Ajuda: Workshop Value').click()
    cy.findByRole('tooltip').should('be.visible').then(tip => {
      const bounds = tip[0].getBoundingClientRect()
      expect(bounds.left).to.be.at.least(0)
      expect(bounds.right).to.be.at.most(390)
    })
    cy.document().its('documentElement.scrollWidth').should('be.lte', 390)
    cy.field('Workshop Value').click()
    cy.findByRole('tooltip').should('not.exist')
  })

  it('cria, edita e remove uma atividade pela interface', function () {
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.button('Atividades e Downtime').click()
    cy.button('+ Nova Atividade').click()
    cy.intercept('PUT', '/api/characters/*/activities/*').as('activity')
    cy.findByPlaceholderText('Ex: Pesquisar Fireball').clear().type('Treinar navegação').blur()
    cy.wait('@activity').its('response.statusCode').should('eq', 200)
    cy.reload()
    cy.button('Atividades e Downtime').click()
    cy.findByPlaceholderText('Ex: Pesquisar Fireball').should('have.value', 'Treinar navegação')
    cy.button('Remover').click()
    cy.findByPlaceholderText('Ex: Pesquisar Fireball').should('not.exist')
  })

  it('persiste seguidores, exércitos e domínio pela interface', function () {
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.button('Domínio & Seguidores').click()
    cy.intercept('PUT', '/api/characters/*/henchmen/*').as('henchman')
    cy.button('+ Add').click()
    cy.findByPlaceholderText('Name', { exact: true }).type('Retainer').blur()
    cy.wait('@henchman').its('response.statusCode').should('eq', 200)
    cy.button('+ Add Unit').click()
    cy.intercept('PUT', '/api/characters/*/armyUnits/*').as('army')
    cy.findByPlaceholderText('Unit Name').type('Guard').blur()
    cy.wait('@army').its('response.statusCode').should('eq', 200)
    cy.intercept('PUT', '/api/characters/*/domain').as('domain')
    cy.findByPlaceholderText('e.g. Castle Black').type('Castle Cypress').blur()
    cy.wait('@domain').its('response.statusCode').should('eq', 200)
    cy.reload()
    cy.button('Domínio & Seguidores').click()
    cy.findByPlaceholderText('Name', { exact: true }).should('have.value', 'Retainer')
    cy.findByPlaceholderText('Unit Name').should('have.value', 'Guard')
    cy.findByPlaceholderText('e.g. Castle Black').should('have.value', 'Castle Cypress')
  })

  it('vende carga uma vez e persiste o saldo', function () {
    cy.signIn(this.account, `/character/${this.character.id}`)
    cy.button('Atividades e Downtime').click()
    cy.button('+ New Venture').click()
    cy.button('Sell').click()
    cy.contains('[role=status]', 'Carga vendida e saldo atualizado.').should('be.visible')
    cy.button('Sell').should('not.exist')
    cy.reload()
    cy.button('Atividades e Downtime').click()
    cy.button('Sell').should('not.exist')
    cy.api(this.account, 'GET', `/characters/${this.character.id}`).its('character').then(c => {
      expect(c.mercantileVentures[0].status).to.eq('SOLD')
      expect(c.coinGP).to.eq(200 + c.mercantileVentures[0].profitGp)
    })
  })

  it('exclui uma ficha e ela deixa de estar disponível', function () {
    cy.signIn(this.account)
    cy.findByRole('button', { name: `Excluir ${this.character.characterName}` }).click()
    cy.findByRole('link', { name: new RegExp(this.character.characterName) }).should('not.exist')
    cy.api(this.account, 'GET', `/characters/${this.character.id}`, undefined, 404)
  })
})
