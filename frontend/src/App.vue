<template>
  <div class="min-h-screen bg-dark-bg">
    <a href="#main-content" class="skip-link">Ir para o conteúdo</a>
    <nav v-if="authStore.isLoggedIn" class="bg-dark-card border-b border-gold/20 px-4 sm:px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
      <div class="flex flex-wrap items-center gap-3 sm:gap-6">
        <router-link to="/dashboard" class="flex items-center gap-3 text-gold font-bold text-xl tracking-wider hover:text-gold-light transition-colors">
          <span class="font-[Cinzel]">ACKS II</span>
        </router-link>
        <router-link to="/campaigns" class="text-steel-light hover:text-white transition-colors text-sm font-medium">
          Campanhas
        </router-link>
        <router-link to="/classes" class="text-steel-light hover:text-white text-sm">Classes</router-link>
        <router-link v-if="authStore.user?.role === 'MASTER'" to="/dashboard/judge" class="text-gold/80 hover:text-gold transition-colors text-sm font-medium flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          Painel do Mestre
        </router-link>
      </div>
      <div class="flex min-w-0 max-w-full items-center gap-3">
        <!-- Theme Toggle -->
        <button @click="toggleTheme" 
          class="flex shrink-0 items-center justify-center w-8 h-8 rounded-full border border-steel-dark text-gold hover:text-gold-light hover:border-gold transition-all"
          :title="isParchmentMode ? 'Mudar para Dark Mode' : 'Mudar para Modo Pergaminho (Claro)'">
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

        <span class="min-w-0 break-words text-sm text-steel-light">
          {{ authStore.user?.username }}
          <span class="ml-1 px-2 py-0.5 rounded text-xs font-semibold"
            :class="authStore.user?.role === 'MASTER' ? 'bg-crimson/30 text-crimson-light' : 'bg-dark-surface text-gold'">
            {{ authStore.user?.role }}
          </span>
        </span>
        <button @click="handleLogout"
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
import { ref, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'
import AppToastStack from './components/AppToastStack.vue'
import { notifyError } from './utils/toast'

const authStore = useAuthStore()
const router = useRouter()
const isParchmentMode = ref(false)

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'parchment') {
    isParchmentMode.value = true
    document.body.classList.add('theme-parchment')
  }
})

function toggleTheme() {
  isParchmentMode.value = !isParchmentMode.value
  if (isParchmentMode.value) {
    document.body.classList.add('theme-parchment')
    localStorage.setItem('theme', 'parchment')
  } else {
    document.body.classList.remove('theme-parchment')
    localStorage.setItem('theme', 'dark')
  }
}

async function handleLogout() {
  try {
    await authStore.logout()
    router.push('/login')
  } catch { notifyError('Não foi possível encerrar a sessão no servidor. Tente novamente.') }
}
</script>
