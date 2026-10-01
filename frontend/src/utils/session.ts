export interface User {
  id: string
  username: string
  email: string
  role: 'MASTER' | 'PLAYER'
}

export function readStoredSession(storage: Pick<Storage, 'getItem' | 'removeItem'>) {
  try {
    const token = storage.getItem('token')
    const user: unknown = JSON.parse(storage.getItem('user') || 'null')
    if (token && typeof user === 'object' && user !== null &&
      'id' in user && typeof user.id === 'string' && user.id &&
      'username' in user && typeof user.username === 'string' &&
      'email' in user && typeof user.email === 'string' &&
      'role' in user && (user.role === 'MASTER' || user.role === 'PLAYER')) {
      return { token, user: user as User }
    }
  } catch { /* Invalid or inaccessible browser storage must not prevent rendering. */ }
  try { storage.removeItem('token'); storage.removeItem('user') } catch { /* Storage may be unavailable. */ }
  return { token: null, user: null }
}
