<template>
  <div class="space-y-4">
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-4 border-b border-gold/10 pb-2">
        <h2 class="text-xl font-bold text-gold">Atividades, descanso e viagens</h2>
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
                <label :for="`activity-title-${act.id}`" class="lbl text-[10px]">Título</label>
                <input :id="`activity-title-${act.id}`" v-model="act.title" @blur="saveActivity(act)" class="inp font-bold text-gold w-full" placeholder="Ex: Pesquisar Fireball" />
              </div>
              <div>
                <label :for="`activity-type-${act.id}`" class="lbl text-[10px]">Tipo</label>
                <select :id="`activity-type-${act.id}`" v-model="act.type" @change="saveActivity(act)" class="inp w-full">
                  <option value="downtime">Downtime Geral</option>
                  <option value="research">Pesquisa Mágica</option>
                  <option value="crafting">Forja / fabricação</option>
                  <option value="healing">Repouso / Cura</option>
                  <option value="travel">Viagem / Exploração</option>
                  <option value="training">Treinamento</option>
                </select>
              </div>
            </div>

            <div class="flex-1 space-y-2 w-full">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label :for="`activity-duration-${act.id}`" class="lbl text-[10px]">Duração (semanas)</label>
                  <input :id="`activity-duration-${act.id}`" v-model.number="act.durationWeeks" @blur="saveActivity(act)" type="number" min="1" class="inp w-full text-center" />
                </div>
                <div>
                  <label :for="`activity-remaining-${act.id}`" class="lbl text-[10px]">Semanas restantes</label>
                  <input :id="`activity-remaining-${act.id}`" v-model.number="act.remainingWeeks" @blur="saveActivity(act)" type="number" min="0" class="inp w-full text-center" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label :for="`activity-cost-${act.id}`" class="lbl text-[10px]">Custo (GP)</label>
                  <input :id="`activity-cost-${act.id}`" v-model.number="act.costGp" @blur="saveActivity(act)" type="number" min="0" class="inp w-full text-center" />
                </div>
                <div>
                  <label :for="`activity-status-${act.id}`" class="lbl text-[10px]">Situação</label>
                  <select :id="`activity-status-${act.id}`" v-model="act.status" @change="saveActivity(act)" class="inp w-full font-bold"
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
            <label :for="`activity-details-${act.id}`" class="lbl text-[10px]">Detalhes / notas</label>
            <textarea :id="`activity-details-${act.id}`" v-model="act.details" @blur="saveActivity(act)" rows="2" class="inp w-full text-sm" placeholder="Resultados esperados ou notas adicionais..."></textarea>
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
        <h2 class="text-xl font-bold text-gold">Comércio e cargas</h2>
        <button @click="addVenture" class="text-sm bg-gold/10 text-gold px-3 py-1 rounded hover:bg-gold hover:text-dark-bg transition-colors font-bold">+ Nova carga</button>
      </div>

      <p class="text-sm text-steel mb-4">
        Registre a carga e os mercados. Vender carga credita o retorno e registra a liquidação; os valores de uma venda concluída ficam preservados.
      </p>
      <p v-if="settlementsError" role="alert" class="text-red-400 text-sm mb-3">{{ settlementsError }} <button type="button" @click="loadSettlements" class="underline">Tentar carregar vendas novamente</button></p>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left block sm:table">
          <thead class="hidden sm:table-header-group">
            <tr class="text-steel-light border-b border-gold/20">
              <th class="py-2 px-2">Carga</th>
              <th class="py-2 px-2 text-center w-24">Valor base</th>
              <th class="py-2 px-2 text-center w-20">Mercado de origem</th>
              <th class="py-2 px-2 text-center w-20">Mercado de destino</th>
              <th class="py-2 px-2 text-center w-28">Demanda</th>
              <th class="py-2 px-2 text-center w-28">Situação / lucro</th>
              <th class="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody class="block sm:table-row-group">
            <tr v-for="ven in characterVentures" :key="ven.id" class="grid grid-cols-2 sm:table-row border border-steel-dark/50 sm:border-0 sm:border-b rounded-xl p-2 sm:p-0 mb-3 sm:mb-0">
              <td class="py-2 px-2 col-span-2 sm:table-cell min-w-0">
                <span class="block sm:hidden text-xs text-steel-light">Carga</span>
                <input v-model="ven.cargoName" @blur="saveVenture(ven)" :aria-label="`Nome da carga ${ven.cargoName}`" class="inp-table w-full font-bold text-gold-light" placeholder="Especiarias, peles..." />
              </td>
              <td class="py-2 px-2 text-center">
                <span class="block sm:hidden text-xs text-steel-light">Valor base</span>
                <div class="flex items-center gap-1">
                  <input v-model.number="ven.baseValueGp" @change="saveVenture(ven)" :disabled="ven.status === 'SOLD' || selling.has(ven.id)" :aria-label="`Valor base de ${ven.cargoName}`" type="number" min="0" class="inp-table text-center w-full" />
                  <span class="text-steel text-xs">GP</span>
                </div>
              </td>
              <td class="py-2 px-2 text-center">
                <span class="block sm:hidden text-xs text-steel-light">Mercado de origem</span>
                <select v-model.number="ven.originMarketClass" @change="saveVenture(ven)" :disabled="ven.status === 'SOLD' || selling.has(ven.id)" :aria-label="`Mercado de origem de ${ven.cargoName}`" class="inp-table text-center w-full">
                  <option v-for="n in 6" :key="n" :value="n">{{['I','II','III','IV','V','VI'][n-1]}}</option>
                </select>
              </td>
              <td class="py-2 px-2 text-center">
                <span class="block sm:hidden text-xs text-steel-light">Mercado de destino</span>
                <select v-model.number="ven.destMarketClass" @change="saveVenture(ven)" :disabled="ven.status === 'SOLD' || selling.has(ven.id)" :aria-label="`Mercado de destino de ${ven.cargoName}`" class="inp-table text-center w-full">
                  <option v-for="n in 6" :key="n" :value="n">{{['I','II','III','IV','V','VI'][n-1]}}</option>
                </select>
              </td>
              <td class="py-2 px-2 text-center text-xs font-bold" :class="getDemandMod(ven) > 0 ? 'text-green-400' : getDemandMod(ven) < 0 ? 'text-crimson' : 'text-steel'">
                <span class="block sm:hidden text-xs text-steel-light">Demanda</span>
                {{ getDemandMod(ven) > 0 ? '+' : '' }}{{ getDemandMod(ven) }}%
              </td>
              <td class="py-2 px-2 text-center">
                <div class="flex flex-col gap-1">
                  <span :class="ven.status === 'SOLD' ? 'text-green-400' : 'text-gold'">{{ ven.status === 'SOLD' ? 'Vendida' : 'Em trânsito' }}</span>
                  <span v-if="ven.status === 'SOLD'" class="font-bold text-xs" :class="ven.profitGp >= 0 ? 'text-green-400' : 'text-red-400'">Lucro: {{ ven.profitGp.toLocaleString('pt-BR') }} GP</span>
                  <template v-if="ven.status === 'SOLD' && settlementsLoaded && !settledIds.has(ven.id)">
                    <span class="text-xs text-steel-light">Registro manual sem liquidação registrada.</span>
                    <button v-if="canManage" type="button" @click="reopenVenture(ven)" :disabled="selling.has(ven.id)" class="text-gold underline text-xs">Reabrir registro manual</button>
                  </template>
                </div>
              </td>
              <td class="py-2 px-2 text-center flex gap-1">
                <button v-if="ven.status !== 'SOLD'" :disabled="selling.has(ven.id)" @click="sellVenture(ven)" type="button" class="text-green-400 hover:text-green-300 text-xs font-bold p-1 border border-green-400/30 rounded hover:bg-green-400/20 disabled:opacity-50">Vender carga</button>
                <button type="button" @click="removeVenture(ven.id)" :disabled="selling.has(ven.id)" :aria-label="`Remover carga ${ven.cargoName}`" class="text-crimson-light hover:text-crimson text-xs font-bold p-1 rounded hover:bg-crimson/20">X</button>
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
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import { useCharacterRelations } from '../../composables/characterRelations'
import { notifySuccess } from '../../utils/toast'
import { errorMessage } from '../../utils/catalog'

defineOptions({ name: 'ActivitiesTab' })

const props = defineProps<{
  character: any
  prepare: () => Promise<boolean>
  canManage?: boolean
}>()

const relations = useCharacterRelations(() => props.character)
const settledIds = ref(new Set<string>()), settlementsLoaded = ref(false), settlementsError = ref('')
async function loadSettlements() {
  settlementsError.value = ''; settlementsLoaded.value = false
  try { settledIds.value = new Set((await api.get(`/api/characters/${props.character.id}/mercantile/settlements`)).data.settledIds); settlementsLoaded.value = true }
  catch (e) { settlementsError.value = errorMessage(e, 'Não foi possível consultar as liquidações das cargas.') }
}
onMounted(loadSettlements)

const selling = ref(new Set<string>())

const characterActivities = computed(() => {
  return props.character?.activities || []
})

async function addActivity() {
  await relations.add('activities', 'activities', 'activity')
}

async function saveActivity(act: any) {
  await relations.update('activities', act, {
    title: act.title, type: act.type, durationWeeks: act.durationWeeks,
    remainingWeeks: act.remainingWeeks, costGp: act.costGp,
    status: act.status, details: act.details,
  }, 'activity')
}

async function removeActivity(id: string) {
  await relations.remove('activities', 'activities', id)
}

// ==== MERCANTILE VENTURES ====
const characterVentures = computed(() => {
  return props.character?.mercantileVentures || []
})

async function addVenture() {
  await relations.add('mercantile', 'mercantileVentures', 'venture', {
    cargoName: 'Nova carga', baseValueGp: 100,
    originMarketClass: 3, destMarketClass: 3, distanceHexes: 1,
    status: 'IN_TRANSIT', profitGp: 0,
  })
}

async function removeVenture(id: string) {
  await relations.remove('mercantile', 'mercantileVentures', id)
}

async function saveVenture(ven: any) {
  await relations.update('mercantile', ven, {
    cargoName: ven.cargoName, baseValueGp: ven.baseValueGp,
    originMarketClass: ven.originMarketClass, destMarketClass: ven.destMarketClass,
    distanceHexes: ven.distanceHexes,
  }, 'venture')
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

async function sellVenture(ven: any) {
  if (ven.status === 'SOLD' || selling.value.has(ven.id)) return
  selling.value.add(ven.id)
  try {
    const data = await relations.run(`mercantile:${ven.id}:sell`, (version) => api.post(`/api/characters/${props.character.id}/mercantile/${ven.id}/sell`, { version }), (data) => {
      Object.assign(ven, data.venture)
      settledIds.value.add(ven.id)
    })
    if (data) notifySuccess('Carga vendida e saldo atualizado.')
  } finally { selling.value.delete(ven.id) }
}

async function reopenVenture(ven: any) {
  const reason = window.prompt('Justifique a correção. Reabrir não altera moedas. Confira antes se o retorno já foi recebido; se já foi, mantenha o registro vendido.')
  if (!reason?.trim() || selling.value.has(ven.id)) return
  selling.value.add(ven.id)
  try {
    const data = await relations.run(`mercantile:${ven.id}:reopen`, version => api.post(`/api/characters/${props.character.id}/mercantile/${ven.id}/reopen`, { version, reason }), data => Object.assign(ven, data.venture))
    if (data) notifySuccess('Registro reaberto. Nenhuma moeda foi movimentada.')
  } finally { selling.value.delete(ven.id) }
}
</script>
