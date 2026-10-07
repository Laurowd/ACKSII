import { mutateCharacter } from '../support/characterMutations'
// Complemento de API: valida persistência e autorização de cada recurso da ficha.
const resources = [
  ['weapons', 'weapon', 'weapons', { name: 'Axe', damage: '1d6' }, { name: 'Updated axe' }, 201],
  ['items', 'item', 'items', { name: 'Rope', quantity: 1, weight: 1 }, { quantity: 2 }, 201],
  ['proficiencies', 'proficiency', 'proficiencies', { name: 'Manual of Arms', category: 'general' }, { name: 'Labor' }, 201],
  ['spells', 'spell', 'spells', { name: 'Slumber', level: 1, tradition: 'arcane' }, { name: 'Arcane Armor' }, 201],
  ['rituals', 'ritual', 'rituals', { name: 'Ritual' }, { name: 'Updated ritual' }, 201],
  ['magic-formulae', 'formula', 'magicFormulae', { name: 'Formula' }, { name: 'Updated formula' }, 201],
  ['magic-research', 'research', 'magicItemResearch', { itemName: 'Scroll', effectType: 'ONE_USE', spellLevel: 1 }, { itemName: 'Updated scroll' }, 201],
  ['mercantile', 'venture', 'mercantileVentures', { cargoName: 'Spices' }, { cargoName: 'Silk' }, 201],
  ['scars', 'scar', 'scars', {}, { description: 'Scar', daysToRest: 2 }, 200],
  ['henchmen', 'henchman', 'henchmen', {}, { name: 'Retainer', wage: 20 }, 200],
  ['activities', 'activity', 'activities', { title: 'Training' }, { title: 'Healing', status: 'ACTIVE' }, 201],
  ['armyUnits', 'unit', 'armyUnits', { name: 'Infantry' }, { name: 'Guard', hp: 2 }, 201],
]
describe('Recursos da ficha e permissões (API)', () => {
  beforeEach(() => {
    cy.makeUser('MASTER').as('account').then(account => cy.character(account, { classKey: 'catalog:mage', int: 16, hpMax: 4 }).as('character'))
    cy.makeUser().as('stranger')
  })
  for (const [route, key, relation, create, update, status] of resources) {
    it(`cria, edita, lê e exclui ${route}; impede edição por outro jogador`, function () {
      const base = `/characters/${this.character.id}/${route}`
      mutateCharacter(this.account, 'POST', base, create, status).then(body => {
        const path = `${base}/${body[key].id}`
        cy.api(this.stranger, 'PUT', path, {...update,version:0}, 403)
        cy.api(this.stranger, 'DELETE', path, {version:0}, 403)
        mutateCharacter(this.account, 'PUT', path, update).its(key).should('include', update)
        cy.api(this.account, 'GET', `/characters/${this.character.id}`).its(`character.${relation}`)
          .should('have.length.greaterThan', 0).then(rows => expect(rows.find(row => row.id === body[key].id)).to.include(update))
        mutateCharacter(this.account, 'DELETE', path)
        cy.api(this.account, 'GET', `/characters/${this.character.id}`).its(`character.${relation}`)
          .then(rows => expect(rows.some(row => row.id === body[key].id)).to.eq(false))
      })
    })
  }
  it('impede ler ficha de outro jogador e acessar sem autenticação', function () {
    cy.api(this.stranger, 'GET', `/characters/${this.character.id}`, undefined, 403)
    cy.api(null, 'GET', `/characters/${this.character.id}`, undefined, 401)
    cy.api(this.stranger, 'DELETE', `/characters/${this.character.id}`, undefined, 403)
    cy.api(this.account, 'PUT', `/characters/${this.character.id}`, { coinGP: 200 }, 400)
  })
  it('jogador não usa os editores manuais para acrescentar, trocar ou remover uma magia de estudo',function(){
    cy.makeUser('PLAYER').then(player=>cy.character(player,{classKey:'catalog:mage',hpMax:4,spells:[{name:'Slumber',level:1,tradition:'arcane'}]}).then(c=>{
      cy.api(player,'GET',`/characters/${c.id}`).its('character').then(current=>{
        const spell=current.spells[0],base=`/characters/${c.id}/spells`
        cy.api(player,'POST',base,{version:current.version,name:'Arcane Armor',level:1,tradition:'arcane'},403)
        cy.api(player,'PUT',`${base}/${spell.id}`,{version:current.version,name:'Arcane Armor'},403)
        cy.api(player,'DELETE',`${base}/${spell.id}`,{version:current.version},403)
        cy.api(player,'GET',`/characters/${c.id}`).its('character').then(saved=>{
          expect(saved.version).to.eq(current.version)
          expect(saved.spells.map(entry=>entry.name)).to.deep.eq(['Slumber'])
        })
      })
    }))
  })
  it('rejeita compra sem dinheiro e mantém inventário e moedas', function () {
    cy.api(this.account, 'PUT', `/characters/${this.character.id}`, { version: 0, coinGP: 0 })
    mutateCharacter(this.account, 'POST', `/characters/${this.character.id}/shop/purchase`, { entryId: 'i-horse-riding' }, 409)
    cy.api(this.account, 'GET', `/characters/${this.character.id}`).its('character').then(c => {
      expect(c.coinGP).to.eq(0)
      expect(c.items).to.have.length(0)
    })
  })
})
