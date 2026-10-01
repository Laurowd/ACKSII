<template>
  <div class="max-w-6xl mx-auto p-4 sm:p-6 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-wrap gap-4 items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gold">
          {{ authStore.isMaster ? 'Painel do Mestre' : 'Meus Personagens' }}
        </h1>
        <p class="text-steel-light mt-1">
          {{ authStore.isMaster ? 'Gerencie todas as fichas dos jogadores' : 'Gerencie suas fichas de personagem' }}
        </p>
      </div>
      <div class="flex min-w-0 max-w-full flex-col items-end gap-2">
        <div class="flex flex-wrap max-w-full gap-2">
          <button v-if="authStore.isMaster && globalCampaignFilter !== 'ALL' && globalCampaignFilter !== ''" @click="toggleAudit" class="px-4 py-2 bg-dark-card border border-steel-dark text-gold hover:text-gold-light hover:border-gold rounded transition-all text-sm">
            {{ showAuditLog ? 'Ocultar Logs' : 'Log de Alterações' }}
          </button>
          
          <!-- Campaign Filter -->
            <select v-if="campaigns.length > 0" v-model="globalCampaignFilter" @change="showAuditLog = false" aria-label="Filtrar fichas por campanha" class="max-w-full bg-dark-bg border border-steel-dark text-gold rounded px-3 py-2 text-sm">
            <option value="ALL">Todas as Fichas</option>
            <option :value="''">Sem Campanha vinculada</option>
            <option v-for="c in campaigns" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>

          <button @click="showImport = true" class="rounded-lg border border-gold/30 px-4 py-2 text-gold hover:bg-gold/10">Importar JSON</button>
          <button @click="createCharacter"
            class="px-5 py-2.5 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
                   hover:from-gold hover:to-gold-light transform hover:scale-105 transition-all duration-200 flex items-center gap-2">
            <span class="text-lg">+</span> Nova Ficha
          </button>
        </div>
        <p v-if="authStore.isMaster && campaigns.length > 0" class="text-xs text-steel-light">
          Filtrando fichas por campanha
        </p>
      </div>
    </div>

    <CharacterImportDialog v-if="showImport" :campaigns="campaigns" :initial-campaign-id="globalCampaignFilter === 'ALL' ? '' : globalCampaignFilter" @close="showImport = false" @imported="onImported" />
    <!-- Loading -->
    <div v-if="loading" role="status" aria-label="Carregando personagens" class="flex justify-center py-20">
      <div class="animate-spin h-12 w-12 border-4 border-gold border-t-transparent rounded-full"></div>
    </div>

    <div v-else-if="loadError" role="alert" class="rounded-lg border border-red-400 p-4 mb-6">
      <p>{{ loadError }}</p>
      <button type="button" @click="loadCharacters" class="text-gold underline mt-2">Tentar novamente</button>
    </div>
    <!-- Empty state -->
    <div v-else-if="filteredCharacters.length === 0" class="text-center py-20">
      <div class="text-6xl mb-4 opacity-50">#</div>
      <h3 class="text-xl text-steel-light mb-2">Nenhum personagem encontrado {{ globalCampaignFilter && globalCampaignFilter !== 'ALL' ? 'nesta campanha' : '' }}</h3>
      <p class="text-steel mb-6">Crie seu primeiro personagem para começar a aventura!</p>
      <button @click="createCharacter"
        class="px-6 py-3 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
               hover:from-gold hover:to-gold-light transition-all">
        Criar Personagem
      </button>
    </div>

    <!-- Master view -> grouped by player -->
    <div v-if="showAuditLog && authStore.isMaster" class="mb-8 bg-dark-card border border-gold/20 rounded-xl p-5 animate-slide-in">
      <h2 class="text-xl font-bold text-gold mb-4 border-b border-steel-dark pb-2">Log de Alterações - Campanha</h2>
      <div v-if="loadingLogs" class="text-steel-light text-center py-4">Carregando logs...</div>
      <div v-else-if="auditLogs.length === 0" class="text-steel text-center py-4 border border-dashed border-steel-dark rounded-lg">Nenhuma alteração recente registrada.</div>
      <ul v-else class="space-y-3 max-h-100 overflow-y-auto pr-2 scrollbar-hide">
        <li v-for="log in auditLogs" :key="log.id" class="text-sm border-b border-steel-dark/30 pb-2 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <span class="text-gold-dark font-bold">{{ log.user?.username || 'Sistema' }}</span> 
            <span class="text-steel"> editou a ficha de </span> 
            <span class="font-bold text-steel-light">{{ log.character?.characterName || 'Desconhecido' }}</span>: 
            <span class="text-gold ml-1">{{ log.details }}</span> 
          </div>
          <span class="text-[10px] text-steel shrink-0 mt-1 md:mt-0">{{ new Date(log.createdAt).toLocaleString('pt-BR') }}</span>
        </li>
      </ul>
    </div>

    <!-- Master view -> grouped by player -->
    <div v-else-if="!loading && !loadError && authStore.isMaster" class="space-y-8">
      <div v-for="group in groupedCharacters" :key="group.username" class="animate-fade-in">
        <h2 class="text-2xl font-bold text-gold border-b border-steel-dark pb-2 mb-4">
          {{ group.username === authStore.user?.username ? 'Minhas Fichas (Mestre)' : `Fichas de: ${group.username}` }}
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="(char, idx) in group.characters" :key="char.id"
            class="bg-dark-card border border-gold/15 rounded-xl p-5 hover:border-gold/40 
                   relative transition-all duration-300 group hover:shadow-lg hover:shadow-gold/5 animate-slide-in"
            :style="{ animationDelay: `${idx * 80}ms` }"
            >
            
            <!-- Card header -->
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-lg font-bold text-gold group-hover:text-gold-light transition-colors">
                  <router-link :to="`/character/${char.id}`" class="after:absolute after:inset-0 break-words">{{ char.characterName || 'Sem nome' }}</router-link>
                </h3>
                <p class="text-sm text-steel-light">{{ char.className || 'Sem classe' }} • Nível {{ char.level }}</p>
              </div>
              <button @click.stop="deleteCharacter(char.id)" 
                class="relative z-10 text-crimson-light hover:text-crimson transition-all p-2 disabled:opacity-50" :disabled="deleting.has(char.id)" :aria-label="`Excluir ${char.characterName || 'personagem sem nome'}`"
                title="Deletar">
                X
              </button>
            </div>

            <!-- Stats mini -->
            <div class="grid grid-cols-6 gap-1 mb-3">
              <div v-for="attr in ['str','int','dex','wil','con','cha']" :key="attr"
                class="text-center bg-dark-bg rounded-lg py-1.5">
                <div class="text-[10px] text-steel uppercase font-bold">{{ attr }}</div>
                <div class="text-sm font-bold text-dark-text">{{ char[attr] }}</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between text-xs text-steel">
              <span>PV: {{ char.hpCurr }}/{{ char.hpMax }}</span>
              <span>XP: {{ (char.xp ?? 0).toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Player Character cards -->
    <div v-else-if="!loading && !loadError" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="(char, idx) in filteredCharacters" :key="char.id"
           class="bg-dark-card border border-gold/15 rounded-xl p-5 hover:border-gold/40 
                  relative transition-all duration-300 group hover:shadow-lg hover:shadow-gold/5 animate-slide-in"
           :style="{ animationDelay: `${idx * 80}ms` }"
           >
        
        <!-- Card header -->
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-lg font-bold text-gold group-hover:text-gold-light transition-colors">
              <router-link :to="`/character/${char.id}`" class="after:absolute after:inset-0 break-words">{{ char.characterName || 'Sem nome' }}</router-link>
            </h3>
            <p class="text-sm text-steel-light">{{ char.className || 'Sem classe' }} • Nível {{ char.level }}</p>
          </div>
          <button @click.stop="deleteCharacter(char.id)" 
            class="relative z-10 text-crimson-light hover:text-crimson transition-all p-2 disabled:opacity-50" :disabled="deleting.has(char.id)" :aria-label="`Excluir ${char.characterName || 'personagem sem nome'}`"
            title="Deletar">
            X
          </button>
        </div>

        <!-- Stats mini -->
        <div class="grid grid-cols-6 gap-1 mb-3">
          <div v-for="attr in ['str','int','dex','wil','con','cha']" :key="attr"
            class="text-center bg-dark-bg rounded-lg py-1.5">
            <div class="text-[10px] text-steel uppercase font-bold">{{ attr }}</div>
            <div class="text-sm font-bold text-dark-text">{{ char[attr] }}</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between text-xs text-steel">
          <span>HP: {{ char.hpCurr }}/{{ char.hpMax }}</span>
          <span>XP: {{ (char.xp ?? 0).toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import { errorMessage } from '../utils/catalog'
import { notifyError, notifySuccess } from '../utils/toast'
import CharacterImportDialog from '../components/CharacterImportDialog.vue'

const authStore = useAuthStore()
const router = useRouter()
const showImport = ref(false)
async function onImported(id: string, warnings: string[]) {
  showImport.value = false
  notifySuccess('Ficha importada. ' + warnings.join(' '))
  await router.push('/character/' + id)
}
const characters = ref<any[]>([])
const campaigns = ref<any[]>([])
const globalCampaignFilter = ref<string | 'ALL'>('ALL')
const loading = ref(true)
const loadError = ref('')
const deleting = ref(new Set<string>())

const showAuditLog = ref(false)
const loadingLogs = ref(false)
const auditLogs = ref<any[]>([])

async function toggleAudit() {
  showAuditLog.value = !showAuditLog.value
  if (showAuditLog.value && globalCampaignFilter.value && globalCampaignFilter.value !== 'ALL') {
    loadingLogs.value = true
    try {
      const res = await api.get(`/api/campaigns/${globalCampaignFilter.value}/audit`)
      auditLogs.value = res.data
    } catch (e) { notifyError(errorMessage(e, 'Não foi possível carregar o histórico.')) }
    finally { loadingLogs.value = false }
  }
}

const filteredCharacters = computed(() => {
  if (globalCampaignFilter.value === 'ALL') return characters.value
  return characters.value.filter(char => {
    if (globalCampaignFilter.value === '') return char.campaignId === null
    return char.campaignId === globalCampaignFilter.value
  })
})

const groupedCharacters = computed(() => {
  const groups: Record<string, any[]> = Object.create(null)
  filteredCharacters.value.forEach(char => {
    const username = char.user?.username || 'Desconhecido'
    if (!groups[username]) groups[username] = []
    groups[username].push(char)
  })

  // Retorna um array ordenado onde as fichas do usuário atual (geralmente o mestre) ficam no topo
  return Object.keys(groups).sort((a, b) => {
    const myUsername = authStore.user?.username || ''
    if (a === myUsername) return -1
    if (b === myUsername) return 1
    return a.localeCompare(b)
  }).map(username => ({
    username,
    characters: groups[username]
  }))
})

onMounted(async () => {
  await Promise.all([loadCampaigns(), loadCharacters()])
})

async function loadCampaigns() {
  try {
    const res = await api.get('/api/campaigns')
    campaigns.value = res.data
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar os filtros de campanha.'))
  }
}

async function loadCharacters() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.get('/api/characters')
    characters.value = res.data.characters
  } catch (e) {
    loadError.value = errorMessage(e, 'Não foi possível carregar os personagens. Tente novamente.')
  } finally {
    loading.value = false
  }
}

async function createCharacter() {
  const campaignId = globalCampaignFilter.value !== 'ALL' ? globalCampaignFilter.value : ''
  await router.push({ path: '/characters/new', query: { campaignId } })
}

async function deleteCharacter(id: string) {
  if (deleting.value.has(id)) return
  if (!confirm('Tem certeza que deseja deletar este personagem?')) return
  deleting.value.add(id)
  try {
    await api.delete(`/api/characters/${id}`)
    characters.value = characters.value.filter(c => c.id !== id)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível excluir o personagem.'))
  } finally { deleting.value.delete(id) }
}
</script>

