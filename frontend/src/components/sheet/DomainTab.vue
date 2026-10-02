<template>
  <div class="space-y-4">
    <!-- ====== HENCHMEN (Capangas e Mercenários) ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-gold">Seguidores e auxiliares</h3>
        <button @click="addHenchman" class="text-sm text-gold hover:text-gold-light transition-colors">+ Adicionar seguidor</button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-steel-light border-b border-steel-dark text-left">
              <th class="py-2 px-2">Nome / classe</th>
              <th class="py-2 px-1 text-center w-12">Nível</th>
              <th class="py-2 px-1 text-center w-16">Moral</th>
              <th class="py-2 px-1 text-center w-16">Lealdade</th>
              <th class="py-2 px-1 text-center w-24">Tipo / capacidade</th>
              <th class="py-2 px-1 text-center w-24">Salário mensal</th>
              <th class="py-2 px-1 text-center w-20">Cota de tesouro</th>
              <th class="py-2 px-2">Notas</th>
              <th class="py-2 px-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in character.henchmen" :key="h.id" class="border-b border-steel-dark/30">
              <td class="py-1 px-2">
                <input :aria-label="`Nome de ${h.name || 'seguidor'}`" v-model="h.name" @blur="saveHenchman(h)" class="inp-table w-full font-bold" placeholder="Name" />
                <input :aria-label="`Classe de ${h.name || 'seguidor'}`" v-model="h.className" @blur="saveHenchman(h)" class="inp-table w-full text-xs text-steel-light" placeholder="Class" />
              </td>
              <td class="py-1 px-1"><input :aria-label="`Nível de ${h.name || 'seguidor'}`" v-model.number="h.level" @blur="saveHenchman(h)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input :aria-label="`Moral de ${h.name || 'seguidor'}`" v-model.number="h.morale" @blur="saveHenchman(h)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input :aria-label="`Lealdade de ${h.name || 'seguidor'}`" v-model.number="h.loyalty" @blur="saveHenchman(h)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1">
                <select :aria-label="`Tipo de ${h.name || 'seguidor'}`" v-model="h.roleType" @blur="saveHenchman(h)" class="inp-table w-full text-xs">
                  <option value="retainer">Seguidor</option>
                  <option value="mercenary">Mercenário</option>
                  <option value="specialist">Especialista</option>
                  <option value="entourage">Comitiva</option>
                </select>
                <input :aria-label="`Capacidade de ${h.name || 'seguidor'}`" v-model.number="h.capacity" @blur="saveHenchman(h)" type="number" class="inp-table w-full text-xs mt-1" placeholder="Capacity" />
              </td>
              <td class="py-1 px-1"><input :aria-label="`Salário mensal de ${h.name || 'seguidor'}`" v-model.number="h.wage" @blur="saveHenchman(h)" type="number" class="inp-table text-center w-full" placeholder="GP" /></td>
              <td class="py-1 px-1"><input :aria-label="`Cota de tesouro de ${h.name || 'seguidor'}`" v-model.number="h.treasureShare" @blur="saveHenchman(h)" type="number" step="0.1" class="inp-table text-center w-full" placeholder="%" /></td>
              <td class="py-1 px-2"><textarea :aria-label="`Notas de ${h.name || 'seguidor'}`" v-model="h.notes" @blur="saveHenchman(h)" class="inp-table w-full resize-y h-10" placeholder="Gear, location..."></textarea></td>
              <td class="py-1 px-1">
                <button type="button" @click="removeHenchman(h.id)" :aria-label="`Remover seguidor ${h.name || 'sem nome'}`" class="text-crimson-light hover:text-crimson text-xs font-bold">X</button>
              </td>
            </tr>
            <tr v-if="!character.henchmen || character.henchmen.length === 0">
              <td colspan="9" class="text-center text-steel-light py-4 text-xs">Nenhum seguidor registrado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====== ARMY UNITS (Tropas & Batalhas) ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold text-gold">Tropas e combate em massa</h3>
        <button @click="addArmyUnit" class="text-sm text-gold hover:text-gold-light transition-colors">+ Adicionar tropa</button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-steel-light border-b border-steel-dark text-left">
              <th class="py-2 px-2">Nome / tipo de tropa</th>
              <th class="py-2 px-1 text-center w-12">CA</th>
              <th class="py-2 px-1 text-center w-16">Dano</th>
              <th class="py-2 px-1 text-center w-16">Movimento</th>
              <th class="py-2 px-1 text-center w-12">PV</th>
              <th class="py-2 px-1 text-center w-16">Moral</th>
              <th class="py-2 px-1 text-center w-20">Custo mensal</th>
              <th class="py-2 px-2">Equipamento / notas</th>
              <th class="py-2 px-1"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in character.armyUnits" :key="u.id" class="border-b border-steel-dark/30">
              <td class="py-1 px-2">
                <input :aria-label="`Nome de ${u.name || 'tropa'}`" v-model="u.name" @blur="saveArmyUnit(u)" class="inp-table w-full font-bold" placeholder="Unit Name" />
                <input :aria-label="`Tipo de tropa de ${u.name || 'tropa'}`" v-model="u.troopType" @blur="saveArmyUnit(u)" class="inp-table w-full text-xs text-steel-light" placeholder="e.g. Light Infantry" />
              </td>
              <td class="py-1 px-1"><input :aria-label="`CA de ${u.name || 'tropa'}`" v-model.number="u.ac" @blur="saveArmyUnit(u)" type="number" class="inp-table text-center w-full text-gold font-bold" /></td>
              <td class="py-1 px-1"><input :aria-label="`Dano de ${u.name || 'tropa'}`" v-model="u.damage" @blur="saveArmyUnit(u)" class="inp-table text-center w-full" placeholder="1d6" /></td>
              <td class="py-1 px-1"><input :aria-label="`Movimento de ${u.name || 'tropa'}`" v-model.number="u.movement" @blur="saveArmyUnit(u)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input :aria-label="`PV de ${u.name || 'tropa'}`" v-model.number="u.hp" @blur="saveArmyUnit(u)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input :aria-label="`Moral de ${u.name || 'tropa'}`" v-model.number="u.morale" @blur="saveArmyUnit(u)" type="number" class="inp-table text-center w-full" /></td>
              <td class="py-1 px-1"><input :aria-label="`Custo mensal de ${u.name || 'tropa'}`" v-model.number="u.monthlyCostGp" @blur="saveArmyUnit(u)" type="number" step="0.1" class="inp-table text-center w-full" placeholder="GP" /></td>
              <td class="py-1 px-2">
                <input :aria-label="`Equipamento de ${u.name || 'tropa'}`" v-model="u.equipment" @blur="saveArmyUnit(u)" class="inp-table w-full text-xs mb-1" placeholder="Equipment..." />
                <textarea :aria-label="`Notas de ${u.name || 'tropa'}`" v-model="u.notes" @blur="saveArmyUnit(u)" class="inp-table w-full resize-y h-6 text-xs" placeholder="Notes..."></textarea>
              </td>
              <td class="py-1 px-1 text-center">
                <button type="button" @click="removeArmyUnit(u.id)" :aria-label="`Remover tropa ${u.name || 'sem nome'}`" class="text-crimson-light hover:text-crimson text-xs font-bold">X</button>
              </td>
            </tr>
            <tr v-if="!character.armyUnits || character.armyUnits.length === 0">
              <td colspan="9" class="text-center text-steel-light py-4 text-xs">Nenhuma tropa registrada.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====== DOMAIN MANAGEMENT ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3 border-b border-steel-dark pb-3">
        <h3 class="text-lg font-bold text-gold">Domínio e fortaleza</h3>
        <button @click="saveDomain" class="text-xs bg-gold/10 text-gold px-3 py-1 rounded hover:bg-gold/20 transition-all">Salvar domínio</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="md:col-span-2 lg:col-span-4">
          <label for="domain-strongholdName" class="lbl">Nome da fortaleza / domínio</label>
          <input id="domain-strongholdName" v-model="domain.strongholdName" @blur="saveDomain" class="inp text-lg font-bold" placeholder="e.g. Castle Black" />
        </div>
        
        <div>
          <div class="mb-1 flex items-center gap-1"><span class="lbl">Receita de terras (GP)</span>
            <HelpTooltip label="Receita de terras">
              Famílias × valor da terra. Serviços e impostos são receitas separadas. O saldo estimado aplica a redução de renda da moral atual, como a prévia do fechamento mensal.
            </HelpTooltip>
          </div>
          <div class="inp bg-dark-bg/50 text-steel-light border-steel-dark font-bold cursor-not-allowed flex items-center">
            {{ calculatedLandRevenue.toFixed(1) }} GP
          </div>
        </div>

        <div>
          <label for="domain-peasantFamilies" class="lbl">Famílias camponesas</label>
          <input id="domain-peasantFamilies" v-model.number="domain.peasantFamilies" @blur="saveDomain" type="number" class="inp" placeholder="e.g. 1000" />
        </div>

        <div>
          <label for="domain-revenuePerFamily" class="lbl">Terra por família (normal: 3–9 GP)</label>
          <input id="domain-revenuePerFamily" v-model.number="domain.revenuePerFamily" @blur="saveDomain" type="number" step="0.1" class="inp" placeholder="e.g. 3.0" />
        </div>

        <div>
          <label for="domain-taxPerFamily" class="lbl">Imposto por família (GP)</label>
          <input id="domain-taxPerFamily" v-model.number="domain.taxPerFamily" @blur="saveDomain" type="number" min="0" step="0.1" class="inp" />
        </div>
        <div><label for="domain-servicePerFamily" class="lbl">Serviços por família (GP)</label>
          <input id="domain-servicePerFamily" v-model.number="domain.servicePerFamily" @blur="saveDomain" type="number" min="0" step="0.1" class="inp" /></div>
        <div><label for="domain-liturgiesCost" class="lbl">Liturgias por mês (GP)</label>
          <input id="domain-liturgiesCost" v-model.number="domain.liturgiesCost" @blur="saveDomain" type="number" min="0" class="inp" /></div>
        <div><label for="domain-titheCost" class="lbl">Dízimo por mês (GP)</label>
          <input id="domain-titheCost" v-model.number="domain.titheCost" @blur="saveDomain" type="number" min="0" class="inp" /></div>
        <div class="col-span-full text-sm text-steel-light">
          Terra: {{ calculatedLandRevenue }} GP · Serviços: {{ servicesRevenue }} GP · Impostos: {{ taxRevenue }} GP.
          O saldo é valor econômico; terra e serviços não são automaticamente dinheiro em caixa.
          <button type="button" @click="applyNormalExpenses" class="block text-gold underline mt-2">Preencher despesas normais por família (guarnição 2, liturgias 1, manutenção 1 e dízimo 1 GP)</button>
        </div>
        
        <div>
          <label for="domain-garrisonCost" class="lbl text-red-300">Guarnição (GP)</label>
          <input id="domain-garrisonCost" v-model.number="domain.garrisonCost" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label for="domain-civilExpenses" class="lbl">Despesas civis (GP)</label>
          <input id="domain-civilExpenses" v-model.number="domain.civilExpenses" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label for="domain-constructionCosts" class="lbl">Construções (GP)</label>
          <input id="domain-constructionCosts" v-model.number="domain.constructionCosts" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label for="domain-mercenaryPayroll" class="lbl">Salários de mercenários (GP)</label>
          <input id="domain-mercenaryPayroll" v-model.number="domain.mercenaryPayroll" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label for="domain-specialistPayroll" class="lbl">Salários de especialistas (GP)</label>
          <input id="domain-specialistPayroll" v-model.number="domain.specialistPayroll" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <div class="mb-1 flex items-center gap-1"><label for="domain-maintenance" class="lbl">Manutenção (GP)</label>
          <HelpTooltip label="Manutenção">
            Custos fixos mensais de fortaleza, oficinas, infraestrutura e pessoal administrativo.
          </HelpTooltip>
          </div>
          <input id="domain-maintenance" v-model.number="domain.maintenanceCost" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>
        
        <div class="bg-dark-bg/30 p-2 rounded border border-steel-dark flex flex-col justify-center">
          <span class="lbl text-center">Saldo mensal estimado</span>
          <div class="text-lg font-bold text-center" :class="netProfit >= 0 ? 'text-green-400' : 'text-red-400'">
            {{ netProfit >= 0 ? '+' : '' }}{{ netProfit }} GP
          </div>
          <p class="text-xs text-steel-light mt-1 text-center">Inclui a moral atual; tributo e ajustes do fechamento ainda não incluídos.</p>
        </div>

        <div>
          <div class="mb-1 flex items-center gap-1"><label for="domain-morale" class="lbl">Moral das famílias</label>
            <HelpTooltip label="Moral das famílias">
              Modificador de reações e crises no domínio. Afetado por impostos.
            </HelpTooltip>
          </div>
          <input id="domain-morale" v-model.number="domain.peasantMorale" @blur="saveDomain" type="number" class="inp" />
        </div>

        <div>
          <label for="domain-stability" class="lbl">Estabilidade</label>
          <input id="domain-stability" v-model.number="domain.stability" @blur="saveDomain" type="number" class="inp" />
        </div>

        <div>
          <label for="domain-loyalty" class="lbl">Lealdade</label>
          <input id="domain-loyalty" v-model.number="domain.loyalty" @blur="saveDomain" type="number" class="inp" />
        </div>

        <div>
          <label for="domain-monthlyEvent" class="lbl">Evento mensal</label>
          <input id="domain-monthlyEvent" v-model="domain.monthlyEvent" @blur="saveDomain" class="inp" placeholder="Harvest fair, unrest, taxes..." />
        </div>

        <div>
          <label for="domain-eventModifier" class="lbl">Ajuste do evento (GP)</label>
          <input id="domain-eventModifier" v-model.number="domain.eventModifier" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label for="domain-treasury" class="lbl">Tesouro do domínio (GP)</label>
          <input id="domain-treasury" v-model.number="domain.treasury" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div>
          <label for="domain-consolidatedBalance" class="lbl">Saldo consolidado (GP)</label>
          <input id="domain-consolidatedBalance" v-model.number="domain.consolidatedBalance" @blur="saveDomain" type="number" step="0.1" class="inp" />
        </div>

        <div class="md:col-span-2 lg:col-span-4">
          <label for="domain-mercantileVentures" class="lbl">Comércio e rotas</label>
          <textarea id="domain-mercantileVentures" v-model="domain.mercantileVentures" @blur="saveDomain" class="inp resize-y h-24" placeholder="Rotas de caravanas, navios, lucro mercante mensais..."></textarea>
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
import { useCharacterRelations } from '../../composables/characterRelations'
import { mergeUnchangedDraft } from '../../composables/characterOperations'
import HelpTooltip from '../HelpTooltip.vue'
import incomeFactors from '../../../../backend/src/data/domainIncomeFactors.json'

const props = defineProps<{
  character: any
}>()

const emit = defineEmits(['save'])
const relations = useCharacterRelations(() => props.character)

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
  const morale = Math.max(-4, Math.min(4, Number(domain.value.peasantMorale) || 0))
  const factor = (incomeFactors as Record<string, number>)[String(morale)] ?? 1
  return (calculatedLandRevenue.value + servicesRevenue.value + taxRevenue.value) * factor
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
  domain.value.landRevenue = calculatedLandRevenue.value
  const { id, characterId, createdAt, updatedAt, ...editable } = domain.value
  const sent = JSON.parse(JSON.stringify(editable))
  // Keep the local domain draft in the sheet too, including after changing tabs.
  props.character.domain = { ...domain.value }
  await relations.run('domain:update', (version) => api.put(`/api/characters/${props.character.id}/domain`, { ...sent, version }), (data) => {
    mergeUnchangedDraft(domain.value, sent, data.domain)
    mergeUnchangedDraft(props.character.domain, sent, data.domain)
  }, { retainDraft: true })
}

async function addHenchman() {
  await relations.add('henchmen', 'henchmen', 'henchman')
}

async function saveHenchman(h: any) {
  await relations.update('henchmen', h, {
    name: h.name, className: h.className, subclass: h.subclass, roleType: h.roleType,
    level: h.level, morale: h.morale, loyalty: h.loyalty, wage: h.wage,
    capacity: h.capacity, explorationImpact: h.explorationImpact, warImpact: h.warImpact,
    domainImpact: h.domainImpact, treasureShare: h.treasureShare, notes: h.notes,
  }, 'henchman')
}

async function removeHenchman(id: string) {
  await relations.remove('henchmen', 'henchmen', id)
}

async function addArmyUnit() {
  await relations.add('armyUnits', 'armyUnits', 'unit')
}

async function saveArmyUnit(u: any) {
  await relations.update('armyUnits', u, {
    name: u.name, troopType: u.troopType, ac: u.ac, damage: u.damage,
    movement: u.movement, morale: u.morale, hp: u.hp,
    monthlyCostGp: u.monthlyCostGp, equipment: u.equipment, notes: u.notes,
  }, 'unit')
}

async function removeArmyUnit(id: string) {
  await relations.remove('armyUnits', 'armyUnits', id)
}

</script>







