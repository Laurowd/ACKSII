import axios from 'axios'
import { notifyError } from '../utils/toast'

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !['/api/auth/login', '/api/auth/register'].includes(error.config?.url)) {
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
