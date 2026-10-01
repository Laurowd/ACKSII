// Fixtures fetch the current revision; callers can explicitly supply a stale
// version when verifying conflict handling.
export function mutateCharacter(account, method, path, body = {}, status = 200) {
  const id = /^\/characters\/([^/]+)/.exec(path)?.[1]
  if (!id) throw new Error(`Character mutation path expected: ${path}`)
  return cy.api(account, 'GET', `/characters/${id}`).its('character').then(character =>
    cy.api(account, method, path, { version: character.version, ...body }, status))
}
