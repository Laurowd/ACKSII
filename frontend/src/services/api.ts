import axios from 'axios'
import { notifyError } from '../utils/toast'
import { referenceCache } from './resourceCache'
import { mutationStarted, mutationSucceeded } from './mutationJournal'

const api = axios.create({
  baseURL: '',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  mutationStarted(config)
  return config
})

api.interceptors.response.use(
  (response) => {
    mutationSucceeded(response.config)
    if (response.config.method !== 'get' && /^\/api\/(auth\/|classes|class-builder|campaigns)/.test(response.config.url || '')) referenceCache.clear()
    return response
  },
  (error) => {
    if (error.response?.status === 401 && !['/api/auth/login', '/api/auth/register'].includes(error.config?.url)) {
      referenceCache.clear()
      notifyError('Sua sessao expirou. Faca login novamente.')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('app:force-logout'))
      window.location.href = '/login'
    } else if (error.response?.status === 429) {
      notifyError('Muitas requisicoes em pouco tempo. Aguarde e tente novamente.')
    }
    return Promise.reject(error)
  }
)

export default api
