<template>
  <div class="space-y-4">
    <!-- ====== HENCHMEN (Capangas e Mercenários) ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-gold">HENCHMEN & RETAINERS</h3>
        <button @click="addHenchman" class="text-sm text-gold hover:text-gold-light transition-colors">+ Add</button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-steel-light border-b border-steel-dark text-left">
              <th class="py-2 px-2">Name / Class</th>
              <th class="py-2 px-1 text-center w-12">Lvl</th>
              <th class="py-2 px-1 text-center w-16">Morale</th>
              <th class="py-2 px-1 text-center w-16">Loyalty</th>
              <th class="py-2 px-1 text-center w-24">Type/Capacity</th>
              <th class="py-2 px-1 text-center w-24">Monthly Wage</th>
              <th class="py-2 px-1 text-center w-20">Treasure Share</th>
              <th class="py-2 px-2">Notes</th>
              <th class="py-2 px-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in character.henchmen" :key="h.id" class="border-b border-steel-dark/30">
              <td class="py-1 px-2">
                <input v-model="h.name" @blur="saveHenchman(h)" class="inp-table w-full font-bold" placeholder="Name" />
                <input v-model="h.className" @blur="saveHenchman(h)" class="inp-table w-full text-xs text-steel-light" placeholder="Class" />
              </td>
              <td class="py-1 px-1"><input v-model.number="h.level" @blur="saveHenchman(h)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input v-model.number="h.morale" @blur="saveHenchman(h)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input v-model.number="h.loyalty" @blur="saveHenchman(h)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1">
                <select v-model="h.roleType" @blur="saveHenchman(h)" class="inp-table w-full text-xs">
                  <option value="retainer">Retainer</option>
                  <option value="mercenary">Mercenary</option>
                  <option value="specialist">Specialist</option>
                  <option value="entourage">Entourage</option>
                </select>
                <input v-model.number="h.capacity" @blur="saveHenchman(h)" type="number" class="inp-table w-full text-xs mt-1" placeholder="Capacity" />
              </td>
              <td class="py-1 px-1"><input v-model.number="h.wage" @blur="saveHenchman(h)" type="number" class="inp-table text-center w-full" placeholder="GP" /></td>
              <td class="py-1 px-1"><input v-model.number="h.treasureShare" @blur="saveHenchman(h)" type="number" step="0.1" class="inp-table text-center w-full" placeholder="%" /></td>
              <td class="py-1 px-2"><textarea v-model="h.notes" @blur="saveHenchman(h)" class="inp-table w-full resize-y h-10" placeholder="Gear, location..."></textarea></td>
              <td class="py-1 px-1">
                <button type="button" @click="removeHenchman(h.id)" class="text-crimson-light hover:text-crimson text-xs font-bold">X</button>
              </td>
            </tr>
            <tr v-if="!character.henchmen || character.henchmen.length === 0">
              <td colspan="9" class="text-center text-steel-light py-4 text-xs">No henchmen managed.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====== ARMY UNITS (Tropas & Batalhas) ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-gold">ARMIES & MASS COMBAT</h3>
        <button @click="addArmyUnit" class="text-sm text-gold hover:text-gold-light transition-colors">+ Add Unit</button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-steel-light border-b border-steel-dark text-left">
              <th class="py-2 px-2">Unit Name / Type</th>
              <th class="py-2 px-1 text-center w-12">AC</th>
              <th class="py-2 px-1 text-center w-16">Damage</th>
              <th class="py-2 px-1 text-center w-16">Move</th>
              <th class="py-2 px-1 text-center w-12">HP</th>
              <th class="py-2 px-1 text-center w-16">Morale</th>
              <th class="py-2 px-1 text-center w-20">Cost/Mo</th>
              <th class="py-2 px-2">Equipment / Notes</th>
              <th class="py-2 px-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in character.armyUnits" :key="u.id" class="border-b border-steel-dark/30">
              <td class="py-1 px-2">
                <input v-model="u.name" @blur="saveArmyUnit(u)" class="inp-table w-full font-bold" placeholder="Unit Name" />
                <input v-model="u.troopType" @blur="saveArmyUnit(u)" class="inp-table w-full text-xs text-steel-light" placeholder="e.g. Light Infantry" />
              </td>
              <td class="py-1 px-1"><input v-model.number="u.ac" @blur="saveArmyUnit(u)" type="number" class="inp-table text-center w-full text-gold font-bold" /></td>
              <td class="py-1 px-1"><input v-model="u.damage" @blur="saveArmyUnit(u)" class="inp-table text-center w-full" placeholder="1d6" /></td>
              <td class="py-1 px-1"><input v-model.number="u.movement" @blur="saveArmyUnit(u)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input v-model.number="u.hp" @blur="saveArmyUnit(u)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input v-model.number="u.morale" @blur="saveArmyUnit(u)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input v-model.number="u.monthlyCostGp" @blur="saveArmyUnit(u)" type="number" step="0.1" class="inp-table text-center w-full" placeholder="GP" /></td>
              <td class="py-1 px-2">
                <input v-model="u.equipment" @blur="saveArmyUnit(u)" class="inp-table w-full text-xs mb-1" placeholder="Equipment..." />
                <textarea v-model="u.notes" @blur="saveArmyUnit(u)" class="inp-table w-full resize-y h-6 text-xs" placeholder="Notes..."></textarea>
              </td>
              <td class="py-1 px-1 text-center">
                <button type="button" @click="removeArmyUnit(u.id)" class="text-crimson-light hover:text-crimson text-xs font-bold">X</button>
              </td>
            </tr>
            <tr v-if="!character.armyUnits || character.armyUnits.length === 0">
              <td colspan="9" class="text-center text-steel-light py-4 text-xs">No military units managed.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====== DOMAIN MANAGEMENT ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3 border-b border-steel-dark pb-3">
        <h3 class="text-lg font-bold text-gold">DOMAIN & SETTLEMENT</h3>
        <button @click="saveDomain" class="text-xs bg-gold/10 text-gold px-3 py-1 rounded hover:bg-gold/20 transition-all">Save Domain</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="md:col-span-2 lg:col-span-4">
          <label class="lbl">Stronghold / Domain Name</label>
          <input v-model="domain.strongholdName" @blur="saveDomain" class="inp text-lg font-bold" placeholder="e.g. Castle Black" />
        </div>
        
        <div>
          <div class="mb-1 flex items-center gap-1"><span class="lbl">Land Revenue (GP)</span>
            <HelpTooltip label="Land Revenue">
              Famílias × valor da terra. Serviços e impostos são receitas separadas; a moral não aplica um percentual genérico.
            </HelpTooltip>
          </div>
          <div class="inp bg-dark-bg/50 text-steel-light border-steel-dark font-bold cursor-not-allowed flex items-center">
            {{ calculatedLandRevenue.toFixed(1) }} GP
          </div>
        </div>

        <div>
          <label class="lbl">Peasant Families</label>
          <input v-model.number="domain.peasantFamilies" @blur="saveDomain" type="number" class="inp" placeholder="e.g. 1000" />
        </div>

        <div>
          <label class="lbl">Terra por família (normal: 3–9 GP)</label>
          <input v-model.number="domain.revenuePerFamily" @blur="saveDomain" type="number" step="0.1" class="inp" placeholder="e.g. 3.0" />
        </div>

        <div>
          <label class="lbl">Imposto por família (GP)</label>
          <input v-model.number="domain.taxPerFamily" @blur="saveDomain" type="number" min="0" step="0.1" class="inp" />
        </div>
        <div><label class="lbl">Serviços por família (GP)</label><input v-model.number="domain.servicePerFamily" @blur="saveDomain" type="number" min="0" step="0.1" class="inp" /></div>
        <div><label class="lbl">Liturgias por mês (GP)</label><input v-model.number="domain.liturgiesCost" @blur="saveDomain" type="number" min="0" class="inp" /></div>
        <div><label class="lbl">Dízimo por mês (GP)</label><input v-model.number="domain.titheCost" @blur="saveDomain" type="number" min="0" class="inp" /></div>
        <div class="col-span-full text-sm text-steel-light">
          Terra: {{ calculatedLandRevenue }} GP · Serviços: {{ servicesRevenue }} GP · Impostos: {{ taxRevenue }} GP.
          O saldo é valor econômico; terra e serviços não são automaticamente dinheiro em caixa.
          <button type="button" @click="applyNormalExpenses" class="block text-gold underline mt-2">Preencher despesas normais por família (guarnição 2, liturgias 1, manutenção 1 e dízimo 1 GP)</button>
        </div>
        
        <div>
          <label class="lbl text-red-300">Garrison Cost (GP)</label>
          <input v-model.number="domain.garrisonCost" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label class="lbl">Civil Expenses (GP)</label>
          <input v-model.number="domain.civilExpenses" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label class="lbl">Construction Costs (GP)</label>
          <input v-model.number="domain.constructionCosts" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label class="lbl">Mercenary Payroll (GP)</label>
          <input v-model.number="domain.mercenaryPayroll" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label class="lbl">Specialist Payroll (GP)</label>
          <input v-model.number="domain.specialistPayroll" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <div class="mb-1 flex items-center gap-1"><label for="domain-maintenance" class="lbl">Maintenance Cost (GP)</label>
          <HelpTooltip label="Maintenance Cost">
            Custos fixos mensais de fortaleza, oficinas, infraestrutura e pessoal administrativo.
          </HelpTooltip>
          </div>
          <input id="domain-maintenance" v-model.number="domain.maintenanceCost" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>
        
        <div class="bg-dark-bg/30 p-2 rounded border border-steel-dark flex flex-col justify-center">
          <label class="lbl text-green-300 text-center">Net Profit / Month</label>
          <div class="text-lg font-bold text-center" :class="netProfit >= 0 ? 'text-green-400' : 'text-red-400'">
            {{ netProfit >= 0 ? '+' : '' }}{{ netProfit }} GP
          </div>
        </div>

        <div>
          <div class="mb-1 flex items-center gap-1"><label for="domain-morale" class="lbl">Peasant Morale</label>
            <HelpTooltip label="Peasant Morale">
              Modificador de reações e crises no domínio. Afetado por impostos.
            </HelpTooltip>
          </div>
          <input id="domain-morale" v-model.number="domain.peasantMorale" @blur="saveDomain" type="number" class="inp" />
        </div>

        <div>
          <label class="lbl">Stability</label>
          <input v-model.number="domain.stability" @blur="saveDomain" type="number" class="inp" />
        </div>

        <div>
          <label class="lbl">Loyalty</label>
          <input v-model.number="domain.loyalty" @blur="saveDomain" type="number" class="inp" />
        </div>

        <div>
          <label class="lbl">Monthly Event</label>
          <input v-model="domain.monthlyEvent" @blur="saveDomain" class="inp" placeholder="Harvest fair, unrest, taxes..." />
        </div>

        <div>
          <label class="lbl">Event Modifier (GP)</label>
          <input v-model.number="domain.eventModifier" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label class="lbl">Treasury (GP)</label>
          <input v-model.number="domain.treasury" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label class="lbl">Consolidated Balance (GP)</label>
          <input v-model.number="domain.consolidatedBalance" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div class="md:col-span-2 lg:col-span-4">
          <label class="lbl">Mercantile Ventures & Routes</label>
          <textarea v-model="domain.mercantileVentures" @blur="saveDomain" class="inp resize-y h-24" placeholder="Rotas de caravanas, navios, lucro mercante mensais..."></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'DomainTab' }
</script>
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import api from '../../services/api'
import HelpTooltip from '../HelpTooltip.vue'
import { notifyError } from '../../utils/toast'
import { errorMessage } from '../../utils/catalog'

const props = defineProps<{
  character: any
}>()

const emit = defineEmits(['save'])

const domain = ref<any>({
  strongholdName: '',
  peasantFamilies: 0,
  revenuePerFamily: 3.0,
  taxRate: 20.0,
  taxPerFamily: 2,
  servicePerFamily: 4,
  liturgiesCost: 0,
  titheCost: 0,
  landRevenue: 0,
  garrisonCost: 0,
  civilExpenses: 0,
  constructionCosts: 0,
  mercenaryPayroll: 0,
  specialistPayroll: 0,
  maintenanceCost: 0,
  peasantMorale: 0,
  stability: 0,
  loyalty: 0,
  monthlyEvent: '',
  eventModifier: 0,
  treasury: 0,
  consolidatedBalance: 0,
  mercantileVentures: ''
})

watch(() => props.character, (newChar) => {
  if (newChar && newChar.domain) {
    domain.value = { taxPerFamily: 2, servicePerFamily: 4, liturgiesCost: 0, titheCost: 0, ...newChar.domain }
  }
}, { immediate: true })

const calculatedLandRevenue = computed(() => {
  return Number(domain.value.peasantFamilies ?? 0) * Number(domain.value.revenuePerFamily ?? 3)
})
const servicesRevenue = computed(() => Number(domain.value.peasantFamilies ?? 0) * Number(domain.value.servicePerFamily ?? 4))
const taxRevenue = computed(() => Number(domain.value.peasantFamilies ?? 0) * Number(domain.value.taxPerFamily ?? 2))
function applyNormalExpenses() {
  const families = Number(domain.value.peasantFamilies ?? 0)
  Object.assign(domain.value, { garrisonCost: families * 2, liturgiesCost: families, maintenanceCost: families, titheCost: families })
  void saveDomain()
}

const netProfit = computed(() => {
  return calculatedLandRevenue.value
    + servicesRevenue.value + taxRevenue.value
    - Number(domain.value.liturgiesCost ?? 0) - Number(domain.value.titheCost ?? 0)
    + (domain.value.eventModifier || 0)
    - (domain.value.garrisonCost || 0)
    - (domain.value.civilExpenses || 0)
    - (domain.value.constructionCosts || 0)
    - (domain.value.mercenaryPayroll || 0)
    - (domain.value.specialistPayroll || 0)
    - (domain.value.maintenanceCost || 0)
})

async function saveDomain() {
  domain.value.landRevenue = calculatedLandRevenue.value // Save the calculated value to DB for legacy/API
  try {
    const res = await api.put(`/api/characters/${props.character.id}/domain`, domain.value)
    props.character.domain = res.data.domain
  } catch(e) {
    notifyError(errorMessage(e, 'Não foi possível salvar o domínio. Tente novamente.'))
  }
}

async function addHenchman() {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/henchmen`, {})
    if(!props.character.henchmen) props.character.henchmen = []
    props.character.henchmen.push(res.data.henchman)
  } catch(e) {
    notifyError(errorMessage(e, 'Não foi possível adicionar o seguidor.'))
  }
}

async function saveHenchman(h: any) {
  try {
    await api.put(`/api/characters/${props.character.id}/henchmen/${h.id}`, h)
  } catch(e) {
    notifyError(errorMessage(e, 'Não foi possível salvar o seguidor. Tente novamente.'))
  }
}

async function removeHenchman(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/henchmen/${id}`)
    props.character.henchmen = props.character.henchmen.filter((h: any) => h.id !== id)
  } catch(e) {
    notifyError(errorMessage(e, 'Não foi possível remover o seguidor.'))
  }
}

async function addArmyUnit() {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/armyUnits`, {})
    if(!props.character.armyUnits) props.character.armyUnits = []
    props.character.armyUnits.push(res.data.unit)
  } catch(e) {
    notifyError(errorMessage(e, 'Não foi possível adicionar a unidade militar.'))
  }
}

async function saveArmyUnit(u: any) {
  try {
    await api.put(`/api/characters/${props.character.id}/armyUnits/${u.id}`, u)
  } catch(e) {
    notifyError(errorMessage(e, 'Não foi possível salvar a unidade militar. Tente novamente.'))
  }
}

async function removeArmyUnit(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/armyUnits/${id}`)
    props.character.armyUnits = props.character.armyUnits.filter((u: any) => u.id !== id)
  } catch(e) {
    notifyError(errorMessage(e, 'Não foi possível remover a unidade militar.'))
  }
}

</script>







