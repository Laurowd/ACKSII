import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import { readStoredSession, type User } from '../utils/session'

export const useAuthStore = defineStore('auth', () => {
  const initial = readStoredSession(localStorage)
  const token = ref<string | null>(initial.token)
  const user = ref<User | null>(initial.user)

  function syncFromStorage() {
    const session = readStoredSession(localStorage)
    token.value = session.token
    user.value = session.user
  }

  const isLoggedIn = computed(() => !!token.value)
  const isMaster = computed(() => user.value?.role === 'MASTER')

  async function login(email: string, password: string) {
    const res = await api.post('/api/auth/login', { email, password })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
  }

  async function register(username: string, email: string, password: string, role: string) {
    const res = await api.post('/api/auth/register', { username, email, password, role })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function logout() {
    await api.post('/api/auth/logout')
    clearSession()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === null || event.key === 'token' || event.key === 'user') {
        syncFromStorage()
      }
    })

    window.addEventListener('app:force-logout', () => {
      clearSession()
    })
  }

  return { token, user, isLoggedIn, isMaster, login, register, logout, syncFromStorage }
})
