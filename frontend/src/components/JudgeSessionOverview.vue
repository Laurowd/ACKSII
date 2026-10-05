<template>
  <section class="session-overview" aria-label="Resumo da sessão" :aria-busy="loading">
    <div class="session-toolbar">
      <div class="session-toolbar-filters">
        <label class="session-filter-label">Campanha
          <select v-model="campaignId" class="inp" :disabled="loading && !loaded">
            <option value="">Todos os personagens</option>
            <option v-for="campaign in campaigns" :key="campaign.id" :value="campaign.id">{{ campaign.name }}</option>
            <option v-if="characters.some(character => !character.campaignId)" value="unassigned">Personagens avulsos</option>
          </select>
        </label>
        <label class="session-filter-label">Personagem ou jogador
          <input v-model="search" type="search" class="inp" placeholder="Filtrar o grupo…" />
        </label>
      </div>
      <div class="session-refresh-group">
        <label class="text-xs text-steel-light flex items-center gap-2"><input v-model="autoRefresh" type="checkbox" /> Atualizar automaticamente</label>
        <p class="text-xs text-steel" aria-live="polite">{{ updatedAt ? `Atualizado às ${updatedAt}` : 'Aguardando dados da sessão' }}</p>
        <button @click="loadSession" :disabled="loading" class="session-refresh-button">{{ loading ? 'Atualizando…' : 'Atualizar grupo' }}</button>
      </div>
    </div>

    <div v-if="loadError" role="alert" class="session-error">
      <div><p class="font-semibold">Não foi possível atualizar o grupo.</p><p class="text-sm mt-1">{{ loadError }}</p>
        <p v-if="loaded" class="text-sm mt-1">Os valores abaixo são da última atualização bem-sucedida.</p>
      </div>
      <button @click="loadSession" :disabled="loading" class="session-refresh-button">Tentar novamente</button>
    </div>

    <div v-if="loading && !loaded" role="status" class="session-empty">
      <span class="session-loader" aria-hidden="true"></span>
      <p>Carregando personagens e recursos de magia…</p>
    </div>
    <template v-else-if="loaded">
      <div class="session-summary" aria-live="polite">
        <p><strong>{{ rows.length }}</strong> {{ rows.length === 1 ? 'personagem' : 'personagens' }} no grupo</p>
        <p v-if="woundedCount" class="session-warning">{{ woundedCount }} {{ woundedCount === 1 ? 'precisa' : 'precisam' }} de atenção nos PV</p>
        <p v-else-if="rows.length" class="text-steel">Todos acima da metade dos PV</p>
      </div>
      <div v-if="characters.length" class="mb-4 space-y-3">
        <button type="button" @click="showRewards = !showRewards" class="session-refresh-button">{{ showRewards ? 'Fechar distribuição de recompensas' : 'Distribuir XP e ouro' }}</button>
        <template v-if="showRewards">
          <RewardsPanel v-if="campaignId" :key="campaignId" :campaign-id="campaignId === 'unassigned' ? null : campaignId" :characters="characters.filter(character => character.campaignId === (campaignId === 'unassigned' ? null : campaignId))" :refresh="loadSession" />
          <p v-else class="text-sm text-gold">Selecione uma campanha acima para distribuir as recompensas do grupo.</p>
        </template>
      </div>
      <div v-if="!rows.length" class="session-empty">
        <h2 class="text-xl text-gold">{{ search ? 'Nenhum personagem encontrado' : 'O grupo ainda está vazio' }}</h2>
        <p class="max-w-md text-sm text-steel-light">{{ search ? 'Tente outro nome ou selecione uma campanha diferente.' : 'Crie uma ficha ou aceite jogadores em sua campanha para acompanhar seus personagens aqui.' }}</p>
        <router-link to="/campaigns" class="session-refresh-button">Ver campanhas</router-link>
      </div>
      <div v-else class="session-table-wrap">
        <table class="session-table">
          <caption class="sr-only">Recursos atuais dos personagens. Salvamentos: morte, implementos, paralisia, explosão e magias.</caption>
          <thead><tr>
            <th scope="col">Personagem</th><th scope="col">PV</th><th scope="col">CA</th>
            <th scope="col">Movimento</th><th scope="col">Salvamentos</th><th scope="col">Magia restante / dia</th>
          </tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.character.id" :data-hp-status="row.hpStatus">
              <th scope="row" class="session-character-cell">
                <router-link :to="`/character/${row.character.id}`" class="session-character-name">{{ row.character.characterName }}</router-link>
                <span class="session-character-meta">{{ row.character.className }} · Nível {{ row.character.level }}</span>
                <span class="session-character-player">{{ row.character.user?.username || 'Sem jogador' }}<template v-if="!campaignId"> · {{ campaignName(row.character.campaignId) }}</template></span>
              </th>
              <td data-label="PV"><div class="session-hp-cell">
                <div class="session-hp-number"><strong>{{ row.character.hpCurr }}</strong><span>/ {{ row.character.hpMax }}</span><span v-if="row.hpStatus !== 'Pronto'" class="session-hp-status">{{ row.hpStatus }}</span></div>
                <div class="session-hp-bar" aria-hidden="true"><span :style="{ width: `${row.hpRatio}%` }"></span></div>
              </div></td>
              <td data-label="CA"><strong class="session-stat" :title="`Sem armadura: ${row.metrics.armorClass.noArmor}; sem escudo: ${row.metrics.armorClass.noShield}; com escudo: ${row.metrics.armorClass.withShield}`">{{ row.metrics.armorClass.noShield }}</strong><span class="session-cell-detail">{{ row.metrics.armorClass.withShield }} c/ escudo</span></td>
              <td data-label="Movimento"><strong class="session-stat">{{ row.metrics.encumbrance.moveCombat }}′</strong><span class="session-cell-detail">{{ row.metrics.encumbrance.moveExploration }}′ exploração</span><span v-if="row.metrics.encumbrance.overCapacity" class="session-hp-status">Carga excedida</span></td>
              <td data-label="Salvamentos"><dl class="session-saves">
                <div v-for="save in saves" :key="save.key"><dt :title="save.label">{{ save.short }}</dt><dd>{{ row.character[save.key] }}</dd></div>
              </dl></td>
              <td data-label="Magia restante / dia">
                <div v-if="row.resources.length" class="session-magic-resources"><span v-for="resource in row.resources" :key="resource.key" class="session-resource" :class="{ 'session-resource-empty': resource.remaining === 0 }" :title="`${magicTraditionName(resource.tradition)}, nível ${resource.level}`">{{ magicTraditionName(resource.tradition) }} {{ resource.level }}: <strong>{{ resource.remaining }}/{{ resource.total }}</strong></span></div>
                <span v-else class="text-steel text-sm">{{ row.character.magic?.supported === false && row.character.isSpellcaster ? 'Controle manual na ficha' : 'Sem conjuração neste nível' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="rows.length" class="session-legend">CA sem escudo; o valor com escudo aparece abaixo. Movimento em pés por rodada. Salvamentos: Morte · Implementos · Paralisia · Explosão · Magias. Atualização a cada 30 segundos enquanto esta página está visível; pausada durante a distribuição de recompensas.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import api from '../services/api'
import RewardsPanel from './RewardsPanel.vue'
import { useVisiblePolling } from '../composables/visiblePolling'
import { errorMessage } from '../utils/catalog'
import { calculateCharacterMetrics } from '../utils/characterMetrics'
import { magicTraditionName, sessionHpRatio, sessionHpStatus, sessionMagicResources, type SessionMagic } from '../utils/judgeSession'

interface SessionCharacter {
  id: string; characterName: string; className: string; level: number; campaignId: string | null
  hpCurr: number; hpMax: number; isSpellcaster: boolean; user?: { username: string }
  classDefinition?: any; magic?: SessionMagic; [key: string]: any
}

const campaigns = ref<Array<{ id: string; name: string }>>([])
const characters = ref<SessionCharacter[]>([])
const campaignId = ref('')
const showRewards = ref(false)
const search = ref('')
const loading = ref(false)
const loaded = ref(false)
const loadError = ref('')
const updatedAt = ref('')
const autoRefresh = ref(true)
let requestId = 0

const saves = [
  { key: 'saveDeath', short: 'M', label: 'Morte' },
  { key: 'saveImplements', short: 'I', label: 'Implementos' },
  { key: 'saveParalysis', short: 'P', label: 'Paralisia' },
  { key: 'saveBlast', short: 'E', label: 'Explosão' },
  { key: 'saveSpells', short: 'Mg', label: 'Magias' },
]

const rows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('pt-BR')
  return characters.value.filter(character => {
    const inCampaign = !campaignId.value || (campaignId.value === 'unassigned' ? !character.campaignId : character.campaignId === campaignId.value)
    return inCampaign && (!query || `${character.characterName} ${character.user?.username || ''}`.toLocaleLowerCase('pt-BR').includes(query))
  }).sort((a, b) => a.characterName.localeCompare(b.characterName, 'pt-BR')).map(character => ({
    character, metrics: calculateCharacterMetrics(character, character.classDefinition),
    resources: sessionMagicResources(character.magic),
    hpRatio: sessionHpRatio(character.hpCurr, character.hpMax), hpStatus: sessionHpStatus(character.hpCurr, character.hpMax),
  }))
})

const woundedCount = computed(() => rows.value.filter(row => row.hpStatus !== 'Pronto').length)
function campaignName(id: string | null) { return campaigns.value.find(campaign => campaign.id === id)?.name || 'Avulso' }

async function loadSession(signal?: AbortSignal | Event) {
  if (loading.value) return
  const id = ++requestId
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/api/session', { signal: signal instanceof AbortSignal ? signal : undefined })
    if (signal instanceof AbortSignal && (signal.aborted || showRewards.value)) return
    if (id !== requestId) return
    campaigns.value = response.data.campaigns
    characters.value = response.data.characters
    if (campaignId.value !== 'unassigned' && !campaigns.value.some(campaign => campaign.id === campaignId.value)) campaignId.value = ''
    updatedAt.value = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())
    loaded.value = true
  } catch (error) {
    if (id === requestId) loadError.value = errorMessage(error, 'Confira sua conexão e tente novamente.')
  } finally {
    if (id === requestId) loading.value = false
  }
}

onMounted(loadSession)
useVisiblePolling(signal => loadSession(signal), () => !autoRefresh.value || showRewards.value || loading.value)
onBeforeUnmount(() => { requestId++ })
</script>
