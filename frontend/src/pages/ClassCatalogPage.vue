<template>
  <main class="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div><h1 class="text-3xl font-bold text-gold">Catálogo de classes</h1><p class="text-steel-light mt-2">Consulte a progressão e escolha a base do seu personagem.</p></div>
      <div class="flex items-center gap-4"><router-link to="/characters/new" class="text-gold underline">Criar personagem</router-link><button v-if="auth.isMaster || ownedCampaigns.length" type="button" @click="startBuilder" class="px-4 py-2 bg-gold text-dark-bg rounded-lg font-semibold">Criar classe</button></div>
    </div>
    <p class="text-sm text-steel-light">Classes do Rulebook e variantes da campanha. A construção por pontos calcula a progressão conforme o Judge’s Journal; poderes e decisões de campanha ficam registrados na classe.</p>
    <div class="flex flex-wrap gap-3">
      <label class="flex-1 min-w-0">Buscar classe<input v-model="search" class="inp mt-1" placeholder="Nome da classe" /></label>
      <label class="flex-1 min-w-0">Campanha<select v-model="campaignId" :disabled="loadingCampaigns" class="inp mt-1"><option value="">Catálogo base</option><option v-for="c in campaigns" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
    </div>
    <p v-if="error" role="alert" class="text-red-400">{{ error }} <button @click="load" class="underline">Tentar novamente</button></p>
    <p v-if="campaignError" role="alert" class="text-red-400">{{ campaignError }} <button @click="loadCampaigns" class="underline">Tentar carregar campanhas novamente</button></p>
    <p v-if="loadingCampaigns" role="status">Carregando campanhas...</p>
    <section v-if="showBuilder" aria-label="Criar classe" class="space-y-3">
      <p v-if="!canManage" class="text-steel-light">Selecione uma campanha da qual você é mestre para salvar sua classe. <router-link v-if="!ownedCampaigns.length && !loadingCampaigns" to="/campaigns" class="text-gold underline">Criar campanha</router-link></p>
      <ClassPointBuilder v-if="canManage" :campaign-id="campaignId" open @created="onCreated"/>
    </section>
    <p v-if="loading" role="status">Carregando classes...</p>
    <div v-else class="grid md:grid-cols-3 gap-4">
      <button v-for="c in filtered" :key="c.id" @click="chosen = c" :aria-pressed="chosen?.id === c.id" class="text-left p-4 rounded-xl bg-dark-card border" :class="chosen?.id === c.id ? 'border-gold' : 'border-steel-dark'">
        <span class="text-xs text-steel-light">{{ c.source === 'catalog' ? 'Catálogo base' : classes.some(base => base.source==='catalog' && base.name===c.name) ? 'Variante da campanha' : 'Classe da campanha' }}</span>
        <h2 class="text-xl text-gold font-bold">{{ c.name }}</h2>
        <p>{{ c.hitDie }} · {{ classRows(c).length }} níveis</p>
        <p v-if="c.description" class="text-sm mt-2 line-clamp-3">{{ c.description }}</p>
      </button>
    </div>
    <p v-if="!loading && !filtered.length && !error">Nenhuma classe encontrada.</p>
    <section v-if="chosen" class="bg-dark-card p-4 rounded-xl space-y-4">
      <h2 class="text-2xl text-gold">{{ chosen.name }}</h2>
      <p v-if="chosen.description">{{ chosen.description }}</p>
      <details v-if="chosen.classFeatures" class="text-sm"><summary class="text-gold cursor-pointer">Características e restrições</summary><p class="whitespace-pre-wrap mt-2">{{ chosen.classFeatures }}</p></details>
      <div v-if="chosenPowers.length" class="grid sm:grid-cols-2 gap-2"><div v-for="(power,i) in chosenPowers" :key="i" class="flex gap-2 items-center rounded-lg border border-steel-dark p-3"><HelpTooltip :label="power.name">{{ power.description || 'Poder definido pelo mestre.' }}</HelpTooltip><span>{{ power.name }} <span v-if="power.minimumLevel && power.minimumLevel>1" class="text-sm text-steel-light">· nível {{ power.minimumLevel }}</span></span></div></div>
      <div class="flex flex-wrap gap-4">
        <router-link :to="{ path: '/characters/new', query: { campaignId, classKey: chosen.id } }" class="text-gold underline">Criar personagem desta classe</router-link>
        <router-link v-if="canManage" :to="{ path: `/campaigns/${campaignId}/manage`, query: chosen.source === 'catalog' ? { baseClass: chosen.id } : {} }" class="text-gold underline">{{ chosen.source === 'catalog' ? 'Copiar e personalizar na campanha' : 'Gerenciar classes da campanha' }}</router-link>
      </div>
      <p v-if="!campaignId && auth.isMaster" class="text-sm text-steel-light">Selecione uma campanha para criar uma classe personalizada a partir desta base.</p>
      <div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead><tr><th>Nível</th><th>XP</th><th>Título</th><th>Ataque</th><th>Morte</th><th>Paralisia</th><th>Explosão</th><th>Implementos</th><th>Magias</th></tr></thead><tbody>
        <tr v-for="row in classRows(chosen)" :key="row.level" class="border-t border-steel-dark"><td class="py-2">{{ row.level }}</td><td>{{ row.xp.toLocaleString('pt-BR') }}</td><td>{{ row.title }}</td><td>{{ row.attack }}</td><td>{{ row.saves?.death }}</td><td>{{ row.saves?.paralysis }}</td><td>{{ row.saves?.blast }}</td><td>{{ row.saves?.implements }}</td><td>{{ row.saves?.spells }}</td></tr>
      </tbody></table></div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'
import { getResource } from '../services/resources'
import { useAuthStore } from '../stores/auth'
import { classRows, errorMessage, type CatalogClass } from '../utils/catalog'
import ClassPointBuilder from '../components/ClassPointBuilder.vue'
import HelpTooltip from '../components/HelpTooltip.vue'
import { useRoute } from 'vue-router'
import { getClassFeats } from '../utils/classFeats'
const route=useRoute()
const auth = useAuthStore()
const campaigns = ref<{ id: string; name: string; masterId: string }[]>([])
const campaignId = ref('')
const classes = ref<CatalogClass[]>([])
const chosen = ref<CatalogClass | null>(null)
const chosenPowers=computed(()=>chosen.value?.powers || (chosen.value?.source==='catalog' ? getClassFeats(chosen.value.name,chosen.value.maxLevel||14).powers : []))
const search = ref(''), error = ref(''), loading = ref(false)
const campaignError = ref(''), loadingCampaigns = ref(false)
let requestId = 0
const filtered = computed(() => classes.value.filter(c => c.name.toLowerCase().includes(search.value.toLowerCase())))
const canManage = computed(() => campaigns.value.some(c => c.id === campaignId.value && c.masterId === auth.user?.id))
const ownedCampaigns=computed(()=>campaigns.value.filter(c=>c.masterId===auth.user?.id))
const showBuilder=ref(false)
function startBuilder(){showBuilder.value=true;if(!canManage.value&&ownedCampaigns.value.length)campaignId.value=ownedCampaigns.value[0]!.id}
async function onCreated(id:string){await load();chosen.value=classes.value.find(c=>c.id===id)||null}
async function load() {
  const id = ++requestId
  loading.value = true; error.value = ''; chosen.value = null
  try {
    const res = await getResource('/api/classes/catalog', { params: { campaignId: campaignId.value || undefined } })
    if (id === requestId) classes.value = res.data
  } catch (e) { if (id === requestId) { classes.value = []; error.value = errorMessage(e, 'Não foi possível carregar o catálogo.') } }
  finally { if (id === requestId) loading.value = false }
}
watch(campaignId, load)
async function loadCampaigns() {
  if (loadingCampaigns.value) return
  loadingCampaigns.value = true; campaignError.value = ''
  try { campaigns.value = (await api.get('/api/campaigns')).data;const requested=String(route.query.campaignId||'');if(!campaignId.value&&campaigns.value.some(c=>c.id===requested))campaignId.value=requested }
  catch (e) { campaignError.value = errorMessage(e, 'Não foi possível carregar campanhas.') }
  finally { loadingCampaigns.value = false }
}
onMounted(() => { void load(); void loadCampaigns() })
</script>
