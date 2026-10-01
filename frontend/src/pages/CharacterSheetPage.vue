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
      <div v-if="saveConflict" role="alert" class="mb-4 rounded border border-red-400 p-4 text-steel-light">
        A ficha mudou em outra sessão. Suas alterações locais foram preservadas.
        Exporte o JSON antes de carregar a versão atual para comparar os dados.
        <button @click="exportSheet('json')" class="mx-3 text-gold underline">Exportar minhas alterações</button>
        <button @click="reloadAfterConflict" class="text-gold underline">Carregar versão atual</button>
      </div>
      <!-- Top bar -->
      <div class="flex flex-wrap gap-3 items-center justify-between mb-6">
        <router-link to="/dashboard" class="text-steel-light hover:text-gold transition-colors flex items-center gap-2">
           Voltar
        </router-link>
        <div class="flex flex-wrap items-center gap-3">
          <button @click="exportSheet('json')" class="text-gold text-sm underline">Exportar JSON</button>
          <button @click="exportSheet('html')" class="text-gold text-sm underline" title="Baixa uma ficha imprimível; abra o arquivo para salvar como PDF">Ficha para impressão/PDF</button>
          <span v-if="saving" class="text-gold text-sm animate-pulse">Salvando...</span>
          <span v-else-if="saveError" class="text-red-400 text-xs">Falha ao salvar</span>
          <span v-else-if="hasPendingChanges" class="text-steel-light text-xs">Alterações pendentes</span>
          <span v-else-if="lastSaved" class="text-steel text-xs">Salvo </span>
          <button @click="saveCharacter" :disabled="saving" class="px-4 py-2 bg-linear-to-r from-gold-dark to-gold text-dark-bg font-bold rounded-lg
                 hover:from-gold hover:to-gold-light transition-all text-sm disabled:cursor-wait disabled:opacity-60">
            Salvar
          </button>
        </div>
      </div>
      
      <!-- Interactive Title -->
      <div class="text-center mb-8 px-4">
        <h1 class="break-words text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-gold-light via-gold to-gold-dark font-serif leading-relaxed">
          The Chronicles of <span class="border-b border-gold/30 pb-0.5 mx-1">{{ char.characterName || '_____' }}</span> of <span class="border-b border-gold/30 pb-0.5 mx-1">{{ char.birthplace || '_____' }}</span>.<br/>
          <span class="text-xl md:text-2xl mt-4 block text-gold/80">
            <span class="border-b border-gold/30 pb-0.5 mx-1">{{ char.className || '_____' }}</span> and <span class="border-b border-gold/30 pb-0.5 mx-1">{{ char.title || '_____' }}</span>
          </span>
        </h1>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex border-b border-steel-dark mb-6 overflow-x-auto scrollbar-hide">
        <button 
          v-for="tab in TABS" :key="tab.id"
          @click="currentTab = tab.id"
          class="px-5 py-3 font-bold whitespace-nowrap transition-all border-b-2 -mb-px"
          :class="currentTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-steel-light hover:text-gold hover:border-gold/50'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Contents -->
      <div class="tab-content transition-all">
        <RulesAssistant v-if="currentTab === 'rules'" :character="char" :prepare="saveCharacter" :refresh="refreshRuleCharacter" />
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
          @save="autoSave"
        />

        <MagicTab
          v-if="currentTab === 'magic'"
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
          <span class="text-xs text-steel font-bold">AC: {{ computedAC.withShield || computedAC.noShield || computedAC.noArmor }}</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xs text-steel uppercase">HP</span>
          <div class="text-lg font-bold" :class="hpPercent > 50 ? 'text-green-400' : hpPercent > 25 ? 'text-yellow-400' : 'text-red-400'">
            {{ char.hpCurr }}<span class="text-xs text-steel font-normal">/{{ char.hpMax }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import { classEffects } from '../utils/classEffects'
import { notifyError } from '../utils/toast'
import { errorMessage, selectedClass, type CatalogClass } from '../utils/catalog'
import { characterExport, characterPrintHtml, downloadCharacter } from '../utils/characterExport'
import {
  getModifier,
  calculateEncumbrance, getEncumbranceMovement,
  getMaximumEncumbrance, calculateAC,
  calculateHealingRate,
} from '../utils/mechanics'

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
async function refreshRuleCharacter() {
  const res=await api.get(`/api/characters/${char.value.id}`)
  char.value=res.data.character
  normalizeLoadedCharacter()
}

function exportSheet(format: 'json' | 'html') {
  if (!char.value) return
  const definition = selectedClass(customClasses.value, char.value)
  const content = format === 'json' ? JSON.stringify(characterExport(char.value, definition), null, 2) : characterPrintHtml(char.value, definition)
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

const computedAC = computed(() => {
  if (!char.value) return { noArmor: 0, noShield: 0, withShield: 0 }
  const dexMod = getModifier(char.value.dex)
  const base = calculateAC(Number(char.value.armorAcBonus || 0), dexMod, true)
  const adjustment = Number(char.value.acAdjustment ?? 0)
  return { noArmor: base.noArmor + adjustment, noShield: base.noShield + adjustment, withShield: base.withShield + adjustment }
})

const computedInitiative = computed(() => {
  if (!char.value) return 0
  return classEffects(char.value, selectedClass(customClasses.value, char.value)?.ruleProfile).initiative
})

const computedHealingRate = computed(() => {
  return calculateHealingRate()
})

const encumbranceResult = computed(() => {
  if (!char.value) return getEncumbranceMovement(0)
  const items = char.value.items || []
  const weapons = char.value.weapons || []
  const totalCoins = (char.value.coinPP || 0) + (char.value.coinEP || 0) + (char.value.coinGP || 0) + (char.value.coinSP || 0) + (char.value.coinCP || 0)
  const armorWeight = char.value.armorWeight || 0

  const totalStone = calculateEncumbrance(items, weapons, totalCoins, armorWeight)
  const maxCapacity = getMaximumEncumbrance(getModifier(char.value.str))
  return getEncumbranceMovement(totalStone, maxCapacity)
})

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
  if (saveConflict.value) return false
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
        const sent = JSON.parse(JSON.stringify(characterPayload()))
        const res = await api.put(`/api/characters/${char.value.id}`, sent)
        char.value.version = res.data.character.version
        // Merge server calculations only if no newer edit replaced this value.
        for (const key of ['classKey', 'className', 'title', 'hitDice', 'xpNext', 'saveDeath', 'saveParalysis', 'saveBlast', 'saveImplements', 'saveSpells']) {
          if (char.value[key] === sent[key] && res.data.character[key] !== undefined) char.value[key] = res.data.character[key]
        }
        if (char.value.level === sent.level && char.value.classKey === sent.classKey && campaignOptionalRules.value.enableClassAutoProgression !== false) {
          const selected = selectedClass(customClasses.value, char.value)
          const attack = selected && JSON.parse(selected.attackThrows)[char.value.level - 1]
          if (attack !== undefined) for (const w of char.value.weapons || []) w.attackThrow = attack
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
  if (!hasPendingChanges.value && !saveInFlight) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(async () => {
  if (!hasPendingChanges.value && !saveInFlight) return true
  return await saveCharacter()
})

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
