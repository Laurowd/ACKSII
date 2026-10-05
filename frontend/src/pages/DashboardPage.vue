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
          <button v-if="canViewAudit" @click="toggleAudit" class="px-4 py-2 bg-dark-card border border-steel-dark text-gold hover:text-gold-light hover:border-gold rounded transition-all text-sm">
            {{ showAuditLog ? 'Ocultar histórico' : 'Histórico da campanha' }}
          </button>
          
          <!-- Campaign Filter -->
            <select v-if="campaigns.length > 0" v-model="globalCampaignFilter" aria-label="Filtrar fichas por campanha" class="max-w-full bg-dark-bg border border-steel-dark text-gold rounded px-3 py-2 text-sm">
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
    <div class="mb-6 grid gap-3 sm:grid-cols-[1fr_auto] rounded-xl border border-gold/15 bg-dark-card p-4">
      <label class="text-sm text-steel-light">Buscar personagens
        <input v-model="search" type="search" placeholder="Nome, classe ou jogador" class="mt-1 w-full rounded-lg border border-steel-dark bg-dark-bg px-3 py-2 text-dark-text focus:border-gold" />
      </label>
      <label class="text-sm text-steel-light">Ordenar personagens
        <select v-model="sort" class="mt-1 w-full rounded-lg border border-steel-dark bg-dark-bg px-3 py-2 text-dark-text">
          <option value="updated">Atualizados recentemente</option><option value="name">Nome (A–Z)</option><option value="level">Maior nível</option>
        </select>
      </label>
      <p v-if="!loading && !loadError" role="status" class="text-xs text-steel-light sm:col-span-2">{{ filteredCharacters.length }} de {{ characters.length }} personagens</p>
    </div>
    <nav v-if="!loading && !loadError && recent.length && !search" aria-label="Personagens recentes" class="mb-6">
      <p class="mb-2 text-xs uppercase tracking-wider text-steel-light">Abertos recentemente</p>
      <div class="flex flex-wrap gap-2"><router-link v-for="character in recent" :key="character.id" :to="`/character/${character.id}`" class="rounded-full border border-gold/20 bg-dark-card px-3 py-2 text-sm text-gold hover:border-gold focus-visible:outline-2">{{ character.characterName || 'Sem nome' }}</router-link></div>
    </nav>
    <!-- Loading -->
    <div v-if="loading" role="status" aria-label="Carregando personagens" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <span class="sr-only">Carregando personagens…</span>
      <div v-for="n in 6" :key="n" aria-hidden="true" class="rounded-xl border border-steel-dark bg-dark-card p-5 motion-safe:animate-pulse"><div class="h-5 w-2/3 rounded bg-steel-dark/50 mb-3"></div><div class="h-3 w-1/2 rounded bg-steel-dark/40 mb-6"></div><div class="h-12 rounded bg-steel-dark/30"></div></div>
    </div>

    <div v-else-if="loadError" role="alert" class="rounded-lg border border-red-400 p-4 mb-6">
      <p>{{ loadError }}</p>
      <button type="button" @click="loadCharacters" class="text-gold underline mt-2">Tentar novamente</button>
    </div>
    <!-- Empty state -->
    <div v-else-if="filteredCharacters.length === 0" class="text-center py-20">
      <div class="text-6xl mb-4 opacity-50">#</div>
      <h3 class="text-xl text-steel-light mb-2">Nenhum personagem encontrado {{ globalCampaignFilter && globalCampaignFilter !== 'ALL' ? 'nesta campanha' : '' }}</h3>
      <p class="text-steel mb-6">{{ characters.length ? 'Experimente outro nome, classe ou campanha.' : 'Crie seu primeiro personagem para começar a aventura!' }}</p>
      <button v-if="characters.length" @click="search = ''; globalCampaignFilter = 'ALL'" class="text-gold underline mr-4">Limpar filtros</button>
      <button @click="createCharacter"
        class="px-6 py-3 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
               hover:from-gold hover:to-gold-light transition-all">
        Criar Personagem
      </button>
    </div>

    <!-- Master view -> grouped by player -->
    <div v-if="showAuditLog && authStore.isMaster" class="mb-8 bg-dark-card border border-gold/20 rounded-xl p-5 animate-slide-in">
      <h2 class="text-xl font-bold text-gold mb-4 border-b border-steel-dark pb-2">Histórico — {{ selectedCampaign?.name }}</h2>
      <label class="block text-sm text-steel-light mb-4">Tipo de operação
        <select v-model="auditAction" aria-label="Tipo de operação" @change="auditPage = 1; loadAudit()" class="inp mt-1" :disabled="loadingLogs">
          <option value="">Todas as operações</option><option value="REWARD_SETTLEMENT">Distribuição de XP e ouro</option>
          <option value="REWARD_RECEIVED">Recompensas individuais</option><option value="XP_ADJUSTMENT">Correções de XP</option>
          <option value="ADVENTURE_SETTLEMENT">Aventuras</option><option value="LEVEL_ADVANCEMENT">Avanços de nível</option><option value="SPELL_CAST">Conjuração</option>
        </select>
      </label>
      <div v-if="loadingLogs" role="status" class="text-steel-light text-center py-4">Carregando histórico…</div>
      <div v-else-if="auditError" role="alert" class="text-red-400"><p>{{ auditError }}</p><button @click="loadAudit" class="text-gold underline mt-2">Tentar carregar histórico novamente</button></div>
      <div v-else-if="auditLogs.length === 0" class="text-steel text-center py-4 border border-dashed border-steel-dark rounded-lg">Nenhuma alteração recente registrada.</div>
      <ul v-else class="space-y-3 max-h-100 overflow-y-auto pr-2 scrollbar-hide">
        <li v-for="log in auditLogs" :key="log.id" class="text-sm border-b border-steel-dark/30 pb-2 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <span class="text-gold-dark font-bold">{{ log.user?.username || 'Sistema' }}</span> 
            <span class="text-steel"> · {{ presentAudit(log).subject }}</span>
            <strong class="block text-gold mt-1">{{ presentAudit(log).title }}</strong>
            <p v-for="(line, i) in presentAudit(log).lines" :key="i" class="text-steel-light break-words">{{ line }}</p>
          </div>
          <span class="text-[10px] text-steel shrink-0 mt-1 md:mt-0">{{ new Date(log.createdAt).toLocaleString('pt-BR') }}</span>
        </li>
      </ul>
      <div v-if="!auditError" class="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
        <button @click="auditPage--; loadAudit()" :disabled="loadingLogs || auditPage <= 1" class="text-gold disabled:opacity-40">Página anterior</button>
        <span role="status">Página {{ auditPage }} de {{ auditPages }} · {{ auditTotal }} registros</span>
        <button @click="auditPage++; loadAudit()" :disabled="loadingLogs || auditPage >= auditPages" class="text-gold disabled:opacity-40">Próxima página</button>
      </div>
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
              <span>PV: {{ char.hpCurr }}/{{ char.hpMax }}</span>
          <span>XP: {{ (char.xp ?? 0).toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import { errorMessage } from '../utils/catalog'
import { notifyError, notifySuccess } from '../utils/toast'
import CharacterImportDialog from '../components/CharacterImportDialog.vue'
import { filterCharacters, recentCharacters, type CharacterSort } from '../utils/characterList'
import { presentAudit } from '../utils/auditPresentation'

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
const search = ref('')
const sort = ref<CharacterSort>('updated')
const visits = recentCharacters(authStore.user?.id || '')
const recent = computed(() => visits.read().map(id => filteredCharacters.value.find(c => c.id === id)).filter(Boolean))
const deleting = ref(new Set<string>())

const showAuditLog = ref(false)
const loadingLogs = ref(false)
const auditLogs = ref<any[]>([])
const auditError=ref('')
const auditAction=ref(''),auditPage=ref(1),auditPages=ref(1),auditTotal=ref(0)
const selectedCampaign=computed(()=>campaigns.value.find(c=>c.id===globalCampaignFilter.value))
const canViewAudit=computed(()=>authStore.isMaster && selectedCampaign.value?.masterId===authStore.user?.id)
let auditRequest=0
function clearAudit(){auditRequest++;showAuditLog.value=false;auditLogs.value=[];auditError.value='';loadingLogs.value=false;auditPage.value=1;auditAction.value='';auditTotal.value=0;auditPages.value=1}
watch(globalCampaignFilter,clearAudit,{flush:'sync'})
onBeforeUnmount(clearAudit)

async function toggleAudit() {
  if(!canViewAudit.value)return
  showAuditLog.value = !showAuditLog.value
  if(showAuditLog.value)await loadAudit()
  else auditRequest++
}
async function loadAudit() {
  if(showAuditLog.value && canViewAudit.value){
    const request=++auditRequest,campaignId=globalCampaignFilter.value
    auditLogs.value=[];auditError.value=''
    loadingLogs.value = true
    try {
      const res = await api.get(`/api/campaigns/${campaignId}/audit`, { params: { page: auditPage.value, action: auditAction.value || undefined } })
      if(request===auditRequest){auditLogs.value = res.data.items || res.data;auditPages.value=res.data.pages || 1;auditTotal.value=res.data.total ?? auditLogs.value.length}
    } catch (e) { if(request===auditRequest)auditError.value=errorMessage(e, 'Não foi possível carregar o histórico.') }
    finally { if(request===auditRequest)loadingLogs.value = false }
  }
}

const filteredCharacters = computed(() => filterCharacters(characters.value, globalCampaignFilter.value, search.value, sort.value))

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
    const res = await api.get('/api/characters', { params: { view: 'summary' } })
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

