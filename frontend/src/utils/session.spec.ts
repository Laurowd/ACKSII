import { describe, expect, it } from 'vitest'
import { readStoredSession } from './session'

const user = { id: 'user-id', username: 'Player', email: 'player@test.invalid', role: 'PLAYER' }
function storage(values: Record<string, string>) {
  return { getItem: (key: string) => values[key] ?? null, removeItem: (key: string) => { delete values[key] } }
}
describe('stored session recovery', () => {
  it('restores a complete session', () => {
    expect(readStoredSession(storage({ token: 'token', user: JSON.stringify(user) }))).toEqual({ token: 'token', user })
  })
  it.each(['{broken', 'null', '[]', '"text"', JSON.stringify({ ...user, role: 'INVALID' })])('clears invalid user data %s without preventing rendering', value => {
    const data = { token: 'token', user: value }
    expect(readStoredSession(storage(data))).toEqual({ token: null, user: null })
    expect(data).toEqual({})
  })
  it('clears an incomplete session', () => {
    expect(readStoredSession(storage({ token: 'token' }))).toEqual({ token: null, user: null })
    expect(readStoredSession(storage({ user: JSON.stringify(user) }))).toEqual({ token: null, user: null })
  })
  it('tolerates inaccessible storage', () => {
    const inaccessible = { getItem() { throw Error('Storage unavailable') }, removeItem() { throw Error('Storage unavailable') } }
    expect(readStoredSession(inaccessible)).toEqual({ token: null, user: null })
  })
})
