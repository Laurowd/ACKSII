<template>
  <div class="min-h-screen flex items-center justify-center bg-dark-bg p-4">
    <div class="w-full max-w-md animate-fade-in">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gold tracking-widest mb-2">ACKS II</h1>
        <p class="text-steel-light text-sm">Crie sua conta de aventureiro</p>
      </div>

      <div class="bg-dark-card border border-gold/20 rounded-2xl p-8 shadow-2xl shadow-black/50">
        <h2 class="text-2xl font-bold text-gold mb-6 text-center">Registro</h2>

        <div v-if="error" role="alert" class="bg-crimson/20 border border-crimson/40 text-red-300 text-sm px-4 py-2 rounded-lg mb-4">
          {{ error }}
        </div>

        <form @submit.prevent="handleRegister" :aria-busy="loading" class="space-y-4">
          <div>
            <label for="register-name" class="block text-sm font-medium text-steel-light mb-1.5">Nome de Usuário</label>
            <input id="register-name" v-model.trim="username" type="text" required minlength="3" maxlength="40" autocomplete="username"
              class="w-full px-4 py-3 bg-dark-bg border border-steel-dark rounded-lg text-dark-text placeholder-steel
                     focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-all"
              placeholder="Seu nome de aventureiro" />
          </div>
          <div>
            <label for="register-email" class="block text-sm font-medium text-steel-light mb-1.5">Email</label>
            <input id="register-email" v-model.trim="email" type="email" required maxlength="160" autocomplete="email" autocapitalize="none" spellcheck="false"
              class="w-full px-4 py-3 bg-dark-bg border border-steel-dark rounded-lg text-dark-text placeholder-steel
                     focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-all"
              placeholder="seu@email.com" />
          </div>
          <div>
            <label for="register-password" class="block text-sm font-medium text-steel-light mb-1.5">Senha</label>
            <input id="register-password" v-model="password" type="password" required minlength="8" maxlength="72" autocomplete="new-password"
              class="w-full px-4 py-3 bg-dark-bg border border-steel-dark rounded-lg text-dark-text placeholder-steel
                     focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-all"
              placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <div id="register-role" class="block text-sm font-medium text-steel-light mb-1.5">Papel</div>
            <div role="group" aria-labelledby="register-role" class="grid grid-cols-2 gap-3">
              <button type="button" :aria-pressed="role === 'PLAYER'" @click="role = 'PLAYER'"
                :class="['px-4 py-3 rounded-lg border transition-all text-sm font-semibold',
                  role === 'PLAYER' ? 'border-gold bg-gold/20 text-gold' : 'border-steel-dark bg-dark-bg text-steel-light hover:border-steel']">
                Jogador
              </button>
              <button type="button" :aria-pressed="role === 'MASTER'" @click="role = 'MASTER'"
                :class="['px-4 py-3 rounded-lg border transition-all text-sm font-semibold',
                  role === 'MASTER' ? 'border-crimson-light bg-crimson/20 text-crimson-light' : 'border-steel-dark bg-dark-bg text-steel-light hover:border-steel']">
                Mestre
              </button>
            </div>
          </div>
          <button type="submit" :disabled="loading"
            class="w-full py-3 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
                   hover:from-gold hover:to-gold-light transform hover:scale-[1.02] transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed">
            {{ loading ? 'Registrando...' : 'Registrar' }}
          </button>
        </form>

        <p class="text-center text-steel-light text-sm mt-6">
          Já tem conta? 
          <router-link to="/login" class="text-gold hover:text-gold-light underline transition-colors">Entrar</router-link>
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
const username = ref('')
const email = ref('')
const password = ref('')
const role = ref('PLAYER')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    await authStore.register(username.value, email.value, password.value, role.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Erro ao registrar'
  } finally {
    loading.value = false
  }
}
</script>
