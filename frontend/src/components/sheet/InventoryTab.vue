<template>
  <div class="space-y-4">
    <!-- ====== COINS, GEMS & JEWELRY ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h3 class="text-lg font-bold text-gold mb-3">COINS, GEMS & JEWELRY</h3>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
        <div><label class="lbl">PP</label><input v-model.number="character.coinPP" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
        <div><label class="lbl">EP</label><input v-model.number="character.coinEP" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
        <div><label class="lbl">GP</label><input v-model.number="character.coinGP" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
        <div><label class="lbl">SP</label><input v-model.number="character.coinSP" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
        <div><label class="lbl">CP</label><input v-model.number="character.coinCP" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
      </div>
      <div>
        <label class="lbl">Gems / Jewelry</label>
        <textarea v-model="character.gemsJewelry" @change="emit('save')" rows="3"
          class="w-full inp resize-y text-sm" placeholder="Gems and jewelry..."></textarea>
      </div>
    </div>

    <!-- ====== INVENTORY ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-bold text-gold">
          INVENTORY
          <span class="text-sm font-normal text-steel-light ml-2">
            ({{ encumbranceResult.totalStone.toFixed(1) }} Stone)
          </span>
        </h3>
        <div class="flex gap-2">
          <button type="button" @click="showShop = !showShop" class="text-xs bg-gold/10 text-gold px-2 py-1 rounded hover:bg-gold/20 transition-all font-bold">🛒 Loja</button>
          <button type="button" @click="addItem" class="text-sm text-gold hover:text-gold-light transition-colors">+ Add</button>
        </div>
      </div>
      
      <!-- SHOP SECTION -->
      <div v-if="showShop" class="mb-4 p-4 border border-gold/40 rounded bg-dark-bg/50">
        <div class="flex items-center justify-between mb-3 border-b border-gold/20 pb-2">
          <h4 class="text-sm font-bold text-gold">EQUIPMENT SHOP</h4>
          <button @click="showShop = false" class="text-crimson text-xs font-bold">X</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
          <div v-for="shopItem in shopItems" :key="shopItem.id" class="flex justify-between items-center bg-dark-bg p-2 rounded border border-steel-dark text-xs">
            <div class="flex-1 min-w-0">
              <div class="font-bold text-steel-light truncate" :title="shopItem.name">{{ shopItem.name }}</div>
              <div class="text-steel truncate">Enc: {{ shopItem.encumbrance || 0 }}st | Tipo: {{ shopItem.type }}</div>
            </div>
            <div class="flex flex-col items-end shrink-0 ml-2">
              <div class="text-gold font-bold mb-1">{{ shopItem.costGp }} GP</div>
              <button @click="buyItem(shopItem)" :disabled="buying || availableGp < (shopItem.costGp || 0)" 
                class="px-2 py-0.5 rounded text-[10px] font-bold"
                :class="!buying && availableGp >= (shopItem.costGp || 0) ? 'bg-gold text-dark-bg hover:bg-gold-light' : 'bg-steel-dark text-steel cursor-not-allowed'">
                BUY
              </button>
            </div>
          </div>
        </div>
      </div>
      <p class="text-xs text-steel mb-3">6 items = 1 Stone. Backpack max 4 Stone.</p>

      <!-- Encumbrance bar -->
      <div class="w-full bg-dark-bg rounded-full h-3 mb-4 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500"
          :class="encPercent <= 50 ? 'bg-green-500' : encPercent <= 70 ? 'bg-yellow-500' : encPercent <= 100 ? 'bg-orange-500' : 'bg-red-500'"
          :style="{ width: Math.min(encPercent, 100) + '%' }"></div>
      </div>

      <!-- Items by slot -->
      <div v-for="slot in SLOTS" :key="slot.key" class="mb-4">
        <h4 class="text-sm font-bold text-steel-light uppercase tracking-wider mb-2 flex items-center gap-1">
          {{ slot.label }}
        </h4>
        <div v-for="item in getItemsBySlot(slot.key)" :key="item.id" 
          class="flex items-center gap-2 mb-1.5 bg-dark-bg/30 rounded-lg px-3 py-1.5">
          <input v-model="item.name" @change="applyCompendiumItem(item)" class="inp-table min-w-0 flex-1" placeholder="Item" list="acks-item-compendium" />
          <input v-model.number="item.quantity" @change="saveItem(item)" type="number" min="1" class="inp-table w-12 text-center" />
          <input v-model.number="item.weight" @change="saveItem(item)" type="number" min="0" step="any" class="inp-table w-16 text-center" placeholder="st" />
          <select v-model="item.slot" @change="saveItem(item)" class="inp-table w-24 text-xs bg-dark-bg text-gold">
            <option v-for="s in SLOTS" :key="s.key" :value="s.key" class="bg-dark-bg text-gold">{{ s.label }}</option>
          </select>
          <button @click="removeItem(item.id)" class="text-crimson-light hover:text-crimson text-xs ml-1 font-bold">X</button>
        </div>
      </div>
      <datalist id="acks-item-compendium">
        <option v-for="entry in compendiumItems" :key="entry.id" :value="entry.name" :label="entry.name" />
      </datalist>
    </div>

    <div v-if="showTreasureOrMaintenance" class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h3 class="text-lg font-bold text-gold mb-3">TESOURO, XP E MANUTENCAO</h3>
      <label class="lbl">Identificação do tesouro (use a mesma para repetir uma tentativa)</label>
      <input v-model="awardId" class="inp mb-2" maxlength="120" placeholder="Sessão 12 — tesouro da cripta" />
      <p class="text-xs text-steel-light mb-2">Informe a parcela elegível recuperada nesta aventura. Receber XP preserva as moedas; o identificador evita premiar a mesma parcela novamente.</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="lbl">Converter GP em XP</label>
          <input v-model.number="treasureToConvert.gp" type="number" min="0" class="inp" />
        </div>
        <div>
          <label class="lbl">Converter SP em XP</label>
          <input v-model.number="treasureToConvert.sp" type="number" min="0" class="inp" />
        </div>
        <div>
          <label class="lbl">Converter CP em XP</label>
          <input v-model.number="treasureToConvert.cp" type="number" min="0" class="inp" />
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button v-if="isRuleEnabled('enableTreasureToXp')" @click="convertTreasureToXp" class="text-sm px-3 py-1 bg-gold text-dark-bg font-bold rounded">Converter Tesouro -> XP</button>
        <button v-if="isRuleEnabled('enableMonthlyMaintenance')" @click="recalculateMaintenance" class="text-sm px-3 py-1 bg-steel-dark text-gold rounded">Recalcular Manutencao Mensal</button>
      </div>
      <div class="mt-3 text-xs text-steel-light">
        XP de tesouro acumulado: <span class="text-gold font-bold">{{ character.xpFromTreasure || 0 }}</span>
        | Upkeep mensal: <span class="text-gold font-bold">{{ character.monthlyUpkeepGp || 0 }} GP</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'InventoryTab' }
</script>
<script setup lang="ts">
import api from '../../services/api'
import { notifyError, notifySuccess } from '../../utils/toast'
import { errorMessage } from '../../utils/catalog'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  character: any,
  encumbranceResult: any,
  encPercent: number,
  optionalRules?: Record<string, boolean>
  beforeOperation?: () => Promise<boolean>
}>()

const emit = defineEmits(['save'])
const compendiumItems = ref<any[]>([])
const shopItems = ref<any[]>([])
const showShop = ref(false)
const buying = ref(false), awarding = ref(false), awardId = ref('')
const availableGp = computed(() => Number(props.character.coinGP || 0) + Number(props.character.coinSP || 0) / 10 + Number(props.character.coinCP || 0) / 100)
const treasureToConvert = ref({ gp: 0, sp: 0, cp: 0 })

function isRuleEnabled(key: string) {
  return props.optionalRules?.[key] !== false
}

const showTreasureOrMaintenance = computed(() => {
  return isRuleEnabled('enableTreasureToXp') || isRuleEnabled('enableMonthlyMaintenance')
})

const SLOTS = [
  { key: 'backpack', label: 'Backpack (4 Stone max)', icon: '' },
  { key: 'worn', label: 'Worn (misc.)', icon: '' },
  { key: 'belt', label: 'Hanging from belt', icon: '' },
  { key: 'pouch', label: 'Pouch (3 items max)', icon: '' },
  { key: 'hand_right', label: 'Right hand', icon: '' },
  { key: 'hand_left', label: 'Left hand', icon: '' },
  { key: 'head', label: 'Head', icon: '' },
  { key: 'sack', label: 'Sack', icon: '' },
  { key: 'hidden', label: 'Hidden', icon: '' },
  { key: 'mount', label: 'On Mount (No carry weight)', icon: '' },
  { key: 'vehicle', label: 'In Vehicle (No carry weight)', icon: '' },
  { key: 'stashed', label: 'Stashed (No carry weight)', icon: '' },
]

function getItemsBySlot(slot: string) {
  return props.character?.items?.filter((i: any) => i.slot === slot) || []
}

onMounted(() => {
  loadItemCompendium()
})

async function loadItemCompendium() {
  try {
    const [items, weapons] = await Promise.all([
      api.get('/api/compendium/search', { params: { type: 'item', limit: 500 } }),
      api.get('/api/compendium/search', { params: { type: 'weapon', limit: 500 } }),
    ])
    compendiumItems.value = items.data.entries || []
    shopItems.value = [...(weapons.data.entries || []), ...compendiumItems.value].filter((e: any) => e.costGp > 0)
  } catch (e) {
    notifyError('Não foi possível carregar a loja e o catálogo de itens. Reabra a aba para tentar novamente.')
  }
}

async function buyItem(shopItem: any) {
  if (buying.value) return
  buying.value = true
  try {
    if (props.beforeOperation && !(await props.beforeOperation())) return
    const res = await api.post(`/api/characters/${props.character.id}/shop/purchase`, { entryId: shopItem.id })
    for (const key of ['coinGP', 'coinSP', 'coinCP', 'version']) props.character[key] = res.data.character[key]
    if (res.data.weapon) props.character.weapons.push(res.data.weapon)
    if (res.data.item) props.character.items.push(res.data.item)
    notifySuccess('Compra registrada.')
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível confirmar a compra. Atualize a ficha antes de tentar novamente.'))
  } finally { buying.value = false }
}

function applyCompendiumItem(item: any) {
  const match = compendiumItems.value.find((entry) => entry.name.toLowerCase() === String(item.name || '').toLowerCase())
  if (match) {
    if (!item.weight || item.weight <= 0) {
      item.weight = Number(match.encumbrance || 0)
    }
    void saveItem(item)
    return
  }
  void saveItem(item)
}

async function saveItem(item: any) {
  try {
    await api.put(`/api/characters/${props.character.id}/items/${item.id}`, {
      name: item.name, quantity: item.quantity, weight: item.weight, slot: item.slot, notes: item.notes ?? '',
    })
  } catch(e) { notifyError(errorMessage(e, 'Não foi possível salvar o item. Tente novamente.')) }
}

// Items
async function addItem() {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/items`, { name: 'Novo Item', slot: 'backpack' })
    props.character.items.push(res.data.item)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível adicionar o item. Tente novamente.'))
  }
}

async function removeItem(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/items/${id}`)
    props.character.items = props.character.items.filter((i: any) => i.id !== id)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível remover o item. Atualize a ficha e tente novamente.'))
  }
}

async function convertTreasureToXp() {
  if (awarding.value) return
  if (!awardId.value.trim()) { notifyError('Informe uma identificação para este tesouro.'); return }
  awarding.value = true
  try {
    if (props.beforeOperation && !(await props.beforeOperation())) return
    const res = await api.post(`/api/characters/${props.character.id}/treasure/convert-xp`, { ...treasureToConvert.value, awardId: awardId.value })
    props.character.xp = res.data.character?.xp ?? props.character.xp
    props.character.version = res.data.character?.version ?? props.character.version
    props.character.xpFromTreasure = res.data.character?.xpFromTreasure ?? props.character.xpFromTreasure
    props.character.coinGP = res.data.character?.coinGP ?? props.character.coinGP
    props.character.coinSP = res.data.character?.coinSP ?? props.character.coinSP
    props.character.coinCP = res.data.character?.coinCP ?? props.character.coinCP
    treasureToConvert.value = { gp: 0, sp: 0, cp: 0 }
    notifySuccess(`Recebeu ${res.data.xpGain} XP. Tesouro preservado.`)
  } catch (e) {
    notifyError(errorMessage(e, 'Falha ao registrar XP. Mantenha a identificação ao tentar novamente.'))
  } finally { awarding.value = false }
}

async function recalculateMaintenance() {
  try {
    if (props.beforeOperation && !(await props.beforeOperation())) return
    const res = await api.post(`/api/characters/${props.character.id}/maintenance/recalculate`, {})
    props.character.version = res.data.character.version
    props.character.monthlyUpkeepGp = res.data.monthlyUpkeepGp ?? props.character.monthlyUpkeepGp
    emit('save')
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível recalcular a manutenção mensal. Tente novamente.'))
  }
}
</script>






