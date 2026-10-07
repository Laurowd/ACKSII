<template>
  <div class="max-w-7xl mx-auto p-4 lg:p-6 animate-fade-in pb-36 md:pb-6">
    <!-- Loading -->
    <div v-if="loading" role="status" aria-label="Carregando ficha" class="flex items-center justify-center py-20">
      <div class="animate-spin h-12 w-12 border-4 border-gold border-t-transparent rounded-full"></div>
    </div>

    <div v-else-if="loadError" role="alert" class="border border-red-400 rounded-lg p-5 space-y-3">
      <p>{{ loadError }}</p>
      <button @click="loadCharacter" class="text-gold underline mr-4">Tentar novamente</button>
      <router-link to="/dashboard" class="text-gold underline">Voltar aos personagens</router-link>
    </div>
    <template v-else-if="char">
      <div v-if="recovery" role="status" class="mb-4 rounded-xl border border-gold/30 bg-dark-card p-4 space-y-2">
        <p>Há um rascunho desta ficha guardado neste navegador ({{ new Date(recovery.savedAt).toLocaleString('pt-BR') }}).</p>
        <p v-if="recovery.data.character?.version !== char.version" class="text-sm text-steel-light">A ficha mudou no servidor. Baixe o rascunho para comparar com a versão atual.</p>
        <p v-else class="text-sm text-steel-light">Recupere as edições e confira os dados antes de salvar. Nenhuma ação será reenviada ao abrir a página.</p>
        <div class="flex flex-wrap gap-4"><button v-if="recovery.data.character?.version === char.version" @click="restoreSheetDraft" type="button" class="text-gold underline">Recuperar rascunho</button><button @click="downloadLocalDraft" type="button" class="text-gold underline">Baixar rascunho</button><button @click="discardSheetDraft" type="button" class="text-steel-light underline">Descartar rascunho local</button></div>
      </div>
      <p v-if="storageWarning" role="alert" class="mb-4 text-gold">Não foi possível guardar as alterações neste navegador. Exporte o JSON e mantenha a página aberta até salvar.</p>
      <div v-if="remoteVersion !== null" role="status" class="mb-4 rounded-xl border border-gold/30 bg-dark-card p-4 text-sm space-y-2">
        <p>A ficha ou as regras da campanha foram alteradas em outra sessão. Suas edições locais continuam aqui.</p>
        <button type="button" @click="loadRemoteVersion" :disabled="anySaving || anyPendingChanges || !!recovery" class="text-gold underline disabled:opacity-40">Atualizar ficha sem alterações pendentes</button>
        <p v-if="anyPendingChanges || recovery" class="text-steel-light">Salve ou exporte suas alterações antes de carregar a versão atual.</p>
      </div>
      <p v-if="revisionError" role="status" class="mb-4 text-sm text-steel-light">{{ revisionError }}</p>
      <p v-if="recoveredMutations.length" role="status" class="mb-4 rounded-xl border border-gold/30 p-4 text-sm">{{ recoveredMutations.length }} alteração(ões) recuperada(s) aguardam confirmação. Use Salvar para reenviar com a versão original.</p>
      <div v-if="contextLoading" role="status" class="mb-4 rounded-xl border border-steel-dark p-4 text-steel-light">Carregando catálogo e regras da campanha…</div>
      <div v-else-if="contextError" role="alert" class="mb-4 rounded-xl border border-red-400/50 p-4 space-y-2">
        <p>{{ contextError }}</p>
        <p class="text-sm text-steel-light">Carregue o catálogo e as regras antes de editar, salvar ou exportar esta ficha.</p>
        <button type="button" @click="loadCampaignContext" class="text-gold underline">Tentar carregar regras e catálogo novamente</button>
      </div>
      <div v-if="repertoirePending" role="status" class="mb-4 rounded-xl border border-gold/30 p-4 text-sm text-steel-light">
        Há alterações no repertório ainda não enviadas. Use Salvar repertório na aba Magia para confirmá-las.
        <button type="button" @click="currentTab = 'magic'" class="text-gold underline ml-2">Abrir rascunho de repertório</button>
      </div>
      <p v-if="contextReady && classLevelLimit && char.level>classLevelLimit" role="alert" class="mb-4 rounded-xl border border-gold/30 p-4 text-sm">Esta ficha está acima do nível máximo {{ classLevelLimit }} da classe. Os dados foram preservados; confira a progressão com o mestre.</p>
      <div v-if="anyConflict" role="alert" class="mb-4 rounded border border-red-400 p-4 text-steel-light">
        A ficha mudou em outra sessão. Suas alterações locais foram preservadas.
        Exporte o JSON antes de carregar a versão atual para comparar os dados.
        <button @click="exportSheet('json')" class="mx-3 text-gold underline">Exportar minhas alterações</button>
        <button @click="reloadAfterConflict" class="text-gold underline">Carregar versão atual</button>
      </div>
      <div v-if="operationState.error && !anyConflict" role="alert" class="mb-4 rounded-xl border border-red-400/50 bg-red-400/5 p-4 text-sm">
        <p>{{ errorMessage(operationState.error, 'Não foi possível salvar a alteração. O rascunho continua nesta ficha.') }}</p>
        <p class="mt-1 text-steel-light">Confira os dados e use Salvar para tentar novamente.</p>
      </div>
      <header class="mb-6 rounded-2xl border border-gold/15 bg-dark-card p-5 sm:p-6">
        <p class="text-xs uppercase tracking-widest text-steel-light mb-2">{{ char.chroniclesOf || 'Ficha de personagem' }}</p>
        <h1 class="text-3xl sm:text-4xl text-gold font-serif font-bold break-words">{{ char.characterName || 'Personagem sem nome' }}</h1>
        <p class="text-steel-light mt-2">{{ char.className || 'Classe livre' }} · Nível {{ char.level }}<span v-if="char.title"> · {{ char.title }}</span><span v-if="char.birthplace"> · {{ char.birthplace }}</span></p>
        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div class="rounded-lg bg-dark-bg/70 p-3"><dt class="text-xs text-steel-light">Pontos de vida</dt><dd class="text-xl font-bold text-dark-text">{{ char.hpCurr }} / {{ char.hpMax }}</dd></div>
          <div class="rounded-lg bg-dark-bg/70 p-3"><dt class="text-xs text-steel-light">CA sem escudo / com escudo</dt><dd class="text-xl font-bold text-gold">{{ computedAC.noShield }} / {{ computedAC.withShield }}</dd></div>
          <div class="rounded-lg bg-dark-bg/70 p-3"><dt class="text-xs text-steel-light">Movimento em combate</dt><dd class="text-xl font-bold text-dark-text">{{ encumbranceResult.moveCombat }} <span class="text-sm font-normal">pés</span></dd></div>
          <div class="rounded-lg bg-dark-bg/70 p-3"><dt class="text-xs text-steel-light">Experiência</dt><dd class="text-xl font-bold text-dark-text">{{ Number(char.xp || 0).toLocaleString('pt-BR') }} <span class="text-sm font-normal">XP</span></dd></div>
        </dl>
      </header>

      <div class="sheet-navigation">
        <!-- Top bar -->
        <div class="sheet-actions">
          <router-link to="/dashboard" class="text-steel-light hover:text-gold transition-colors flex items-center gap-2">
             Voltar
          </router-link>
          <div class="sheet-actions-tools">
            <button v-if="currentTab !== 'session'" type="button" @click="currentTab = 'session'" class="ui-button ui-button-secondary sheet-session-shortcut">Abrir modo Sessão</button>
            <details class="relative"><summary class="ui-button ui-button-secondary">Exportar ficha</summary><div class="absolute right-0 top-full mt-2 z-40 rounded-xl border border-steel-dark bg-dark-card p-2 shadow-lg min-w-56 space-y-1">
            <button @click="exportSheet('json')" :disabled="!contextReady" class="ui-button ui-button-secondary w-full">Exportar JSON</button>
            <button @click="exportSheet('html')" :disabled="!contextReady" class="ui-button ui-button-secondary w-full" title="Baixa uma ficha imprimível; abra o arquivo para salvar como PDF">Ficha para impressão/PDF</button>
            </div></details>
            <div role="status" aria-live="polite" aria-atomic="true"><span v-if="anySaving" class="text-gold text-sm animate-pulse">Salvando...</span>
            <span v-else-if="anySaveError" class="text-red-400 text-xs">Falha ao salvar</span>
            <span v-else-if="anyPendingChanges" class="text-steel-light text-xs">Alterações pendentes</span>
            <span v-else-if="lastSaved" class="text-steel text-xs">Salvo </span></div>
            <button @click="manualSave" :disabled="anySaving || !contextReady" class="ui-button ui-button-primary">
              Salvar
            </button>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div role="group" aria-label="Seções da ficha" class="sheet-tabs">
          <button
            v-for="tab in TABS" :key="tab.id"
            @click="currentTab = tab.id"
            @keydown="navigateTabs($event, tab.id)"
            :aria-pressed="currentTab === tab.id" :aria-controls="`sheet-${tab.id}`" :id="`tab-${tab.id}`"
            class="sheet-tab"
          >
            {{ tab.label }}
          </button>
        </div>

      </div>

      <!-- Tab Contents -->
      <div v-if="contextReady" role="tabpanel" :id="`sheet-${currentTab}`" :aria-labelledby="`tab-${currentTab}`" class="tab-content transition-all">
        <SessionTab v-if="currentTab === 'session'" :character="char" :definition="selectedClass(customClasses, char)" :prepare="saveCharacter" :refresh="refreshRuleCharacter" :repertoire-draft="repertoireDraft" :busy="anySaving" @save="autoSave" />
        <CombatModifiersPanel v-if="currentTab === 'combat'" :character="char" :definition="selectedClass(customClasses, char)" class="mb-4" />
        <RulesAssistant v-if="currentTab === 'rules'" :character="char" :prepare="saveCharacter" :refresh="refreshRuleCharacter" :can-manage="canManageRules" @open-magic="currentTab = 'magic'" />
        <CombatTab
          v-if="currentTab === 'combat'"
          :character="char"
          :campaigns="campaigns"
          :custom-classes="customClasses"
          :current-campaign-members="currentCampaignMembers"
          :auth-store="authStore"
          :can-manage="canManageRules"
          :encumbrance-result="encumbranceResult"
          :computed-a-c="computedAC"
          :computed-initiative="computedInitiative"
          :computed-healing-rate="computedHealingRate"
          :hp-percent="hpPercent"
          :display-xp-next="displayXpNext"
          @save="autoSave"
          @campaign-change="onCampaignChange"
          @owner-change="onOwnerChange"
          @class-change="onClassChange"
          @open-rules="currentTab = 'rules'"
        />

        <InventoryTab
          v-if="currentTab === 'inventory'"
          :character="char"
          :encumbrance-result="encumbranceResult"
          :enc-percent="encPercent"
          :optional-rules="campaignOptionalRules"
          :before-operation="saveCharacter"
          @open-adventure="currentTab = 'rules'"
          @save="autoSave"
        />

        <MagicTab
          v-if="currentTab === 'magic'"
          :can-manage="canManageRules"
          :prepare="saveCharacter" :refresh="refreshRuleCharacter"
          :character="char"
          :optional-rules="campaignOptionalRules"
          :repertoire-draft="repertoireDraft"
          @save="autoSave"
        />

        <DomainTab
          v-if="currentTab === 'domain'"
          :character="char"
          @save="autoSave"
        />

        <ActivitiesTab
          v-if="currentTab === 'activities'"
          :character="char"
          :prepare="saveCharacter"
          :can-manage="canManageRules"
        />
      </div>

      <!-- Sticky Status Bar (Mobile Only) -->
      <div class="sheet-mobile-bar" aria-label="Atalhos da ficha">
        <div class="flex flex-col min-w-0 flex-1">
          <span class="text-gold font-bold text-sm truncate max-w-40" :title="char.characterName">{{ char.characterName || 'Desconhecido' }}</span>
          <span class="text-xs text-steel-light">PV {{ char.hpCurr }}/{{ char.hpMax }} · CA {{ computedAC.noShield }}/{{ computedAC.withShield }}</span>
          <span class="text-xs" :class="anySaveError ? 'text-crimson-light' : 'text-steel-light'">{{ anySaving ? 'Salvando ficha…' : anySaveError ? 'Não salvo' : anyPendingChanges ? 'Edições pendentes' : lastSaved ? 'Tudo salvo' : '' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" @click="openHpControls" :disabled="!contextReady" class="ui-button ui-button-secondary">Dano / cura</button>
          <button type="button" @click="manualSave" :disabled="anySaving || !contextReady" aria-label="Salvar ficha" class="ui-button ui-button-primary">Salvar</button>
        </div>
      </div>
      <ClassRevisionDialog v-if="classRevisionTarget && canManageRules" :character="char" :target="classRevisionTarget" :prepare="saveCharacter" @close="classRevisionTarget=null" @changed="loadCampaignContext" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, onMounted, provide, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import { getResource } from '../services/resources'
import { calculateCharacterMetrics } from '../utils/characterMetrics'
import { createCharacterOperations, characterOperationsKey, mergeUnchangedDraft, mergeCharacterMutation, type OperationState } from '../composables/characterOperations'
import { notifyError } from '../utils/toast'
import { errorMessage, selectedClass, type CatalogClass } from '../utils/catalog'
import { characterExport, characterPrintHtml, downloadCharacter } from '../utils/characterExport'
import { emptyRepertoireDraft, repertoireHasChanges, repertoireSnapshot } from '../utils/spellcasting'
import { createLocalDraft, type LocalDraft } from '../utils/localDrafts'
import { useVisiblePolling } from '../composables/visiblePolling'
import CombatModifiersPanel from '../components/sheet/CombatModifiersPanel.vue'
import SessionTab from '../components/sheet/SessionTab.vue'
import { recentCharacters } from '../utils/characterList'
import { observeMutations, type SavedMutation } from '../services/mutationJournal'
import { belongsToCharacter, canReplayMutation, isCorrectedEditor, restoreEditableFields } from '../utils/sheetRecovery'
import { SHEET_TABS, readSheetTab, saveSheetTab } from '../utils/sheetPreferences'


import CombatTab from '../components/sheet/CombatTab.vue';
import ClassRevisionDialog from '../components/ClassRevisionDialog.vue'
// re-trigger volar
import InventoryTab from '../components/sheet/InventoryTab.vue'
import MagicTab from '../components/sheet/MagicTab.vue'
import DomainTab from '../components/sheet/DomainTab.vue'
import ActivitiesTab from '../components/sheet/ActivitiesTab.vue'
import RulesAssistant from '../components/sheet/RulesAssistant.vue'
// tabs

const route = useRoute()
const authStore = useAuthStore()
const char = ref<any>(null)
const classRevisionTarget=ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const lastSaved = ref(false)
const saveError = ref(false)
const saveConflict = ref(false)
const hasPendingChanges = ref(false)
const repertoireDraft = ref(emptyRepertoireDraft())
const repertoirePending = computed(() => repertoireHasChanges(repertoireDraft.value))
const operationState = ref<OperationState>({ pending: 0, busy: false, error: null, conflict: false })
type SheetDraft = { character: any; scalarPending: boolean; repertoire: ReturnType<typeof emptyRepertoireDraft>; mutations: SavedMutation[] }
const recovery = ref<LocalDraft<SheetDraft> | null>(null)
const storageWarning = ref(false)
const recoveredMutations = ref<SavedMutation[]>([])
const mutationDrafts = new Map<string, { mutation: SavedMutation; requestId: number }>()
let replayingRecovered = false
const draftOwner = authStore.user?.id || ''
const localDraftFor = (id: string) => createLocalDraft<SheetDraft>(draftOwner, `sheet:${id}`)
function persistSheetDraft() {
  if (!char.value || loading.value || recovery.value) return
  const local = localDraftFor(char.value.id)
  if (!anyPendingChanges.value && !anySaving.value && !mutationDrafts.size) { local.remove(); storageWarning.value = false; return }
  storageWarning.value = !local.write({ character: JSON.parse(JSON.stringify(char.value)), scalarPending: hasPendingChanges.value || saving.value, repertoire: repertoireDraft.value, mutations: [...mutationDrafts.values()].map(entry => entry.mutation) })
}
const stopMutationObserver = observeMutations(({ phase, mutation, requestId }) => {
  if (!char.value || !belongsToCharacter(mutation.url, char.value.id)) return
  if (phase === 'start') {
    if (!replayingRecovered) recoveredMutations.value = recoveredMutations.value.filter(entry => entry.key !== mutation.key)
    mutationDrafts.set(mutation.key, { mutation, requestId })
  }
  else if (mutationDrafts.get(mutation.key)?.requestId === requestId) mutationDrafts.delete(mutation.key)
  persistSheetDraft()
})
function downloadLocalDraft() {
  if (recovery.value) downloadCharacter(JSON.stringify(recovery.value.data, null, 2), `${char.value.characterName || 'personagem'}-rascunho`, 'json')
}
function discardSheetDraft() { localDraftFor(char.value.id).remove(); recovery.value = null; persistSheetDraft() }
function restoreSheetDraft() {
  const saved = recovery.value ? JSON.parse(JSON.stringify(recovery.value.data)) as SheetDraft : null
  if (!saved || saved.character?.id !== char.value.id || saved.character.version !== char.value.version || !Array.isArray(saved.mutations)) return
  // Commands without a version cannot be replayed safely; retain the downloadable record.
  if (saved.mutations.some(mutation => !canReplayMutation(mutation, char.value.id))) { notifyError('Este rascunho contém uma ação sem versão. Baixe o rascunho e confira a ação com o mestre antes de refazê-la.'); return }
  if (anyPendingChanges.value && !window.confirm('Substituir as edições atuais pelo rascunho guardado?')) return
  restoreEditableFields(char.value, saved.character, characterPayload())
  // Restore existing rows for review. Their writes remain explicit and versioned.
  for (const field of ['weapons', 'proficiencies', 'items', 'spells', 'rituals', 'magicFormulae', 'henchmen', 'scars', 'activities', 'armyUnits', 'magicItemResearch', 'mercantileVentures']) {
    if (!Array.isArray(saved.character[field]) || !Array.isArray(char.value[field])) continue
    const drafts = new Map(saved.character[field].map((entry: any) => [entry.id, entry]))
    char.value[field] = char.value[field].map((entry: any) => drafts.has(entry.id) ? structuredClone(drafts.get(entry.id)) : entry)
  }
  if (saved.character.domain && char.value.domain?.id === saved.character.domain.id) char.value.domain = structuredClone(saved.character.domain)
  if (saved.repertoire && (saved.repertoire.spells === null || Array.isArray(saved.repertoire.spells))) repertoireDraft.value = saved.repertoire
  recoveredMutations.value = saved.mutations
  for (const mutation of saved.mutations) mutationDrafts.set(mutation.key, { mutation, requestId: 0 })
  hasPendingChanges.value = saved.scalarPending
  recovery.value = null; persistSheetDraft()
}
async function replayRecoveredMutations() {
  if (!recoveredMutations.value.length) return true
  if (anySaving.value || anyConflict.value || !contextReady.value) return false
  saving.value = true
  replayingRecovered = true
  try {
    while (recoveredMutations.value.length) {
      const mutation = recoveredMutations.value[0]!
      if (!canReplayMutation(mutation, char.value.id)) return false
      const before = JSON.parse(JSON.stringify(char.value))
      const response = await api.request({ url: mutation.url, method: mutation.method, data: mutation.data })
      recoveredMutations.value = recoveredMutations.value.filter(entry => entry.key !== mutation.key); mutationDrafts.delete(mutation.key)
      if (response.data.character) mergeCharacterMutation(char.value, before, response.data.character)
      // Reload relations after an acknowledged operation; never replay it if reload fails.
      try {
        const returned = (await api.get(`/api/characters/${char.value.id}`)).data.character
        mergeCharacterMutation(char.value, before, returned); normalizeLoadedCharacter()
        if (mutation.url.endsWith('/repertoire')) repertoireDraft.value.original = repertoireSnapshot(repertoireDraft.value)
      } catch (error) {
        saveConflict.value = true
        throw new Error('A alteração foi registrada, mas a conferência falhou. Exporte as edições locais e carregue a versão atual antes de continuar.')
      }
    }
    saveError.value = false
    showSavedNotice()
    return true
  } catch (error) {
    saveError.value = true
    if ((error as any).response?.data?.code === 'CHARACTER_CONFLICT') saveConflict.value = true
    notifyError(errorMessage(error, 'Não foi possível confirmar a alteração recuperada. Confira a ficha antes de tentar novamente.'))
    return false
  } finally { replayingRecovered = false; saving.value = false; persistSheetDraft() }
}
const operations = createCharacterOperations({ getCharacter: () => char.value, prepare: saveCharacter, onState: (state) => { operationState.value = state } })
provide(characterOperationsKey, operations)
const anyPendingChanges = computed(() => hasPendingChanges.value || operationState.value.pending > 0 || repertoirePending.value || recoveredMutations.value.length > 0)
const anyConflict = computed(() => saveConflict.value || operationState.value.conflict)
const anySaveError = computed(() => saveError.value || Boolean(operationState.value.error))
const anySaving = computed(() => saving.value || operationState.value.busy)
async function saveAllChanges() { return await replayRecoveredMutations() && await saveCharacter() && await operations.retryPending() }
async function manualSave() {
  if (repertoirePending.value && !hasPendingChanges.value && !operationState.value.pending && !recoveredMutations.value.length) { currentTab.value = 'magic'; return false }
  if (!anyPendingChanges.value) hasPendingChanges.value = true
  return saveAllChanges()
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let savedNoticeTimeout: ReturnType<typeof setTimeout> | null = null
let saveInFlight: Promise<boolean> | null = null
let saveQueued = false
function showSavedNotice() {
  lastSaved.value = true
  if (savedNoticeTimeout) clearTimeout(savedNoticeTimeout)
  savedNoticeTimeout = setTimeout(() => (lastSaved.value = false), 3000)
}

const campaigns = ref<any[]>([])
const customClasses = ref<CatalogClass[]>([])
const contextLoading = ref(false), contextError = ref(''), contextReady = ref(false)
let savedAssignment: { campaignId: string | null; userId: string } | null = null
const defaultOptionalRules: Record<string, boolean> = {
  enableDomainEconomy: true,
  enableMercenaryMorale: true,
  enableMagicResearchValidation: true,
  enableTreasureToXp: true,
  enableMonthlyMaintenance: true,
  enableActivityQueue: true,
  enableClassAutoProgression: true,
}
const campaignOptionalRules = ref({ ...defaultOptionalRules })

const TABS = SHEET_TABS
const currentTab = ref('combat')
watch(() => char.value?.id, id => { if (id) currentTab.value = readSheetTab(authStore.user?.id || '', id) })
watch(currentTab, tab => { if (char.value?.id) saveSheetTab(authStore.user?.id || '', char.value.id, tab) })
async function openHpControls() {
  currentTab.value = 'session'
  await nextTick()
  document.getElementById('session-hp-amount')?.focus()
}
async function navigateTabs(event: KeyboardEvent, id: string) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = TABS.findIndex(tab => tab.id === id)
  const target = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
  currentTab.value = TABS[target]!.id
  await nextTick()
  const button = document.getElementById(`tab-${currentTab.value}`)
  button?.focus({ preventScroll: true })
  if (button?.parentElement) button.parentElement.scrollLeft = button.offsetLeft - button.parentElement.clientWidth / 2 + button.offsetWidth / 2
}
const remoteVersion = ref<number | null>(null), revisionError = ref('')
let observedCampaignRevision: string | null | undefined
useVisiblePolling(async signal => {
  if (!char.value) return
  const id = char.value.id
  try {
    const { data } = await api.get(`/api/characters/${id}/revision`, { signal })
    if (signal.aborted || char.value?.id !== id) return
    revisionError.value = ''
    if (data.version > char.value.version || (observedCampaignRevision !== undefined && data.campaignUpdatedAt !== observedCampaignRevision)) remoteVersion.value = data.version
    observedCampaignRevision = data.campaignUpdatedAt
  } catch { if (!signal.aborted) revisionError.value = 'Não foi possível verificar novas alterações. Seus dados permanecem na ficha; a verificação será repetida.' }
}, () => loading.value || anySaving.value)
async function loadRemoteVersion() {
  if (anySaving.value || anyPendingChanges.value || recovery.value) return
  if (await reloadAfterConflict()) { remoteVersion.value = null; revisionError.value = '' }
}
const canManageRules = computed(() => authStore.isMaster && (!char.value?.campaignId || campaigns.value.some(c => c.id === char.value.campaignId && c.masterId === authStore.user?.id)))
async function refreshRuleCharacter() {
  const before = JSON.parse(JSON.stringify(char.value))
  const res = await api.get(`/api/characters/${char.value.id}`)
  const returned = res.data.character
  if (returned.version < char.value.version) return
  for (const [key, value] of Object.entries(returned)) {
    if (Array.isArray(value) && Array.isArray(before[key]) && Array.isArray(char.value[key])) {
      const local = char.value[key]
      const original = new Map(before[key].map((entry: any) => [entry.id, entry]))
      const byId = new Map(local.map((entry: any) => [entry.id, entry]))
      const merged = value.map((entry: any) => {
        const draft = byId.get(entry.id)
        if (!draft) return entry
        mergeUnchangedDraft(draft, original.get(entry.id) || {}, entry)
        return draft
      })
      for (const draft of local) if (!value.some((entry: any) => entry.id === draft.id) && JSON.stringify(draft) !== JSON.stringify(original.get(draft.id))) merged.push(draft)
      char.value[key] = merged
    } else if (JSON.stringify(char.value[key]) === JSON.stringify(before[key])) char.value[key] = value
  }
  char.value.version = returned.version
  normalizeLoadedCharacter()
}

function exportSheet(format: 'json' | 'html') {
  if (!char.value || !contextReady.value) return
  const definition = selectedClass(customClasses.value, char.value)
  const automaticProgression = campaignOptionalRules.value.enableClassAutoProgression !== false
  const exported = characterExport(char.value, definition, automaticProgression)
  const content = format === 'json' ? JSON.stringify({ ...exported, ...(repertoirePending.value && { drafts: { repertoire: { spells: repertoireDraft.value.spells, orderApproved: repertoireDraft.value.orderApproved } } }) }, null, 2) : characterPrintHtml(char.value, definition, automaticProgression)
  downloadCharacter(content, char.value.characterName || 'personagem', format)
}

// Computed
const xpNext = computed(() => {
  if (!char.value) return 0
  if (campaignOptionalRules.value.enableClassAutoProgression === false) return char.value.xpNext || 0
  const selected = selectedClass(customClasses.value, char.value)
  if (selected) {
    try {
      const xpArray = JSON.parse(selected.xpPerLevel || '[]')
      // If char is level 1, we want the XP required for level 2, which is at index 1 (since level 1 is at index 0).
      return Number(xpArray[char.value.level] ?? 0)
    } catch(e) {}
  }
  return char.value.xpNext || 0
})

const displayXpNext = computed(() => xpNext.value || 0)

const currentCampaignMembers = computed(() => {
  if (!char.value || !char.value.campaignId) return []
  const campaign = campaigns.value.find(c => c.id === char.value.campaignId)
  return campaign?.members || []
})

async function loadCampaignContext() {
  if (contextLoading.value || !char.value) return
  contextLoading.value = true; contextReady.value = false; contextError.value = ''
  const campaignId = char.value.campaignId
  try {
    const results = await Promise.allSettled([
      getResource('/api/classes/catalog', { params: { campaignId: campaignId || undefined } }),
      campaignId ? getResource(`/api/campaigns/${campaignId}/settings`) : Promise.resolve({ data: { optionalRules: {} } }),
    ])
    const [catalog, settings] = results
    const issues: string[] = []
    if (catalog!.status === 'rejected') issues.push(errorMessage(catalog!.reason, 'Não foi possível carregar o catálogo de classes.'))
    if (settings!.status === 'rejected') issues.push(errorMessage(settings!.reason, 'Não foi possível carregar as regras da campanha.'))
    if (issues.length) throw new Error(issues.join(' '))
    if (catalog!.status === 'fulfilled' && settings!.status === 'fulfilled') {
      customClasses.value = catalog!.value.data
      campaignOptionalRules.value = { ...defaultOptionalRules, ...settings!.value.data.optionalRules }
      observedCampaignRevision = settings!.value.data.updatedAt || null
      const definition = selectedClass(customClasses.value, char.value)
      if (definition && (!char.value.classKey || definition.legacyIds?.includes(char.value.classKey))) char.value.classKey = definition.id
      contextReady.value = true
    }
  } catch (e) {
    contextError.value = errorMessage(e, 'Não foi possível carregar as regras e o catálogo.')
  } finally { contextLoading.value = false }
}

async function onCampaignChange() {
  await updateAssignment(false)
}

async function onOwnerChange() {
  await updateAssignment(true)
}

async function updateAssignment(includeOwner: boolean) {
  try {
    if (!(await saveCharacter())) throw new Error('save failed')
    const assignment = await api.put(`/api/characters/${char.value.id}/assignment`, {
      campaignId: char.value.campaignId,
      ...(includeOwner ? { userId: char.value.userId } : {}),
    })
    char.value.version = assignment.data.character.version
    savedAssignment = { campaignId: char.value.campaignId, userId: char.value.userId }
    await loadCampaignContext()
  } catch (e) {
    if (savedAssignment) Object.assign(char.value, savedAssignment)
    notifyError(errorMessage(e, 'Não foi possível alterar a campanha ou o responsável. Salve a ficha e tente novamente.'))
  }
}

function onClassChange(key:string) {
  if(!canManageRules.value)return
  classRevisionTarget.value=customClasses.value.find(definition=>definition.id===key) || selectedClass(customClasses.value,char.value)
}

const hpPercent = computed(() => {
  if (!char.value || char.value.hpMax === 0) return 100
  return (char.value.hpCurr / char.value.hpMax) * 100
})

const metrics = computed(() => calculateCharacterMetrics(char.value || {}, selectedClass(customClasses.value, char.value || {})))
const classLevelLimit=computed(()=>{const definition=selectedClass(customClasses.value,char.value||{});if(!definition)return 0;try{return JSON.parse(definition.xpPerLevel).length}catch{return 0}})
const computedAC = computed(() => metrics.value.armorClass)
const computedInitiative = computed(() => metrics.value.initiative)
const computedHealingRate = computed(() => metrics.value.healingRate)
const encumbranceResult = computed(() => metrics.value.encumbrance)

const encPercent = computed(() => {
  if (!encumbranceResult.value) return 0
  const max = encumbranceResult.value.maxCapacity || 20
  const stone = encumbranceResult.value.totalStone
  if (stone === 0) return 0
  return (stone / max) * 100
})

// Auto-save with debounce
function autoSave() {
  hasPendingChanges.value = true
  saveError.value = false
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveTimeout = null
    void saveCharacter()
  }, 1500)
}

function characterPayload() {
  const {
    weapons, proficiencies, items, spells, rituals, magicFormulae, user,
    henchmen, domain, scars, activities, armyUnits, magicItemResearch,
    mercantileVentures, rulesState, ...data
  } = char.value
  const armorClass = computedAC.value
  return {
    ...data,
    acNoArmor: armorClass.noArmor,
    acNoShield: armorClass.noShield,
    acWithShield: armorClass.withShield,
  }
}

async function saveCharacter(operationKey?: string): Promise<boolean> {
  if (!char.value) return true
  if (recoveredMutations.value.length && !(recoveredMutations.value.length === 1 && isCorrectedEditor(recoveredMutations.value[0]!, char.value.id, operationKey))) return false
  if (!contextReady.value) return !hasPendingChanges.value
  if (anyConflict.value) return false
  await operations.waitForActive()
  if (!hasPendingChanges.value && !saveInFlight) return true
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }

  if (saveInFlight) {
    saveQueued = true
    hasPendingChanges.value = true
    return saveInFlight.then(() => saveQueued || hasPendingChanges.value ? saveCharacter() : !saveError.value)
  }

  saveInFlight = (async () => {
    saving.value = true
    lastSaved.value = false
    let succeeded = true

    do {
      saveQueued = false
      hasPendingChanges.value = false
      if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveTimeout = null
      }

      try {
        const beforeWeapons = JSON.parse(JSON.stringify(char.value.weapons || []))
        const sent = JSON.parse(JSON.stringify(characterPayload()))
        const res = await api.put(`/api/characters/${char.value.id}`, sent)
        char.value.version = res.data.character.version
        // Merge server calculations only if no newer edit replaced this value.
        for (const key of ['classKey', 'className', 'title', 'hitDice', 'xpNext', 'saveDeath', 'saveParalysis', 'saveBlast', 'saveImplements', 'saveSpells']) {
          if (char.value[key] === sent[key] && res.data.character[key] !== undefined) char.value[key] = res.data.character[key]
        }
        if (!operationState.value.pending) {
          for (const weapon of char.value.weapons || []) {
            const before = beforeWeapons.find((entry: any) => entry.id === weapon.id)
            const returned = res.data.character.weapons?.find((entry: any) => entry.id === weapon.id)
            if (before && returned && weapon.attackThrow === before.attackThrow) weapon.attackThrow = returned.attackThrow
          }
        }
        saveError.value = false
      } catch (error) {
        if ((error as any).response?.data?.code === 'CHARACTER_CONFLICT') saveConflict.value = true
        succeeded = false
        saveError.value = true
        hasPendingChanges.value = true
        notifyError(errorMessage(error, 'Não foi possível salvar a ficha. Suas alterações continuam pendentes.'))
        break
      }
    } while (saveQueued || hasPendingChanges.value)

    if (succeeded) {
      showSavedNotice()
    }
    return succeeded
  })()

  try {
    return await saveInFlight
  } finally {
    saving.value = false
    saveInFlight = null
  }
}

async function reloadAfterConflict() {
  if (!window.confirm('Carregar a ficha atual? Edições locais serão substituídas; exporte o JSON primeiro se quiser guardá-las.')) return false
  try {
    const res = await api.get(`/api/characters/${char.value.id}`)
    operations.clearPending()
    char.value = res.data.character
    normalizeLoadedCharacter()
    saveConflict.value = false
    saveError.value = false
    hasPendingChanges.value = false
    repertoireDraft.value = emptyRepertoireDraft()
    recoveredMutations.value = []; mutationDrafts.clear(); recovery.value = null
    localDraftFor(char.value.id).remove()
    saveQueued = false
    if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null }
    await loadCampaignContext()
    return contextReady.value
  } catch (error) { notifyError(errorMessage(error, 'Não foi possível carregar a ficha.')); return false }
}

function normalizeLoadedCharacter() {
  savedAssignment = { campaignId: char.value.campaignId, userId: char.value.userId }
  for (const key of ['spellbook', 'learnedSpells', 'researchQueue']) {
    if (typeof char.value[key] === 'string') {
      try { const parsed = JSON.parse(char.value[key] || '[]'); char.value[key] = Array.isArray(parsed) ? parsed : [] }
      catch { char.value[key] = [] }
    }
  }
}

function warnAboutPendingChanges(event: BeforeUnloadEvent) {
  persistSheetDraft()
  if (!anyPendingChanges.value && !saveInFlight && !operationState.value.busy) return
  event.preventDefault()
  event.returnValue = ''
}

async function saveBeforeNavigation() {
  if (recoveredMutations.value.length) { notifyError('Confira as alterações recuperadas e use Salvar antes de sair.'); return false }
  if (!anyPendingChanges.value && !saveInFlight && !operationState.value.busy) return true
  if (!await saveAllChanges()) return false
  return !repertoirePending.value || window.confirm('O repertório tem alterações ainda não enviadas. Sair e descartar esse rascunho? Para salvá-lo, permaneça e use Salvar repertório na aba Magia.')
}
onBeforeRouteLeave(saveBeforeNavigation)
onBeforeRouteUpdate((to,from)=>to.fullPath.split('#')[0]===from.fullPath.split('#')[0] || saveBeforeNavigation())

// Load
async function loadCharacter() {
  loading.value = true
  loadError.value = ''
  try {
    const resCamp = await api.get('/api/campaigns')
    campaigns.value = resCamp.data

    const res = await api.get(`/api/characters/${route.params.id}`)
    char.value = res.data.character
    normalizeLoadedCharacter()
    await loadCampaignContext()
    recovery.value = localDraftFor(char.value.id).read()
    recentCharacters(authStore.user?.id || '').visit(char.value.id)
  } catch (e) {
    loadError.value = errorMessage(e, 'Não foi possível carregar a ficha. Verifique a conexão e tente novamente.')
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  window.addEventListener('beforeunload', warnAboutPendingChanges)
  void loadCharacter()
})

onBeforeUnmount(() => {
  persistSheetDraft(); stopMutationObserver()
  window.removeEventListener('beforeunload', warnAboutPendingChanges)
  if (saveTimeout) clearTimeout(saveTimeout)
  if (savedNoticeTimeout) clearTimeout(savedNoticeTimeout)
})
watch([char, repertoireDraft, anyPendingChanges, anySaving], persistSheetDraft, { deep: true })
watch(() => route.params.id, () => {
  remoteVersion.value = null; observedCampaignRevision = undefined; revisionError.value = ''
  operations.clearPending(); mutationDrafts.clear(); recoveredMutations.value = []; recovery.value = null
  hasPendingChanges.value = false; saveError.value = false; saveConflict.value = false; repertoireDraft.value = emptyRepertoireDraft()
  if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null }
  void loadCharacter()
})
</script>

<style scoped lang="postcss">
@reference "../style.css";
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
