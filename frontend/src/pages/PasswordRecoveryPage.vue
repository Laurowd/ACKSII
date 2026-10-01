<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <form @submit.prevent="submit" class="w-full max-w-md bg-dark-card rounded-xl border border-gold/30 p-8 space-y-5">
      <h1 class="text-2xl text-gold">{{ resetting ? 'Redefinir senha' : 'Recuperar acesso' }}</h1>
      <p v-if="message" role="status" class="text-steel-light">{{ message }}</p>
      <p v-if="error" role="alert" class="text-red-400">{{ error }}</p>
      <label v-if="!resetting" class="block text-steel-light">E-mail
        <input v-model="email" type="email" required autocomplete="email" class="block w-full rounded bg-dark-bg p-3 mt-2" />
      </label>
      <template v-else>
        <label class="block text-steel-light">Nova senha
          <input v-model="password" type="password" required minlength="8" maxlength="72" autocomplete="new-password" class="block w-full rounded bg-dark-bg p-3 mt-2" />
        </label>
        <label class="block text-steel-light">Confirmar senha
          <input v-model="confirmation" type="password" required autocomplete="new-password" class="block w-full rounded bg-dark-bg p-3 mt-2" />
        </label>
      </template>
      <button v-if="!done" :disabled="busy" class="bg-gold text-dark-bg rounded px-4 py-3 disabled:opacity-50">{{ busy ? 'Aguarde…' : resetting ? 'Salvar nova senha' : 'Enviar link' }}</button>
      <router-link to="/login" class="block text-gold underline">Voltar para entrar</router-link>
    </form>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
const route = useRoute()
const resetting = route.path === '/reset-password'
const token = route.hash.slice(1)
if (resetting) window.history.replaceState(window.history.state, '', window.location.pathname)
const email = ref(''), password = ref(''), confirmation = ref(''), message = ref(''), error = ref('')
const busy = ref(false), done = ref(false)
async function submit() {
  if (busy.value || done.value) return
  error.value = ''
  if (resetting && password.value !== confirmation.value) { error.value = 'As senhas precisam ser iguais.'; return }
  if (resetting && !token) { error.value = 'Abra o link recebido por e-mail.'; return }
  busy.value = true
  try {
    const response = await api.post(resetting ? '/api/auth/reset-password' : '/api/auth/forgot-password', resetting ? { token, password: password.value } : { email: email.value })
    message.value = response.data.message
    done.value = true
  } catch (e: any) { error.value = e.response?.data?.error || 'Não foi possível concluir. Tente novamente.' }
  finally { busy.value = false }
}
</script>
