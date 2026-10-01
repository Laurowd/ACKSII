<template>
  <div class="space-y-4">
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-4 border-b border-gold/10 pb-2">
        <h2 class="text-xl font-bold text-gold">ACTIVITIES (Downtime & Travel)</h2>
        <button @click="addActivity" class="text-sm bg-gold/10 text-gold px-3 py-1 rounded hover:bg-gold hover:text-dark-bg transition-colors font-bold">+ Nova Atividade</button>
      </div>

      <p class="text-sm text-steel mb-4">
        Gerencie o tempo gasto pelo personagem: mágicas, construções, cura, treinamentos e viagens.
      </p>

      <div class="grid grid-cols-1 gap-4">
        <div v-for="act in characterActivities" :key="act.id" class="bg-dark-bg/50 border border-steel-dark rounded-lg p-4">
          <div class="flex flex-col md:flex-row md:items-start gap-4 mb-3 border-b border-steel-dark/50 pb-3">
            <div class="flex-1 space-y-2 w-full">
              <div>
                <label class="lbl text-[10px]">Title</label>
                <input v-model="act.title" @blur="saveActivity(act)" class="inp font-bold text-gold w-full" placeholder="Ex: Pesquisar Fireball" />
              </div>
              <div>
                <label class="lbl text-[10px]">Type</label>
                <select v-model="act.type" @change="saveActivity(act)" class="inp w-full">
                  <option value="downtime">Downtime Geral</option>
                  <option value="research">Pesquisa Mágica</option>
                  <option value="crafting">Forja / Crafting</option>
                  <option value="healing">Repouso / Cura</option>
                  <option value="travel">Viagem / Exploração</option>
                  <option value="training">Treinamento</option>
                </select>
              </div>
            </div>

            <div class="flex-1 space-y-2 w-full">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="lbl text-[10px]">Duração (Semanas)</label>
                  <input v-model.number="act.durationWeeks" @blur="saveActivity(act)" type="number" min="1" class="inp w-full text-center" />
                </div>
                <div>
                  <label class="lbl text-[10px]">Semanas Restantes</label>
                  <input v-model.number="act.remainingWeeks" @blur="saveActivity(act)" type="number" min="0" class="inp w-full text-center" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="lbl text-[10px]">Custo (GP)</label>
                  <input v-model.number="act.costGp" @blur="saveActivity(act)" type="number" min="0" class="inp w-full text-center" />
                </div>
                <div>
                  <label class="lbl text-[10px]">Status</label>
                  <select v-model="act.status" @change="saveActivity(act)" class="inp w-full font-bold"
                    :class="act.status === 'COMPLETED' ? 'text-green-400' : act.status === 'ACTIVE' ? 'text-gold' : 'text-steel'">
                    <option value="QUEUED">Na Fila</option>
                    <option value="ACTIVE">Em Andamento</option>
                    <option value="COMPLETED">Concluído</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="flex-none pt-6 md:pt-0">
               <button @click="removeActivity(act.id)" class="text-crimson-light hover:text-crimson text-xs font-bold px-2 py-1 border border-crimson/20 rounded hover:bg-crimson/10 transition-colors w-full md:w-auto">Remover</button>
            </div>
          </div>
          
          <div>
            <label class="lbl text-[10px]">Detalhes / Notas</label>
            <textarea v-model="act.details" @blur="saveActivity(act)" rows="2" class="inp w-full text-sm" placeholder="Resultados esperados ou notas adicionais..."></textarea>
          </div>
        </div>
        
        <div v-if="!characterActivities.length" class="text-center py-6 text-steel-light/60 border border-dashed border-steel-dark rounded-lg">
          Nenhuma atividade registrada no momento.
        </div>
      </div>
    </div>

    <!-- ====== MERCANTILE VENTURES ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-4 border-b border-gold/10 pb-2">
        <h2 class="text-xl font-bold text-gold">MERCANTILE VENTURES (Trade & Cargo)</h2>
        <button @click="addVenture" class="text-sm bg-gold/10 text-gold px-3 py-1 rounded hover:bg-gold hover:text-dark-bg transition-colors font-bold">+ New Venture</button>
      </div>

      <p class="text-sm text-steel mb-4">
        Track purchased cargo, calculate Demand Modifiers based on Origin and Destination Market Classes, and apply profits.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr class="text-steel-light border-b border-gold/20">
              <th class="py-2 px-2">Cargo / Commodity</th>
              <th class="py-2 px-2 text-center w-24">Base Value</th>
              <th class="py-2 px-2 text-center w-20">Origin MC</th>
              <th class="py-2 px-2 text-center w-20">Dest MC</th>
              <th class="py-2 px-2 text-center w-28">Demand Mod</th>
              <th class="py-2 px-2 text-center w-28">Status / Profit</th>
              <th class="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ven in characterVentures" :key="ven.id" class="border-b border-steel-dark/30">
              <td class="py-2 px-2">
                <input v-model="ven.cargoName" @blur="saveVenture(ven)" class="inp-table w-full font-bold text-gold-light" placeholder="e.g. Spices, Furs" />
              </td>
              <td class="py-2 px-2 text-center">
                <div class="flex items-center gap-1">
                  <input v-model.number="ven.baseValueGp" @change="recalculateVenture(ven)" type="number" min="0" class="inp-table text-center w-full" />
                  <span class="text-steel text-xs">GP</span>
                </div>
              </td>
              <td class="py-2 px-2 text-center">
                <select v-model.number="ven.originMarketClass" @change="recalculateVenture(ven)" class="inp-table text-center w-full">
                  <option v-for="n in 6" :key="n" :value="n">{{['I','II','III','IV','V','VI'][n-1]}}</option>
                </select>
              </td>
              <td class="py-2 px-2 text-center">
                <select v-model.number="ven.destMarketClass" @change="recalculateVenture(ven)" class="inp-table text-center w-full">
                  <option v-for="n in 6" :key="n" :value="n">{{['I','II','III','IV','V','VI'][n-1]}}</option>
                </select>
              </td>
              <td class="py-2 px-2 text-center text-xs font-bold" :class="getDemandMod(ven) > 0 ? 'text-green-400' : getDemandMod(ven) < 0 ? 'text-crimson' : 'text-steel'">
                {{ getDemandMod(ven) > 0 ? '+' : '' }}{{ getDemandMod(ven) }}%
              </td>
              <td class="py-2 px-2 text-center">
                <div class="flex flex-col gap-1">
                  <select v-model="ven.status" @change="saveVenture(ven)" class="inp-table text-xs w-full" :class="ven.status === 'SOLD' ? 'text-green-400' : 'text-gold'">
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="SOLD">Sold</option>
                  </select>
                  <span v-if="ven.status === 'SOLD'" class="text-green-400 font-bold text-xs">+{{ ven.profitGp.toLocaleString() }} GP</span>
                </div>
              </td>
              <td class="py-2 px-2 text-center flex gap-1">
                <button v-if="ven.status !== 'SOLD'" :disabled="selling.has(ven.id)" @click="sellVenture(ven)" type="button" class="text-green-400 hover:text-green-300 text-xs font-bold p-1 border border-green-400/30 rounded hover:bg-green-400/20 disabled:opacity-50" title="Sell Cargo">Sell</button>
                <button type="button" @click="removeVenture(ven.id)" class="text-crimson-light hover:text-crimson text-xs font-bold p-1 rounded hover:bg-crimson/20" title="Delete">X</button>
              </td>
            </tr>
            <tr v-if="!characterVentures.length">
              <td colspan="7" class="text-center text-steel-light py-6 text-xs italic">Nenhum empreendimento comercial registrado.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-xs text-steel/70 flex justify-between">
        <span>Estimativa simplificada: 10% por diferença de classe de mercado; mercados iguais: 0%. Confira os valores com o mestre. A venda credita o retorno uma única vez; o custo de aquisição deve ter sido registrado antes.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import api from '../../services/api'
import { notifyError, notifySuccess } from '../../utils/toast'
import { errorMessage } from '../../utils/catalog'

defineOptions({ name: 'ActivitiesTab' })

const props = defineProps<{
  character: any
  prepare: () => Promise<boolean>
}>()

const selling = ref(new Set<string>())

const characterActivities = computed(() => {
  return props.character?.activities || []
})

async function addActivity() {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/activities`, {})
    if (!props.character.activities) props.character.activities = []
    props.character.activities.push(res.data.activity)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível adicionar a atividade.'))
  }
}

async function saveActivity(act: any) {
  try {
    await api.put(`/api/characters/${props.character.id}/activities/${act.id}`, {
      title: act.title,
      type: act.type,
      durationWeeks: act.durationWeeks,
      remainingWeeks: act.remainingWeeks,
      costGp: act.costGp,
      status: act.status,
      details: act.details
    })
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível salvar a atividade. Tente novamente.'))
  }
}

async function removeActivity(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/activities/${id}`)
    props.character.activities = props.character.activities.filter((a: any) => a.id !== id)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível remover a atividade.'))
  }
}

// ==== MERCANTILE VENTURES ====
const characterVentures = computed(() => {
  return props.character?.mercantileVentures || []
})

async function addVenture() {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/mercantile`, {
      cargoName: 'New Cargo',
      baseValueGp: 100,
      originMarketClass: 3,
      destMarketClass: 3,
      distanceHexes: 1,
      status: 'IN_TRANSIT',
      profitGp: 0
    })
    if (!props.character.mercantileVentures) props.character.mercantileVentures = []
    props.character.mercantileVentures.push(res.data.venture)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível adicionar a carga mercantil.'))
  }
}

async function removeVenture(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/mercantile/${id}`)
    props.character.mercantileVentures = props.character.mercantileVentures.filter((v: any) => v.id !== id)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível remover a carga mercantil.'))
  }
}

async function saveVenture(ven: any) {
  try {
    await api.put(`/api/characters/${props.character.id}/mercantile/${ven.id}`, ven)
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível salvar a carga mercantil. Tente novamente.'))
  }
}

function getDemandMod(ven: any) {
  // Simplification of ACKS II Market Class Demand Rules
  // Difference between Destination and Origin. 
  // e.g., Origin III, Dest I (Metropolis). Dest < Origin = +Demand.
  // We'll give +10% for each step smaller in class number (bigger market).
  // -10% for each step larger in class number (smaller market).
  // Some modifiers: Class I = Highest Demand. Class VI = Lowest Demand.
  const origin = Number(ven.originMarketClass) || 3
  const dest = Number(ven.destMarketClass) || 3
  if (origin === dest) return 0;
  
  const diff = origin - dest; // if origin 5, dest 1 => diff = +4 (massive profit)
  return diff * 10;
}

function recalculateVenture(ven: any) {
  ven.profitGp = 0; // Only calculates profit when sold
  saveVenture(ven)
}

async function sellVenture(ven: any) {
  if (ven.status === 'SOLD' || selling.value.has(ven.id)) return
  selling.value.add(ven.id)
  try {
    if (!await props.prepare()) return
    const { data } = await api.post(`/api/characters/${props.character.id}/mercantile/${ven.id}/sell`, { version: props.character.version })
    Object.assign(ven, data.venture)
    Object.assign(props.character, data.character)
    notifySuccess('Carga vendida e saldo atualizado.')
  } catch (e) {
    notifyError(errorMessage(e, 'Não foi possível vender a carga. Tente novamente.'))
  } finally { selling.value.delete(ven.id) }
}
</script>
