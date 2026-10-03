<template>
  <div class="space-y-4">
    <!-- ====== COINS, GEMS & JEWELRY ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h3 class="text-lg font-bold text-gold mb-3">Moedas, gemas e joias</h3>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
        <div><label class="lbl">PP</label><input v-model.number="character.coinPP" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
        <div><label class="lbl">EP</label><input v-model.number="character.coinEP" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
        <div><label class="lbl">GP</label><input v-model.number="character.coinGP" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
        <div><label class="lbl">SP</label><input v-model.number="character.coinSP" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
        <div><label class="lbl">CP</label><input v-model.number="character.coinCP" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp text-center" /></div>
      </div>
      <div>
        <label for="inventory-gems" class="lbl">Gemas e joias</label>
        <textarea id="inventory-gems" v-model="character.gemsJewelry" @input="emit('save')" @change="emit('save')" rows="3"
          class="w-full inp resize-y text-sm" placeholder="Descreva as gemas, joias e seus valores..."></textarea>
      </div>
    </div>

    <!-- ====== INVENTORY ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-bold text-gold">
          Inventário
          <span class="text-sm font-normal text-steel-light ml-2">
            ({{ encumbranceResult.totalStone.toFixed(1) }} Stone)
          </span>
        </h3>
        <div class="flex gap-2">
          <button type="button" @click="showShop = !showShop" class="text-xs bg-gold/10 text-gold px-2 py-1 rounded hover:bg-gold/20 transition-all font-bold">🛒 Loja</button>
          <button type="button" @click="addItem" class="text-sm text-gold hover:text-gold-light transition-colors">+ Adicionar</button>
        </div>
      </div>
      
      <!-- SHOP SECTION -->
      <div v-if="showShop" class="mb-4 p-4 border border-gold/40 rounded bg-dark-bg/50">
        <div class="flex items-center justify-between mb-3 border-b border-gold/20 pb-2">
          <h4 class="text-sm font-bold text-gold">Loja de equipamentos</h4>
          <button type="button" @click="showShop = false" aria-label="Fechar loja" class="text-crimson text-xs font-bold">X</button>
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
                Comprar
              </button>
            </div>
          </div>
        </div>
      </div>
      <p class="text-xs text-steel mb-3">6 itens leves = 1 stone. Capacidade da mochila: 4 stone.</p>

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
          class="grid grid-cols-[minmax(0,1fr)_3rem_4rem] sm:flex items-center gap-2 mb-2 bg-dark-bg/30 rounded-lg px-3 py-2">
          <input v-model="item.name" @change="applyCompendiumItem(item)" :aria-label="`Nome do item ${item.name || 'novo'}`" class="inp-table min-w-0 flex-1" placeholder="Item" list="acks-item-compendium" />
          <input v-model.number="item.quantity" @change="saveItem(item)" :aria-label="`Quantidade de ${item.name || 'item'}`" type="number" min="1" class="inp-table w-12 text-center" />
          <input v-model.number="item.weight" @change="saveItem(item)" :aria-label="`Peso de ${item.name || 'item'} em stone`" type="number" min="0" step="any" class="inp-table w-16 text-center" placeholder="st" />
          <select v-model="item.slot" @change="saveItem(item)" :aria-label="`Local de ${item.name || 'item'}`" class="inp-table col-span-2 min-w-0 sm:w-28 text-xs bg-dark-bg text-gold">
            <option v-for="s in SLOTS" :key="s.key" :value="s.key" class="bg-dark-bg text-gold">{{ s.label }}</option>
          </select>
          <button type="button" @click="removeItem(item.id)" :aria-label="`Remover ${item.name || 'item'}`" class="text-crimson-light hover:text-crimson text-xs ml-1 font-bold justify-self-end">X</button>
        </div>
      </div>
      <datalist id="acks-item-compendium">
        <option v-for="entry in compendiumItems" :key="entry.id" :value="entry.name" :label="entry.name" />
      </datalist>
    </div>

    <div v-if="showTreasureOrMaintenance" class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h3 class="text-lg font-bold text-gold mb-3">Tesouro, XP e manutenção</h3>
      <p v-if="isRuleEnabled('enableTreasureToXp')" class="text-sm text-steel-light mb-3">O mestre pode distribuir XP e ouro diretamente nas fichas. Use esta aba para consultar o saldo e registrar compras, gastos e itens. O cálculo de XP por tesouro e monstros fica em Evolução & Regras.</p>
      <div class="flex flex-wrap items-center gap-2">
        <button v-if="isRuleEnabled('enableTreasureToXp')" type="button" @click="emit('open-adventure')" class="text-sm px-4 py-2 bg-gold text-dark-bg font-bold rounded-lg">Ver XP e recompensas</button>
        <button v-if="isRuleEnabled('enableMonthlyMaintenance')" type="button" @click="recalculateMaintenance" class="text-sm px-3 py-2 bg-steel-dark text-gold rounded-lg">Recalcular manutenção mensal</button>
      </div>
      <div class="mt-3 text-xs text-steel-light">
        XP de tesouro acumulado: <span class="text-gold font-bold">{{ character.xpFromTreasure || 0 }}</span>
        · Manutenção mensal: <span class="text-gold font-bold">{{ character.monthlyUpkeepGp || 0 }} GP</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'InventoryTab' }
</script>
<script setup lang="ts">
import api from '../../services/api'
import { useCharacterRelations } from '../../composables/characterRelations'
import { notifyError, notifySuccess } from '../../utils/toast'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  character: any,
  encumbranceResult: any,
  encPercent: number,
  optionalRules?: Record<string, boolean>
  beforeOperation?: () => Promise<boolean>
}>()

const emit = defineEmits(['save', 'open-adventure'])
const relations = useCharacterRelations(() => props.character)
const compendiumItems = ref<any[]>([])
const shopItems = ref<any[]>([])
const showShop = ref(false)
const buying = ref(false)
const availableGp = computed(() => Number(props.character.coinGP || 0) + Number(props.character.coinSP || 0) / 10 + Number(props.character.coinCP || 0) / 100)

function isRuleEnabled(key: string) {
  return props.optionalRules?.[key] !== false
}

const showTreasureOrMaintenance = computed(() => {
  return isRuleEnabled('enableTreasureToXp') || isRuleEnabled('enableMonthlyMaintenance')
})

const SLOTS = [
  { key: 'backpack', label: 'Mochila (máx. 4 stone)', icon: '' },
  { key: 'worn', label: 'Vestido / equipado', icon: '' },
  { key: 'belt', label: 'Cinto', icon: '' },
  { key: 'pouch', label: 'Bolsa (máx. 3 itens)', icon: '' },
  { key: 'hand_right', label: 'Mão direita', icon: '' },
  { key: 'hand_left', label: 'Mão esquerda', icon: '' },
  { key: 'head', label: 'Cabeça', icon: '' },
  { key: 'sack', label: 'Saco', icon: '' },
  { key: 'hidden', label: 'Oculto', icon: '' },
  { key: 'mount', label: 'Na montaria (sem carga pessoal)', icon: '' },
  { key: 'vehicle', label: 'No veículo (sem carga pessoal)', icon: '' },
  { key: 'stashed', label: 'Guardado (sem carga pessoal)', icon: '' },
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
    const data = await relations.run(`shop:${shopItem.id}:purchase`, (version) => api.post(`/api/characters/${props.character.id}/shop/purchase`, { entryId: shopItem.id, version }), (data) => {
      if (data.weapon) props.character.weapons.push(data.weapon)
      if (data.item) props.character.items.push(data.item)
    })
    if (data) notifySuccess('Compra registrada.')
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
  await relations.update('items', item, {
    name: item.name, quantity: item.quantity, weight: item.weight, slot: item.slot, notes: item.notes ?? '',
  }, 'item')
}

// Items
async function addItem() {
  await relations.add('items', 'items', 'item', { name: 'Novo item', slot: 'backpack' })
}

async function removeItem(id: string) {
  await relations.remove('items', 'items', id)
}

async function recalculateMaintenance() {
  await relations.run('maintenance:recalculate', (version) => api.post(`/api/characters/${props.character.id}/maintenance/recalculate`, { version }), (data) => {
    props.character.monthlyUpkeepGp = data.monthlyUpkeepGp ?? props.character.monthlyUpkeepGp
  })
}
</script>






