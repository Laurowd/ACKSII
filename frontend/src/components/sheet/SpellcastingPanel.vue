<template>
  <section class="bg-dark-card border border-gold/20 rounded-xl p-4 sm:p-5 space-y-4" aria-labelledby="spellcasting-title">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="spellcasting-title" class="text-xl font-bold text-gold">Conjuração e descanso</h2>
        <p class="text-sm text-steel-light mt-1">Usos calculados pela classe, nível e tradição do personagem.</p>
      </div>
      <button type="button" @click="load" :disabled="busy || loading" class="text-sm text-gold underline disabled:opacity-50">Atualizar usos</button>
    </div>
    <p v-if="error" role="alert" class="text-red-400 text-sm">{{ error }}</p>
    <p v-if="notice" role="status" class="text-green-400 text-sm">{{ notice }}</p>
    <p v-if="loading" role="status" class="text-sm text-steel-light">Carregando o repertório...</p>
    <template v-else-if="info.supported && info.magic?.length">
      <div class="grid gap-4 lg:grid-cols-2">
        <div v-for="pool in info.magic" :key="pool.tradition" class="rounded-lg border border-steel-dark bg-dark-bg/30 p-4">
          <h3 class="font-bold text-gold">{{ traditionName(pool.tradition) }} · conjurador {{ pool.casterLevel }}</h3>
          <p class="text-xs text-steel-light mt-1">Recuperação por {{ pool.studious ? 'estudo' : 'oração' }} · usos restantes / limite diário</p>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
            <div v-for="(slots, i) in pool.slots" :key="i" class="rounded-lg border border-steel-dark p-2 text-center">
              <span class="block text-xs text-steel-light">Nível {{ Number(i) + 1 }}</span>
              <strong class="block text-lg" :class="remaining(pool.tradition, Number(i) + 1) > 0 ? 'text-gold' : 'text-steel'">{{ remaining(pool.tradition, Number(i) + 1) }} <span class="text-xs font-normal text-steel-light">/ {{ slots }}</span></strong>
              <span class="block text-[10px] text-steel-light">{{ pool.repertoire[i] == null ? 'Magias da ordem' : `Limite de magias: ${pool.repertoire[i]}` }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <section class="space-y-3" aria-labelledby="character-spells-title">
      <div>
        <h3 id="character-spells-title" class="font-bold text-gold">Magias do personagem</h3>
        <p class="text-sm text-steel-light mt-1">Consulte o efeito na interrogação de cada magia. Conjurar registra o gasto de um uso diário.</p>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <label class="text-sm text-steel-light flex-1 min-w-40">Buscar magia<input v-model="spellSearch" type="search" class="inp mt-1" placeholder="Nome da magia" /></label>
        <label class="text-sm text-steel-light flex items-center gap-2 py-2"><input v-model="favoritesOnly" type="checkbox" /> Apenas favoritas</label>
      </div>
      <p v-if="descriptionsLoading" role="status" class="text-sm text-steel-light">Carregando descrições das magias...</p>
      <div v-if="descriptionsError" role="alert" class="text-sm text-red-400">
        <p>{{ descriptionsError }}</p><button type="button" @click="emit('retry-descriptions')" :disabled="descriptionsLoading" class="mt-2 text-gold underline">Tentar carregar descrições novamente</button>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <section v-for="group in spellGroups" :key="group.level" :aria-label="group.level ? `Magias de nível ${group.level}` : 'Magias sem nível'" class="rounded-xl border border-steel-dark bg-dark-bg/30 p-3 sm:p-4">
          <h4 class="font-bold text-gold mb-3">{{ group.level ? `Nível ${group.level}` : 'Nível não informado' }}</h4>
          <ul class="space-y-2">
            <li v-for="spell in group.spells" :key="spell.id" class="flex flex-wrap gap-3 items-center justify-between rounded-lg bg-dark-card px-3 py-3">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <button type="button" @click="toggleFavorite(spell)" :aria-label="`${isFavorite(spell) ? 'Remover dos favoritos' : 'Favoritar'} ${spell.name}`" :aria-pressed="isFavorite(spell)" class="text-gold text-lg shrink-0">{{ isFavorite(spell) ? '★' : '☆' }}</button>
                <HelpTooltip :label="spell.name || 'Magia sem nome'">{{ spellDescription(spell) }}</HelpTooltip>
                <div class="min-w-0"><strong class="block break-words text-dark-text">{{ spell.name || 'Magia sem nome' }}</strong><span class="block text-xs text-steel-light">{{ traditionName(spellTradition(info, spell)) }}</span></div>
              </div>
              <button v-if="info.supported && info.magic?.length" type="button" @click="cast(spell.id)" :disabled="busy || loading || !canCast(spell)" :aria-label="`Conjurar ${spell.name || 'magia'}`" class="px-3 py-2 rounded-lg text-sm font-bold bg-gold/15 text-gold hover:bg-gold/25 disabled:opacity-40 disabled:cursor-not-allowed">Conjurar</button>
            </li>
          </ul>
        </section>
      </div>
      <p v-if="!character.spells?.length" class="text-sm text-steel-light rounded-lg border border-dashed border-steel-dark p-4">Nenhuma magia registrada para este personagem.</p>
      <p v-else-if="!spellGroups.length" role="status" class="text-sm text-steel-light">Nenhuma magia corresponde aos filtros. <button type="button" @click="spellSearch = ''; favoritesOnly = false" class="text-gold underline">Limpar filtros</button></p>
      <p v-if="info.supported && info.magic?.length" class="text-xs text-steel-light">O repertório é a lista de magias disponíveis para o personagem. Os usos diários são compartilhados entre as magias de cada nível e tradição.</p>
      <p v-if="info.supported && info.magic?.length" class="text-xs text-steel-light">Magias interrompidas também gastam um uso. Não há preparação prévia de magias.</p>
      <details v-if="!compact && info.supported && info.magic?.length && !loading" :open="repertoireDraft.open" class="border border-steel-dark p-3 rounded-lg" @toggle="onEditorToggle">
        <summary class="cursor-pointer font-bold text-gold">Editar repertório com validação</summary>
        <fieldset :disabled="busy || loading" class="min-w-0 space-y-3 mt-3">
          <div v-for="(spell, i) in repertoire" :key="i" class="grid grid-cols-[minmax(0,1fr)_4rem] sm:flex items-center gap-2">
            <select v-model="spell.tradition" @change="changeTradition(spell)" class="inp min-w-0 sm:w-32" :aria-label="`Tradição da magia ${i + 1}`"><option v-for="pool in info.magic" :key="pool.tradition" :value="pool.tradition">{{ traditionName(pool.tradition) }}</option></select>
            <select v-model.number="spell.level" @change="spell.name = ''" class="inp w-20" :aria-label="`Nível da magia ${i + 1}`"><option v-if="!availableLevels(spell.tradition).includes(spell.level)" :value="spell.level">{{ spell.level }} · indisponível</option><option v-for="level in availableLevels(spell.tradition)" :key="level" :value="level">{{ level }}</option></select>
            <input v-model="spell.name" :list="`spellcasting-list-${i}`" class="inp col-span-2 min-w-0 flex-1" :aria-label="`Nome da magia ${i + 1}`" placeholder="Nome da magia" />
            <datalist :id="`spellcasting-list-${i}`"><option v-for="suggestion in spellSuggestions(spell)" :key="suggestion.name" :value="suggestion.name" /></datalist>
            <button type="button" @click="repertoire.splice(i, 1)" :aria-label="`Remover ${spell.name || 'magia'} do repertório`" class="text-sm text-red-400 justify-self-start">Remover</button>
          </div>
          <button type="button" @click="addSpell" :disabled="!info.magic.some((pool: any) => pool.slots.some((slots: number) => slots > 0))" class="text-sm text-gold disabled:opacity-40">+ Adicionar magia</button>
          <label class="block text-sm"><input v-model="orderApproved" type="checkbox" /> Repertório religioso conferido com o mestre, quando aplicável.</label>
          <p class="text-xs text-steel-light">Salvar substitui o repertório atual. Magias de campanha e outras exceções podem ser registradas pelo mestre no editor manual.</p>
          <p v-if="draftPending" class="text-sm text-gold">Rascunho ainda não enviado. Ele é preservado ao trocar de aba.</p>
          <button type="button" @click="saveRepertoire" :disabled="busy" class="btn">Salvar repertório</button>
          <button v-if="draftPending" type="button" @click="discardDraft" :disabled="busy" class="text-sm text-steel-light underline ml-3">Descartar rascunho</button>
        </fieldset>
      </details>
    </section>
    <template v-if="info.supported && info.magic?.length && !loading">
      <div class="border-t border-steel-dark pt-4 space-y-3">
        <h3 class="font-bold text-gold">Recuperar usos</h3>
        <label class="block text-sm">Dia de jogo (contagem contínua)<input v-model.number="restDay" type="number" min="0" class="inp w-28 mt-1" /></label>
        <label class="flex gap-2 items-start text-sm text-steel-light"><input v-model="restConfirmed" type="checkbox" class="mt-1" /><span>Foram cumpridas 8 horas de sono, 24 horas desde a recuperação anterior e os requisitos de estudo ou oração.</span></label>
        <button type="button" @click="rest" :disabled="busy || !restConfirmed" class="btn">Registrar descanso</button>
      </div>
    </template>
    <p v-else-if="!loading" class="text-sm text-steel-light">{{ info.reason || 'Esta classe não possui usos de magia neste nível.' }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import HelpTooltip from '../HelpTooltip.vue'
import api from '../../services/api'
import { getResource } from '../../services/resources'
import { errorMessage } from '../../utils/catalog'
import { useCharacterOperations } from '../../composables/characterOperations'
import { remainingSpellUses, spellTradition, repertoireHasChanges, repertoireSnapshot, type RepertoireDraft } from '../../utils/spellcasting'
import { spellValidation } from '../../utils/ruleChoices'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{ character: any; prepare: () => Promise<boolean>; refresh: () => Promise<void>;
  repertoireDraft: RepertoireDraft; compact?: boolean;
  spellDescriptions?: { name: string; level?: number; notes?: string }[]; descriptionsLoading?: boolean; descriptionsError?: string }>()
const emit = defineEmits<{ 'retry-descriptions': [] }>()
const operations = useCharacterOperations()
const spellSearch = ref(''), favoritesOnly = ref(false), favorites = ref<string[]>([])
const favoriteKey = () => `acks:spell-favorites:${useAuthStore().user?.id || ''}:${props.character.id}`
const spellKey = (spell: any) => `${spell.tradition || ''}:${spell.level}:${String(spell.name).trim().toLowerCase()}`
const isFavorite = (spell: any) => favorites.value.includes(spellKey(spell))
function toggleFavorite(spell: any) {
  const key = spellKey(spell)
  favorites.value = isFavorite(spell) ? favorites.value.filter(entry => entry !== key) : [...favorites.value, key].slice(-500)
  try { localStorage.setItem(favoriteKey(), JSON.stringify(favorites.value)) } catch { notice.value = 'Favoritos disponíveis nesta visita; o navegador não permitiu guardá-los.' }
}
watch(() => props.character.id, () => { try { const value = JSON.parse(localStorage.getItem(favoriteKey()) || '[]'); favorites.value = Array.isArray(value) ? value.filter(entry => typeof entry === 'string').slice(0, 500) : [] } catch { favorites.value = [] } }, { immediate: true })
const info = ref<any>({}), metadata = ref<any>({}), busy = ref(false), loading = ref(true), error = ref(''), notice = ref('')
const repertoire = computed({ get: () => props.repertoireDraft.spells || [], set: value => { props.repertoireDraft.spells = value } })
const orderApproved = computed({ get: () => props.repertoireDraft.orderApproved, set: value => { props.repertoireDraft.orderApproved = value } })
const draftPending = computed(() => repertoireHasChanges(props.repertoireDraft))
const restDay = ref(1), restConfirmed = ref(false)
const url = () => `/api/game-rules/characters/${props.character.id}`
const traditionName = (tradition: string) => tradition === 'arcane' ? 'Arcana' : tradition === 'divine' ? 'Divina' : 'Tradição a definir'
const remaining = (tradition: string, level: number) => remainingSpellUses(info.value, tradition, level)
const canCast = (spell: any) => remaining(spellTradition(info.value, spell), spell.level) > 0
const spellGroups = computed(() => {
  const groups = new Map<number, any[]>()
  for (const spell of props.character.spells || []) {
    const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    if (!normalized(String(spell.name || '')).includes(normalized(spellSearch.value.trim())) || (favoritesOnly.value && !isFavorite(spell))) continue
    const level = Number(spell.level) || 0
    if (!groups.has(level)) groups.set(level, [])
    groups.get(level)!.push(spell)
  }
  return [...groups].sort(([a], [b]) => a - b).map(([level, spells]) => ({ level, spells }))
})
function spellDescription(spell: any) {
  const matches = (props.spellDescriptions || []).filter(entry => entry.name.trim().toLowerCase() === String(spell.name || '').trim().toLowerCase())
  const entry = matches.find(entry => entry.level === Number(spell.level)) || matches[0]
  if (entry?.notes?.trim()) return entry.notes
  if (props.descriptionsLoading) return 'A descrição está sendo carregada.'
  if (props.descriptionsError) return 'A consulta às descrições está indisponível. Use Tentar carregar descrições novamente.'
  return 'Descrição não cadastrada no catálogo. Para magias de campanha, consulte o mestre.'
}

async function load() {
  if (busy.value || (loading.value && Object.keys(info.value).length)) return
  loading.value = true
  error.value = ''
  try {
    if (!await props.prepare() || !await operations.retryPending()) throw new Error('Salve ou corrija as alterações pendentes da ficha antes de atualizar os usos.')
    const [rules, catalog] = await Promise.all([api.get(url()), getResource('/api/game-rules/metadata')])
    info.value = rules.data
    metadata.value = catalog.data
    restDay.value = Math.max(restDay.value, (rules.data.lastRestDay ?? -1) + 1)
  } catch (caught) { error.value = errorMessage(caught, 'Não foi possível carregar os usos de magia.') }
  finally { loading.value = false }
}

function onEditorToggle(event: Event) {
  props.repertoireDraft.open = (event.target as HTMLDetailsElement).open
  if (!props.repertoireDraft.open || props.repertoireDraft.spells !== null) return
  resetDraft()
}
function resetDraft() {
  repertoire.value = (props.character.spells || []).map((spell: any) => ({ name: spell.name, level: spell.level, tradition: spellTradition(info.value, spell) }))
  orderApproved.value = false
  props.repertoireDraft.original = repertoireSnapshot(props.repertoireDraft)
}
function discardDraft() {
  if (window.confirm('Descartar as alterações do repertório e voltar às magias registradas?')) resetDraft()
}
function availableLevels(tradition: string): number[] { return (info.value.magic?.find((pool: any) => pool.tradition === tradition)?.slots || []).flatMap((slots: number, i: number) => slots ? [i + 1] : []) }
function spellSuggestions(spell:any){return (info.value.magic?.find((pool:any)=>pool.tradition===spell.tradition)?.spellList || metadata.value.spells || []).filter((entry:any)=>entry.level===spell.level&&entry.tradition===spell.tradition)}
function changeTradition(spell: any) { spell.level = availableLevels(spell.tradition)[0] || 1; spell.name = '' }
function addSpell() { const pool = info.value.magic.find((pool: any) => availableLevels(pool.tradition).length); if (pool) repertoire.value.push({ name: '', level: availableLevels(pool.tradition)[0], tradition: pool.tradition }) }

async function change(key: string, path: string, input: any, message: string, applied: () => void = () => {}) {
  if (busy.value) return
  busy.value = true
  error.value = notice.value = ''
  try {
    const data = await operations.run(key, (version) => api.post(`${url()}/${path}`, { ...input, version }), (data) => {
      if (data.used) info.value.used = data.used
      if (data.character?.rulesState !== undefined) {
        let state: any = {}
        try { state = JSON.parse(data.character.rulesState || '{}') } catch { /* Keep the confirmed write. */ }
        info.value.used = state.used || {}
        info.value.lastRestDay = state.lastRestDay
        restDay.value = Math.max(restDay.value, (state.lastRestDay ?? -1) + 1)
      }
      applied()
    })
    if (!data) { error.value = errorMessage(operations.getLastError(), 'A operação não foi concluída. Confira os dados ou use Salvar para repetir uma falha de conexão.'); return }
    notice.value = message
  } finally { busy.value = false }
}

async function saveRepertoire() {
  const check = spellValidation(info.value.magic || [], repertoire.value, metadata.value.spells || [])
  if (check.issues.length) { error.value = check.issues.join(' '); notice.value = ''; return }
  const submitted = repertoireSnapshot(props.repertoireDraft)
  await change('magic:repertoire:update', 'magic/repertoire', { spells: JSON.parse(JSON.stringify(repertoire.value)), orderApproved: orderApproved.value }, 'Repertório registrado.', () => {
    if (repertoireSnapshot(props.repertoireDraft) === submitted) resetDraft()
    else props.repertoireDraft.original = JSON.stringify({ spells: (props.character.spells || []).map((spell: any) => ({ name: spell.name, level: spell.level, tradition: spellTradition(info.value, spell) })), orderApproved: false })
  })
}
async function cast(spellId: string) { await change(`magic:${spellId}:cast`, 'magic/cast', { spellId }, 'Uso de magia registrado.') }
async function rest() {
  await change('magic:rest', 'magic/rest', { day: restDay.value, hours: 8, requirementsMet: true }, 'Usos de magia recuperados.')
  restConfirmed.value = false
}
onMounted(load)
watch(() => props.character.spells, () => {
  if (props.repertoireDraft.spells !== null && !draftPending.value && info.value.magic?.length) resetDraft()
}, { deep: true })
</script>

<style scoped>
.btn { padding: .6rem 1rem; background: #c6a052; color: #171717; border-radius: .5rem; font-weight: 700; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
