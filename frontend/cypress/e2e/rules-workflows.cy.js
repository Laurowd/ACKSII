import { mutateCharacter } from '../support/characterMutations'

describe('Regras, magia e pesquisa', () => {
  beforeEach(() => cy.makeUser('MASTER').as('account'))

  it('adiciona proficiência válida e impede duplicação pela conferência de regras', function () {
    cy.character(this.account).then(c => {
      cy.signIn(this.account, `/character/${c.id}`)
      cy.button('Evolução & Regras').click()
      cy.findByPlaceholderText('Proficiência ou especialização').type('Combat Reflexes')
      cy.button('Adicionar escolha').click()
      cy.contains('[role=status]', 'Proficiência adicionada').should('be.visible')
      cy.api(this.account, 'GET', `/characters/${c.id}`).its('character.proficiencies').then(rows => expect(rows.some(row => row.name === 'Combat Reflexes')).to.eq(true))
      cy.findByPlaceholderText('Proficiência ou especialização').type('Combat Reflexes')
      cy.button('Adicionar escolha').click()
      cy.findByRole('alert').should('be.visible')
      cy.api(this.account, 'GET', `/characters/${c.id}`).its('character.proficiencies').then(rows => expect(rows.filter(row => row.name === 'Combat Reflexes')).to.have.length(1))
    })
  })

  it('valida e persiste o repertório sem aceitar magias inexistentes', function () {
    cy.character(this.account, { classKey: 'catalog:mage', int: 16, hpMax: 4,
      spells: [{ name: 'Slumber', level: 1, tradition: 'arcane' }],
    }).then(c => {
      cy.signIn(this.account, `/character/${c.id}`)
      cy.button('Magia').click()
      cy.findByText('Editar repertório com validação', { exact: true }).click()
      cy.field('Nome da magia 1').clear().type('Not a catalog spell')
      cy.button('Salvar repertório').click()
      cy.findByRole('alert').should('be.visible')
      cy.field('Nome da magia 1').clear().type('Arcane Armor')
      cy.button('Salvar repertório').click()
      cy.contains('[role=status]', 'Repertório registrado').should('be.visible')
      cy.api(this.account, 'GET', `/characters/${c.id}`).its('character.spells').then(rows => {
        expect(rows).to.have.length(1)
        expect(rows[0]).to.include({ name: 'Arcane Armor', tradition: 'arcane', level: 1 })
      })
    })
  })

  it('concede XP, avança nível e fecha mês do domínio', function () {
    cy.character(this.account).then(c => {
      mutateCharacter(this.account, 'PUT', `/characters/${c.id}/domain`, { peasantFamilies: 100, treasury: 1000, garrisonCost: 200, liturgiesCost: 100, titheCost: 100 })
      cy.signIn(this.account, `/character/${c.id}`)
      cy.button('Evolução & Regras').click()
      cy.field('Identificador único da aventura').type('cypress-adventure')
      cy.field('Valor do tesouro elegível (GP)').clear().type('2000')
      cy.button('Conferir distribuição de XP').click()
      cy.button('Confirmar concessão de XP').click()
      cy.contains('[role=status]', 'XP concedido').should('be.visible')
      cy.field('Resultados individuais dos dados').type('8, 7')
      cy.button('Conferir avanço').click()
      cy.button('Confirmar avanço').click()
      cy.contains('[role=status]', 'Nível atualizado').should('be.visible')
      cy.button('Conferir mês').click()
      cy.button('Confirmar fechamento mensal').click()
      cy.contains('[role=status]', 'Mês registrado').should('be.visible')
      cy.api(this.account, 'GET', `/characters/${c.id}`).its('character').then(updated => {
        expect(updated).to.include({ level: 2, hpMax: 15, xp: 2000 })
        expect(updated.domain.treasury).to.eq(1500)
      })
    })
  })

  it('gasta magia, impede uso excedente e recupera após descanso', function () {
    cy.character(this.account, { classKey: 'catalog:mage', int: 16, hpMax: 4,
      spells: [{ name: 'Slumber', level: 1, tradition: 'arcane' }],
    }).then(c => {
      cy.signIn(this.account, `/character/${c.id}`)
      cy.button('Magia').click()
      cy.findByRole('button', { name: 'Conjurar Slumber', exact: true }).click()
      cy.contains('[role=status]', 'Uso de magia registrado').should('be.visible')
      cy.api(this.account, 'GET', `/characters/${c.id}`).its('character').then(current => {
        cy.api(this.account, 'POST', `/game-rules/characters/${c.id}/magic/cast`, { version: current.version, spellId: current.spells[0].id }, 400)
      })
      cy.findByLabelText(/Foram cumpridas 8 horas/).check()
      cy.button('Registrar descanso').click()
      cy.contains('[role=status]', 'Usos de magia recuperados').should('be.visible')
      cy.api(this.account, 'GET', `/characters/${c.id}`).its('character.rulesState').then(state => expect(JSON.parse(state).used).to.deep.eq({}))
    })
  })

  it('identifica item mágico, consome cargas e impede gasto além do saldo', function () {
    cy.character(this.account).then(c => {
      mutateCharacter(this.account, 'POST', `/characters/${c.id}/items`, { name: 'Wand', quantity: 1, weight: 1 }, 201).its('item').then(item => {
        cy.signIn(this.account, `/character/${c.id}`)
        cy.button('Evolução & Regras').click()
        cy.field('Item mágico').should('be.enabled').select(item.id)
        cy.field('Identificado em jogo').check()
        cy.field('Item com cargas (uma unidade por entrada)').check()
        cy.field('Cargas registradas').clear().type('2')
        cy.button('Salvar identificação e valores').click()
        cy.contains('Cargas disponíveis: 2').should('be.visible')
        cy.button('Ativar e gastar cargas').click()
        cy.contains('Cargas disponíveis: 1').should('be.visible')
        cy.button('Ativar e gastar cargas').click()
        cy.contains('Cargas disponíveis: 0').should('be.visible')
        cy.api(this.account, 'GET', `/characters/${c.id}`).its('character').then(current => {
          cy.api(this.account, 'POST', `/campaign-rules/characters/${c.id}/items/${item.id}/charge`, { version: current.version, charges: 1 }, 400)
        })
      })
    })
  })

  it('inicia pesquisa, registra trabalho e consome componentes para criar item', function () {
    cy.character(this.account, { classKey: 'catalog:mage', int: 16, hpMax: 4, coinGP: 1000 }).then(c => {
      cy.api(this.account, 'PUT', `/characters/${c.id}`, { version: c.version, level: 5, workshopValue: 4000 })
      mutateCharacter(this.account, 'POST', `/characters/${c.id}/magic-research`, { itemName: 'Test scroll', effectType: 'ONE_USE', spellLevel: 1, hasFormula: true }, 201).its('research').as('project')
      mutateCharacter(this.account, 'POST', `/characters/${c.id}/items`, { name: 'Monster component', quantity: 1, weight: 1 }, 201).its('item').as('component')
      cy.signIn(this.account, `/character/${c.id}`)
      cy.button('Evolução & Regras').click()
      cy.get('@project').then(project => cy.field('Projeto de pesquisa').should('be.enabled').select(project.id))
      cy.findByLabelText(/Mestre conferiu elegibilidade/).check()
      cy.button('Conferir início da pesquisa').click()
      cy.button('Pagar materiais e iniciar').click()
      cy.contains('[role=status]', 'Materiais pagos').should('be.visible')
      cy.field('Período de trabalho (identificador único)').type('Days 1-10')
      cy.field('Dias trabalhados').clear().type('10')
      cy.button('Registrar trabalho').click()
      cy.button('+ Componente').click()
      cy.get('@component').then(component => cy.field('Componente').select(component.id))
      cy.field('GP/unidade').clear().type('500')
      cy.button('Conferir resultado').click()
      cy.button('Consumir componentes e registrar resultado').click()
      cy.contains('[role=status]', 'Resultado registrado').should('be.visible')
      cy.api(this.account, 'GET', `/characters/${c.id}`).its('character').then(updated => {
        expect(updated.coinGP).to.eq(500)
        expect(updated.items.map(item => item.name)).to.include('Test scroll').and.not.include('Monster component')
      })
      cy.button('Magia').click()
      cy.contains('tr', 'Projeto acompanhado: gerencie em Evolução & Regras.').find('input,select,button').should('be.disabled')
    })
  })
})
