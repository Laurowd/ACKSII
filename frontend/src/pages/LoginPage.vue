<template>
  <div class="min-h-screen flex items-center justify-center bg-dark-bg p-4">
    <div class="w-full max-w-md animate-fade-in">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gold tracking-widest mb-2">ACKS II</h1>
        <p class="text-steel-light text-sm">Adventurer Conqueror King System II</p>
      </div>

      <!-- Card -->
      <div class="bg-dark-card border border-gold/20 rounded-2xl p-8 shadow-2xl shadow-black/50">
        <h2 class="text-2xl font-bold text-gold mb-6 text-center">Entrar</h2>

        <div v-if="error" role="alert" class="bg-crimson/20 border border-crimson/40 text-red-300 text-sm px-4 py-2 rounded-lg mb-4">
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin" :aria-busy="loading" class="space-y-5">
          <div>
            <label for="login-email" class="block text-sm font-medium text-steel-light mb-1.5">Email</label>
            <input id="login-email" v-model.trim="email" type="email" required autocomplete="username" maxlength="160" autocapitalize="none" spellcheck="false"
              class="w-full px-4 py-3 bg-dark-bg border border-steel-dark rounded-lg text-dark-text placeholder-steel
                     focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-all" 
              placeholder="seu@email.com" />
          </div>
          <div>
            <label for="login-password" class="block text-sm font-medium text-steel-light mb-1.5">Senha</label>
            <input id="login-password" v-model="password" type="password" required autocomplete="current-password"
              class="w-full px-4 py-3 bg-dark-bg border border-steel-dark rounded-lg text-dark-text placeholder-steel
                     focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-all"
              placeholder="••••••••" />
          </div>
          <button type="submit" :disabled="loading"
            class="w-full py-3 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
                   hover:from-gold hover:to-gold-light transform hover:scale-[1.02] transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            <span v-if="loading" class="animate-spin inline-block mr-2">⏳</span>
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>
        <router-link to="/forgot-password" class="block text-center text-gold underline mt-4">Esqueci minha senha</router-link>

        <p class="text-center text-steel-light text-sm mt-6">
          Não tem conta? 
          <router-link to="/register" class="text-gold hover:text-gold-light underline transition-colors">Registre-se</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Erro ao fazer login'
  } finally {
    loading.value = false
  }
}
</script>
