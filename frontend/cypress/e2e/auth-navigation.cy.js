describe('Autenticação e navegação', () => {
  it('cadastra um jogador pela interface e encerra a sessão no servidor', () => {
    cy.visit('/register')
    const suffix = Date.now()
    cy.findByPlaceholderText('Seu nome de aventureiro').type(`cy_register_${suffix}`)
    cy.findByPlaceholderText('seu@email.com').type(`cy_register_${suffix}@test.invalid`)
    cy.get('input[type=password]').type('Cypress-password1', { log: false })
    cy.button('Registrar').click()
    cy.location('pathname').should('eq', '/dashboard')
    cy.window().then(win => cy.wrap({ token: win.localStorage.getItem('token') }, { log: false }).as('session'))
    cy.button('Sair').click()
    cy.location('pathname').should('eq', '/login')
    cy.get('@session').then(account => cy.api(account, 'GET', '/auth/me', undefined, 401))
  })

  it('faz login e apresenta erro para senha incorreta', () => {
    cy.makeUser().then(account => {
      cy.visit('/login')
      cy.findByPlaceholderText('seu@email.com').type(account.user.email)
      cy.get('input[type=password]').type('wrong-password')
      cy.button('Entrar').click()
      cy.findByRole('alert').should('be.visible')
      cy.get('input[type=password]').clear().type(account.password, { log: false })
      cy.button('Entrar').click()
      cy.location('pathname').should('eq', '/dashboard')
    })
  })

  it('recupera senha pelo e-mail local, revoga sessão e impede reutilizar o link', () => {
    cy.makeUser().then(account => {
      cy.visit('/forgot-password')
      cy.field('E-mail').type(account.user.email)
      cy.button('Enviar link').click()
      cy.findByRole('status').should('contain.text', 'Se o e-mail estiver cadastrado')
      cy.task('resetLink', account.user.email, { log: false }).then(link => {
        cy.visit(link)
        cy.field('Nova senha').type('New-cypress-password1', { log: false })
        cy.field('Confirmar senha').type('New-cypress-password1', { log: false })
        cy.button('Salvar nova senha').click()
        cy.findByRole('status').should('be.visible')
        cy.api(account, 'GET', '/auth/me', undefined, 401)
        cy.api(null, 'POST', '/auth/login', { email: account.user.email, password: account.password }, 401)
        cy.api(null, 'POST', '/auth/login', { email: account.user.email, password: 'New-cypress-password1' })
        cy.api(null, 'POST', '/auth/reset-password', { token: link.split('#')[1], password: 'Another-password1' }, 400)
      })
    })
  })

  it('mantém recuperação neutra para e-mail inexistente', () => {
    cy.visit('/forgot-password')
    cy.field('E-mail').type('not-found@cypress.invalid')
    cy.button('Enviar link').click()
    cy.findByRole('status').should('contain.text', 'Se o e-mail estiver cadastrado')
  })

  it('protege rotas privadas e limpa sessão corrompida', () => {
    cy.visit('/dashboard', { onBeforeLoad(win) {
      win.localStorage.setItem('token', 'invalid')
      win.localStorage.setItem('user', '{broken')
    } })
    cy.location('pathname').should('eq', '/login')
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.null')
  })

  it('mostra página inexistente sem erro de aplicação', () => {
    cy.visit('/a-page-that-does-not-exist')
    cy.contains('404').should('be.visible')
  })

  it('permite tentar novamente após falha de carregamento', () => {
    cy.makeUser().then(account => {
      cy.intercept({ method: 'GET', pathname: '/api/characters', times: 1 }, { statusCode: 503, body: { error: 'Falha temporária' } }).as('failed')
      cy.signIn(account)
      cy.wait('@failed')
      cy.findByRole('alert').should('be.visible')
      cy.button('Tentar novamente').click()
      cy.findByRole('alert').should('not.exist')
    })
  })
})
