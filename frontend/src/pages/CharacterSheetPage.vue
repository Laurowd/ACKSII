<template>
  <div class="max-w-7xl mx-auto p-4 lg:p-6 animate-fade-in pb-24 md:pb-6">
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
      <!-- Top bar -->
      <div class="flex flex-wrap gap-3 items-center justify-between mb-6">
        <router-link to="/dashboard" class="text-steel-light hover:text-gold transition-colors flex items-center gap-2">
           Voltar
        </router-link>
        <div class="flex flex-wrap items-center gap-3">
          <button @click="exportSheet('json')" class="text-gold text-sm underline">Exportar JSON</button>
          <button @click="exportSheet('html')" class="text-gold text-sm underline" title="Baixa uma ficha imprimível; abra o arquivo para salvar como PDF">Ficha para impressão/PDF</button>
          <span v-if="anySaving" class="text-gold text-sm animate-pulse">Salvando...</span>
          <span v-else-if="anySaveError" class="text-red-400 text-xs">Falha ao salvar</span>
          <span v-else-if="anyPendingChanges" class="text-steel-light text-xs">Alterações pendentes</span>
          <span v-else-if="lastSaved" class="text-steel text-xs">Salvo </span>
          <button @click="manualSave" :disabled="anySaving" class="px-4 py-2 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
                 hover:from-gold hover:to-gold-light transition-all text-sm disabled:cursor-wait disabled:opacity-60">
            Salvar
          </button>
        </div>
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

      <!-- Tabs Navigation -->
      <div role="group" aria-label="Seções da ficha" class="flex border-b border-steel-dark mb-6 overflow-x-auto">
        <button 
          v-for="tab in TABS" :key="tab.id"
          @click="currentTab = tab.id"
          :aria-pressed="currentTab === tab.id" :aria-controls="`sheet-${tab.id}`" :id="`tab-${tab.id}`"
          class="px-5 py-3 font-bold whitespace-nowrap transition-all border-b-2 -mb-px"
          :class="currentTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-steel-light hover:text-gold hover:border-gold/50'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Contents -->
      <div role="tabpanel" :id="`sheet-${currentTab}`" :aria-labelledby="`tab-${currentTab}`" class="tab-content transition-all">
        <RulesAssistant v-if="currentTab === 'rules'" :character="char" :prepare="saveCharacter" :refresh="refreshRuleCharacter" :can-manage="canManageRules" @open-magic="currentTab = 'magic'" />
        <CombatTab
          v-if="currentTab === 'combat'"
          :character="char"
          :campaigns="campaigns"
          :custom-classes="customClasses"
          :current-campaign-members="currentCampaignMembers"
          :auth-store="authStore"
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
          @level-change="onLevelChange"
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
          :prepare="saveCharacter" :refresh="refreshRuleCharacter"
          :character="char"
          :optional-rules="campaignOptionalRules"
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
        />
      </div>

      <!-- Sticky Status Bar (Mobile Only) -->
      <div class="fixed bottom-0 left-0 right-0 p-3 bg-dark-card border-t border-gold/20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-50 flex items-center justify-between md:hidden rounded-t-xl transition-colors pb-safe">
        <div class="flex flex-col">
          <span class="text-gold font-bold font-serif text-sm">{{ char.characterName || 'Desconhecido' }}</span>
          <span class="text-xs text-steel font-bold">CA: {{ computedAC.noShield }} / {{ computedAC.withShield }}</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xs text-steel uppercase">PV</span>
          <div class="text-lg font-bold" :class="hpPercent > 50 ? 'text-green-400' : hpPercent > 25 ? 'text-yellow-400' : 'text-red-400'">
            {{ char.hpCurr }}<span class="text-xs text-steel font-normal">/{{ char.hpMax }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, provide } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import { calculateCharacterMetrics } from '../utils/characterMetrics'
import { createCharacterOperations, characterOperationsKey, mergeUnchangedDraft, type OperationState } from '../composables/characterOperations'
import { notifyError } from '../utils/toast'
import { errorMessage, selectedClass, type CatalogClass } from '../utils/catalog'
import { characterExport, characterPrintHtml, downloadCharacter } from '../utils/characterExport'


import CombatTab from '../components/sheet/CombatTab.vue';
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
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const lastSaved = ref(false)
const saveError = ref(false)
const saveConflict = ref(false)
const hasPendingChanges = ref(false)
const operationState = ref<OperationState>({ pending: 0, busy: false, error: null, conflict: false })
const operations = createCharacterOperations({ getCharacter: () => char.value, prepare: saveCharacter, onState: (state) => { operationState.value = state } })
provide(characterOperationsKey, operations)
const anyPendingChanges = computed(() => hasPendingChanges.value || operationState.value.pending > 0)
const anyConflict = computed(() => saveConflict.value || operationState.value.conflict)
const anySaveError = computed(() => saveError.value || Boolean(operationState.value.error))
const anySaving = computed(() => saving.value || operationState.value.busy)
async function saveAllChanges() { return await saveCharacter() && await operations.retryPending() }
async function manualSave() { if (!anyPendingChanges.value) hasPendingChanges.value = true; return saveAllChanges() }

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let savedNoticeTimeout: ReturnType<typeof setTimeout> | null = null
let saveInFlight: Promise<boolean> | null = null
let saveQueued = false

const campaigns = ref<any[]>([])
const customClasses = ref<CatalogClass[]>([])
let savedAssignment: { campaignId: string | null; userId: string } | null = null
const defaultOptionalRules: Record<string, boolean> = {
  enableDomainEconomy: true,
  enableMercenaryMorale: true,
  enableMagicResearchValidation: true,
  enableTreasureToXp: true,
  enableMonthlyMaintenance: true,
  enableActivityQueue: true,
  enableClassAutoProgression: true,
  enableAdvancedEncumbrance: true,
}
const campaignOptionalRules = ref({ ...defaultOptionalRules })

const TABS = [
  { id: 'rules', label: 'Evolução & Regras' },
  { id: 'combat', label: 'Geral & Combate' },
  { id: 'inventory', label: 'Inventário & Tesouro' },
  { id: 'magic', label: 'Magia' },
  { id: 'domain', label: 'Domínio & Seguidores' },
  { id: 'activities', label: 'Atividades e Downtime' },
]
const currentTab = ref('combat')
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
  if (!char.value) return
  const definition = selectedClass(customClasses.value, char.value)
  const automaticProgression = campaignOptionalRules.value.enableClassAutoProgression !== false
  const content = format === 'json' ? JSON.stringify(characterExport(char.value, definition, automaticProgression), null, 2) : characterPrintHtml(char.value, definition, automaticProgression)
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

async function loadCampaignClasses(campaignId: string | null) {
  try {
    const res = await api.get('/api/classes/catalog', { params: { campaignId: campaignId || undefined } })
    customClasses.value = res.data
    const selected = char.value && selectedClass(customClasses.value, char.value)
    if (selected && !char.value.classKey) char.value.classKey = selected.id
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar o catálogo de classes desta campanha.'))
  }
}

async function loadCampaignOptionalRules(campaignId: string | null) {
  campaignOptionalRules.value = { ...defaultOptionalRules }
  if (!campaignId) return
  try {
    const res = await api.get(`/api/campaigns/${campaignId}/settings`)
    campaignOptionalRules.value = {
      ...campaignOptionalRules.value,
      ...(res.data.optionalRules || {})
    }
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível carregar as regras opcionais desta campanha.'))
  }
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
    await loadCampaignClasses(char.value.campaignId)
    await loadCampaignOptionalRules(char.value.campaignId)
  } catch (e) {
    if (savedAssignment) Object.assign(char.value, savedAssignment)
    notifyError(errorMessage(e, 'Não foi possível alterar a campanha ou o responsável. Salve a ficha e tente novamente.'))
  }
}

function onClassChange() {
  const selected = selectedClass(customClasses.value, char.value)
  if (selected) {
    char.value.className = selected.name
    char.value.subclass = ''
  }
  autoSave()
}

const hpPercent = computed(() => {
  if (!char.value || char.value.hpMax === 0) return 100
  return (char.value.hpCurr / char.value.hpMax) * 100
})

const metrics = computed(() => calculateCharacterMetrics(char.value || {}, selectedClass(customClasses.value, char.value || {})))
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

function onLevelChange() {
  if (!char.value) return
  // The API applies the selected class progression and campaign rule.
  autoSave()
}

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

async function saveCharacter(): Promise<boolean> {
  if (!char.value) return true
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
      lastSaved.value = true
      if (savedNoticeTimeout) clearTimeout(savedNoticeTimeout)
      savedNoticeTimeout = setTimeout(() => (lastSaved.value = false), 3000)
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
  if (!window.confirm('Descartar as alterações locais e carregar a ficha atual? Exporte o JSON primeiro se quiser guardá-las.')) return
  try {
    const res = await api.get(`/api/characters/${char.value.id}`)
    operations.clearPending()
    char.value = res.data.character
    normalizeLoadedCharacter()
    saveConflict.value = false
    saveError.value = false
    hasPendingChanges.value = false
    saveQueued = false
    if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null }
    await loadCampaignClasses(char.value.campaignId)
    await loadCampaignOptionalRules(char.value.campaignId)
  } catch (error) { notifyError(errorMessage(error, 'Não foi possível carregar a ficha.')) }
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
  if (!anyPendingChanges.value && !saveInFlight && !operationState.value.busy) return
  event.preventDefault()
  event.returnValue = ''
}

async function saveBeforeNavigation() {
  if (!anyPendingChanges.value && !saveInFlight && !operationState.value.busy) return true
  return await saveAllChanges()
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
    await loadCampaignClasses(char.value.campaignId)
    if (char.value?.campaignId) {
      await loadCampaignOptionalRules(char.value.campaignId)
    }
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
  window.removeEventListener('beforeunload', warnAboutPendingChanges)
  if (saveTimeout) clearTimeout(saveTimeout)
  if (savedNoticeTimeout) clearTimeout(savedNoticeTimeout)
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
