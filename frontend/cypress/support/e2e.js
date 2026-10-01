import '@testing-library/cypress/add-commands'

Cypress.Commands.add('makeUser', (role = 'PLAYER') => cy.task('user', role, { log: false }))
Cypress.Commands.add('api', (account, method, path, body, status = 200) => {
  return cy.request({ method, url: `/api${path}`, body, failOnStatusCode: false,
    headers: account ? { authorization: `Bearer ${account.token}` } : {}, log: false,
  }).then(response => {
    expect(response.status, `${method} ${path}: ${JSON.stringify(response.body).slice(0, 300)}`).to.eq(status)
    return response.body
  })
})
Cypress.Commands.add('signIn', (account, path = '/dashboard') => cy.visit(path, {
  onBeforeLoad(win) {
    win.localStorage.setItem('token', account.token)
    win.localStorage.setItem('user', JSON.stringify(account.user))
  },
}))
Cypress.Commands.add('character', (account, overrides = {}) => cy.api(account, 'POST', '/characters/guided', {
  characterName: `Cypress ${account.user.username}`, classKey: 'catalog:fighter',
  str: 10, int: 10, dex: 10, wil: 10, con: 10, cha: 10, hpMax: 6, coinGP: 100,
  ...overrides,
}, 201).its('character'))
Cypress.Commands.add('button', name => cy.findByRole('button', { name, exact: true }))
Cypress.Commands.add('field', name => cy.findByLabelText(name, { exact: true }))
