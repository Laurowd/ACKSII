<template>
  <div class="min-h-screen bg-dark-bg">
    <a href="#main-content" class="skip-link">Ir para o conteúdo</a>
    <nav v-if="authStore.isLoggedIn" aria-label="Navegação principal" class="app-nav bg-dark-card border-b border-gold/20">
      <router-link to="/dashboard" class="app-brand text-gold font-bold text-xl tracking-wider hover:text-gold-light transition-colors" aria-label="ACKS II — início">
        <span class="font-[Cinzel]">ACKS II</span>
      </router-link>
      <div class="app-nav-pages">
        <router-link to="/dashboard" class="app-nav-link">Personagens</router-link>
        <router-link to="/campaigns" class="app-nav-link">
          Campanhas
        </router-link>
        <router-link to="/classes" class="app-nav-link">Classes</router-link>
        <router-link v-if="authStore.user?.role === 'MASTER'" to="/dashboard/judge" class="app-nav-link app-nav-judge" aria-label="Painel do Mestre">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          <span class="hidden sm:inline">Painel do Mestre</span><span class="sm:hidden" aria-hidden="true">Mestre</span>
        </router-link>
      </div>
      <div class="app-nav-account">
        <!-- Theme Toggle -->
        <button @click="toggleTheme" 
          class="app-theme-button flex shrink-0 items-center justify-center rounded-full border border-steel-dark text-gold hover:text-gold-light hover:border-gold transition-all"
          :aria-label="isParchmentMode ? 'Usar tema escuro' : 'Usar tema pergaminho'"
          :title="isParchmentMode ? 'Usar tema escuro' : 'Usar tema pergaminho'">
          <svg v-if="!isParchmentMode" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>

        <span class="app-user text-sm text-steel-light">
          <span class="app-user-name" :title="authStore.user?.username">{{ authStore.user?.username }}</span>
          <span class="px-2 py-0.5 rounded text-xs font-semibold"
            :class="authStore.user?.role === 'MASTER' ? 'bg-crimson/30 text-crimson-light' : 'bg-dark-surface text-gold'">
            {{ authStore.user?.role === 'MASTER' ? 'Mestre' : 'Jogador' }}
          </span>
        </span>
        <button @click="handleLogout" :disabled="loggingOut"
          class="px-3 py-1.5 bg-crimson/20 text-crimson-light rounded hover:bg-crimson/40 transition-colors text-sm">
          Sair
        </button>
      </div>
    </nav>
    <main id="main-content" tabindex="-1"><router-view /></main>
    <AppToastStack />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'
import AppToastStack from './components/AppToastStack.vue'
import { notifyError } from './utils/toast'

const authStore = useAuthStore()
const router = useRouter()
const isParchmentMode = ref(false)
const loggingOut = ref(false)

function applyTheme(value: string | null) {
  isParchmentMode.value = value === 'parchment'
  document.body.classList.toggle('theme-parchment', isParchmentMode.value)
}

function synchronizeTheme(event: StorageEvent) {
  if (event.key === 'theme') applyTheme(event.newValue)
}

onMounted(() => {
  try { applyTheme(localStorage.getItem('theme')) } catch { applyTheme(null) }
  window.addEventListener('storage', synchronizeTheme)
})
onBeforeUnmount(() => window.removeEventListener('storage', synchronizeTheme))

function toggleTheme() {
  const nextTheme = isParchmentMode.value ? 'dark' : 'parchment'
  applyTheme(nextTheme)
  try { localStorage.setItem('theme', nextTheme) } catch { /* Theme remains usable when storage is unavailable. */ }
}

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authStore.logout()
    router.push('/login')
  } catch { notifyError('Não foi possível encerrar a sessão no servidor. Tente novamente.') }
  finally { loggingOut.value = false }
}
</script>
