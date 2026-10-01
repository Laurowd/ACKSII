<template>
  <div class="max-w-6xl mx-auto p-6 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-wrap gap-4 items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gold">Campanhas</h1>
        <p class="text-steel-light mt-1">
          {{ authStore.isMaster ? 'Gerencie suas campanhas e convites' : 'Participe de aventuras épicas' }}
        </p>
      </div>
      <button v-if="authStore.isMaster" @click="showCreateCampaign = true"
        class="px-5 py-2.5 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
               hover:from-gold hover:to-gold-light transition-all">
        + Nova Campanha
      </button>
      <button v-else @click="showJoinCampaign = true"
        class="px-5 py-2.5 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
               hover:from-gold hover:to-gold-light transition-all">
        Participar via Código
      </button>
    </div>

    <!-- Módulo de Criação de Campanha (Mestre) -->
    <div v-if="showCreateCampaign && authStore.isMaster" class="bg-dark-card border border-gold/20 p-5 rounded-xl mb-8">
      <h3 class="text-lg font-bold text-gold mb-3">Criar Nova Campanha</h3>
      <form @submit.prevent="createCampaign" class="flex flex-wrap gap-3" :aria-busy="submitting">
        <input v-model="newCampaignName" aria-label="Nome da campanha" required placeholder="Nome da Campanha..." class="min-w-0 basis-full sm:basis-auto flex-1 px-4 py-2 bg-dark-bg border border-steel-dark rounded text-gold placeholder-steel" />
        <button type="submit" :disabled="submitting || !newCampaignName.trim()" class="px-5 py-2 bg-gold-dark text-dark-bg font-bold rounded hover:bg-gold transition-colors disabled:opacity-50">{{ submitting ? 'Criando…' : 'Criar' }}</button>
        <button type="button" :disabled="submitting" @click="showCreateCampaign = false" class="px-5 py-2 bg-dark-bg border border-steel-dark text-steel rounded hover:bg-steel/10 transition-colors">Cancelar</button>
      </form>
    </div>

    <!-- Módulo de Entrada de Campanha (Jogador) -->
    <div v-if="showJoinCampaign && !authStore.isMaster" class="bg-dark-card border border-gold/20 p-5 rounded-xl mb-8">
      <h3 class="text-lg font-bold text-gold mb-3">Participar de uma Campanha</h3>
      <p class="text-sm text-steel mb-3">Insira o código de 6 caracteres fornecido pelo seu Mestre.</p>
      <form @submit.prevent="joinCampaign" class="flex flex-wrap gap-3" :aria-busy="submitting">
        <input v-model="joinCodeInput" aria-label="Código de convite" required minlength="6" maxlength="6" autocapitalize="characters" spellcheck="false" placeholder="Código de Convite..." class="min-w-0 basis-full sm:basis-auto flex-1 px-4 py-2 bg-dark-bg border border-steel-dark rounded text-gold placeholder-steel uppercase tracking-widest" />
        <button type="submit" :disabled="submitting || joinCodeInput.trim().length !== 6" class="px-5 py-2 bg-gold-dark text-dark-bg font-bold rounded hover:bg-gold transition-colors disabled:opacity-50">{{ submitting ? 'Enviando…' : 'Solicitar Inscrição' }}</button>
        <button type="button" :disabled="submitting" @click="showJoinCampaign = false" class="px-5 py-2 bg-dark-bg border border-steel-dark text-steel rounded hover:bg-steel/10 transition-colors">Cancelar</button>
      </form>
    </div>

    <!-- Lista de Campanhas Ativas -->
    <div v-if="loading" role="status" aria-label="Carregando campanhas" class="flex justify-center py-10">
      <div class="animate-spin h-10 w-10 border-4 border-gold border-t-transparent rounded-full"></div>
    </div>
    <div v-else-if="loadError" role="alert" class="border border-red-400 rounded p-4">
      <p>{{ loadError }}</p>
      <button @click="loadCampaigns" class="text-gold underline mt-2">Tentar novamente</button>
    </div>
    <div v-else-if="campaigns.length === 0" class="text-center py-20 text-steel">
      <p>Nenhuma campanha encontrada.</p>
    </div>
    <div v-else class="space-y-6">
      <div v-for="camp in campaigns" :key="camp.id" class="bg-dark-card border border-gold/15 rounded-xl p-6 relative overflow-hidden">
        <div class="flex flex-wrap gap-3 justify-between items-start mb-4">
          <div class="min-w-0 max-w-full">
            <h2 class="break-words text-2xl font-bold text-gold">{{ camp.name }}</h2>
            <p class="text-steel flex flex-wrap gap-4 mt-1 text-sm">
              <span>Mestre: <span class="text-gold-light">{{ camp.master?.username }}</span></span>
              <span v-if="authStore.isMaster">Código: <span class="text-white font-mono bg-dark-bg px-2 py-0.5 rounded tracking-widest">{{ camp.joinCode }}</span></span>
            </p>
          </div>
          <div class="flex gap-2">
            <button v-if="authStore.isMaster" @click="manageInvites(camp)" class="px-4 py-1.5 border border-gold/50 text-gold rounded hover:bg-gold/10 text-sm transition-colors">
              Gerenciar Convites e Classes
            </button>
            <button v-else-if="!authStore.isMaster" :disabled="leaving.has(camp.id)" @click="leaveCampaign(camp.id)" class="px-4 py-1.5 border border-red-900/50 text-red-400 bg-red-900/10 rounded hover:bg-red-900/40 text-sm transition-colors disabled:opacity-50">
              Sair da Campanha
            </button>
          </div>
        </div>

        <div class="mt-4 border-t border-steel-dark/50 pt-4 flex gap-6">
          <div>
            <h4 class="text-xs uppercase text-steel font-bold mb-2">Membros ({{ camp.members?.length || 0 }})</h4>
            <div class="flex flex-wrap gap-2">
              <span v-for="m in camp.members" :key="m.id" 
                class="px-2 py-1 bg-dark-bg rounded text-xs border"
                :class="m.user.username === camp.master?.username ? 'border-gold text-gold' : 'border-steel-dark text-steel-light'">
                {{ m.user.username }}
              </span>
            </div>
          </div>
          <!-- TODO: Classes customizadas display here -->
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import { useRouter } from 'vue-router'
import { errorMessage } from '../utils/catalog'
import { notifyError, notifySuccess } from '../utils/toast'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const campaigns = ref<any[]>([])
const loadError = ref('')
const submitting = ref(false)
const leaving = ref(new Set<string>())

const showCreateCampaign = ref(false)
const newCampaignName = ref('')

const showJoinCampaign = ref(false)
const joinCodeInput = ref('')

onMounted(async () => {
  await loadCampaigns()
})

async function loadCampaigns() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.get('/api/campaigns')
    campaigns.value = res.data
  } catch (e) {
    loadError.value = errorMessage(e, 'Não foi possível carregar as campanhas.')
  } finally {
    loading.value = false
  }
}

async function createCampaign() {
  if (submitting.value || !newCampaignName.value.trim()) return
  submitting.value = true
  try {
    await api.post('/api/campaigns', { name: newCampaignName.value.trim() })
    newCampaignName.value = ''
    showCreateCampaign.value = false
    await loadCampaigns()
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível criar a campanha.'))
  } finally { submitting.value = false }
}

async function joinCampaign() {
  if (submitting.value || joinCodeInput.value.trim().length !== 6) return
  submitting.value = true
  try {
    await api.post('/api/campaigns/join', { joinCode: joinCodeInput.value.trim().toUpperCase() })
    notifySuccess('Solicitação enviada ao Mestre! Aguarde aprovação.')
    joinCodeInput.value = ''
    showJoinCampaign.value = false
  } catch (e: any) {
    notifyError(errorMessage(e, 'Não foi possível entrar na campanha.'))
  } finally { submitting.value = false }
}

async function leaveCampaign(campaignId: string) {
  if (leaving.value.has(campaignId)) return
  if (!confirm('Tem certeza que deseja sair desta campanha? Suas fichas ainda existirão, mas ficarão ocultas sem a campanha vinculada.')) return
  leaving.value.add(campaignId)
  try {
    await api.delete(`/api/campaigns/${campaignId}/members/${authStore.user?.id}`)
    await loadCampaigns()
  } catch (e: any) {
    notifyError(errorMessage(e, 'Não foi possível sair da campanha.'))
  } finally { leaving.value.delete(campaignId) }
}

function manageInvites(camp: any) {
  router.push(`/campaigns/${camp.id}/manage`)
}
</script>
