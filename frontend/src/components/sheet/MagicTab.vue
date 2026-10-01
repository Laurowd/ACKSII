<template>
  <div class="space-y-4">
    <!-- ====== MAGIC SHEET ====== -->
    <div class="bg-dark-card border border-gold/20 rounded-xl p-5 mb-4">
      <h2 class="text-xl font-bold text-gold mb-4 border-b border-gold/10 pb-2">Magic Sheet</h2>

      <!-- Spells per day + resources -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 class="text-lg font-bold text-gold mb-3">Usos diários — referência manual</h3>
          <p class="text-xs text-steel-light mb-2">A aba Evolução &amp; Regras calcula a progressão e acompanha os usos por tradição. Estes campos são anotações manuais.</p>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="lev in 6" :key="lev" class="text-center">
              <label class="lbl">Nível {{ lev }}</label>
              <input v-model.number="character['spellSlotsLevel' + lev]" @change="emit('save')" type="number" min="0"
                class="inp text-center font-bold w-full" />
            </div>
          </div>
        </div>
        <div>
          <h3 class="text-lg font-bold text-gold mb-3">Recursos de magia</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="mb-1 flex items-center gap-1"><label for="magic-library" class="lbl">Library Value</label>
                <HelpTooltip label="Library Value">
                  Valor total da biblioteca arcana disponível para aprendizado e pesquisa de magia.
                </HelpTooltip>
              </div>
              <input id="magic-library" v-model.number="character.libraryValue" @change="emit('save')" type="number" min="0" class="inp" />
            </div>
            <div>
              <div class="mb-1 flex items-center gap-1"><label for="magic-workshop" class="lbl">Workshop Value</label>
                <HelpTooltip label="Workshop Value">
                  Estrutura material/laboratório para criação e desenvolvimento de fórmulas e itens mágicos.
                </HelpTooltip>
              </div>
              <input id="magic-workshop" v-model.number="character.workshopValue" @change="emit('save')" type="number" min="0" class="inp" />
            </div>
            <div>
              <div class="mb-1 flex items-center gap-1"><label for="magic-congregants" class="lbl">Congregants</label>
                <HelpTooltip label="Congregants">
                  Seguidores, aprendizes e assistentes ligados ao seu círculo mágico/templo.
                </HelpTooltip>
              </div>
              <input id="magic-congregants" v-model.number="character.congregants" @change="emit('save')" type="number" min="0" class="inp" />
            </div>
            <div class="col-span-2">
              <label class="lbl">Magic Research</label>
              <input v-model="character.magicResearch" @change="emit('save')" class="inp" placeholder="Pesquisa em andamento..." />
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="lbl">Grimório (um por linha)</label>
          <textarea :value="spellbookText" @change="onSpellbookChange($event)" rows="6" class="inp w-full" placeholder="Magic Missile&#10;Sleep"></textarea>
        </div>
        <div>
          <label class="lbl">Magias Aprendidas (um por linha)</label>
          <textarea :value="learnedSpellsText" @change="onLearnedSpellsChange($event)" rows="6" class="inp w-full" placeholder="Charm Person&#10;Shield"></textarea>
        </div>
        <div>
          <label class="lbl">Fila de Pesquisa (um por linha)</label>
          <textarea :value="researchQueueText" @change="onResearchQueueChange($event)" rows="4" class="inp w-full" placeholder="New spell: Warding Fire"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="lbl">Tempo de Pesquisa (semanas)</label>
            <input v-model.number="character.researchTimeWeeks" @change="emit('save')" type="number" min="0" class="inp" />
          </div>
          <div>
            <label class="lbl">Custo de Pesquisa (GP)</label>
            <input v-model.number="character.researchCostGp" @change="emit('save')" type="number" min="0" class="inp" />
          </div>
        </div>
      </div>

      <div v-if="isRuleEnabled('enableMagicResearchValidation')" class="text-xs rounded border px-3 py-2" :class="researchValidation.ok ? 'border-green-700/40 text-green-400 bg-green-900/10' : 'border-red-700/40 text-red-400 bg-red-900/10'">
        {{ researchValidation.message }}
      </div>

      <!-- Spells by level (1–6) -->
      <h3 class="text-lg font-bold text-gold mb-3">Spells</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div v-for="lev in 6" :key="lev" class="bg-dark-bg/30 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-gold">Level {{ lev }}</span>
            <button type="button" @click="addSpell(lev)" :aria-label="`Adicionar magia de nível ${lev}`" class="text-gold hover:text-gold-light text-sm">+</button>
          </div>
          <div v-for="s in getSpellsByLevel(lev)" :key="s.id" class="flex items-center gap-1 mb-1 relative">
            <input v-model="s.name" @change="saveSpellName(s)" class="inp-table min-w-0 flex-1 text-sm" placeholder="Nome da magia" :aria-label="`Magia de nível ${lev}`" :list="'acks-spell-compendium-' + lev" />
            <HelpTooltip v-if="getSpellTooltip(s.name)" :label="s.name">{{ getSpellTooltip(s.name) }}</HelpTooltip>
            <button type="button" @click="removeSpell(s.id)" :aria-label="`Remover magia ${s.name || 'sem nome'}`" class="text-crimson-light hover:text-crimson text-xs font-bold pl-1">X</button>
          </div>
        </div>
      </div>

      <!-- Rituals known -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-gold">Rituals known</h3>
          <button type="button" @click="addRitual" class="text-sm text-gold hover:text-gold-light">+ Adicionar</button>
        </div>
        <div v-for="r in (character.rituals || [])" :key="r.id" class="flex items-center gap-2 mb-1.5 bg-dark-bg/30 rounded-lg px-3 py-1.5">
          <input v-model="r.name" @blur="saveRitualName(r)" class="inp-table flex-1" placeholder="Ritual" />
          <button type="button" @click="removeRitual(r.id)" class="text-crimson-light hover:text-crimson text-xs font-bold">X</button>
        </div>
      </div>

      <!-- Magic formulae known -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-gold">Magic formulae known</h3>
          <button type="button" @click="addMagicFormula" class="text-sm text-gold hover:text-gold-light">+ Adicionar</button>
        </div>
        <div v-for="f in (character.magicFormulae || [])" :key="f.id" class="flex items-center gap-2 mb-1.5 bg-dark-bg/30 rounded-lg px-3 py-1.5">
          <input v-model="f.name" @blur="saveMagicFormulaName(f)" class="inp-table flex-1" placeholder="Fórmula" />
          <button type="button" @click="removeMagicFormula(f.id)" class="text-crimson-light hover:text-crimson text-xs font-bold">X</button>
        </div>
      </div>

      <!-- ====== MAGICAL LABORATORY (ITEM CREATION) ====== -->
      <div class="mt-8 pt-6 border-t border-gold/20">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gold">Magical Laboratory (Item Creation)</h3>
          <button type="button" @click="addMagicResearch" class="text-sm bg-gold/10 text-gold px-3 py-1 rounded hover:bg-gold/20 transition-all">+ Add New Project</button>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead>
              <tr class="text-steel-light border-b border-gold/20">
                <th class="py-2 px-2">Item Name</th>
                <th class="py-2 px-2 text-center w-24">Type</th>
                <th class="py-2 px-2 text-center w-20">Spell Lvl</th>
                <th class="py-2 px-2 text-center w-28">Cost / Time</th>
                <th class="py-2 px-2 text-center w-28">Status</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="res in character.magicItemResearch" :key="res.id" class="border-b border-steel-dark/30">
                <td class="py-2 px-2">
                  <input v-model="res.itemName" @blur="saveMagicResearch(res)" class="inp-table w-full font-bold text-gold-light" placeholder="e.g. Sword +1" :disabled="isTrackedResearch(res.id)" />
                  <p v-if="isTrackedResearch(res.id)" class="text-xs text-gold mt-2">Projeto acompanhado: gerencie em Evolução &amp; Regras.</p>
                  <div class="text-xs space-y-1 mt-2">
                    <label class="block">Nível de conjurador <input v-model.number="res.casterLevel" @change="saveMagicResearch(res)" type="number" min="1" max="14" class="inp-table w-14" :disabled="isTrackedResearch(res.id)" /></label>
                    <label class="block">Trabalho (GP/dia) <input v-model.number="res.researchRateGp" @change="saveMagicResearch(res)" type="number" min="0.1" step="any" class="inp-table w-20" :disabled="isTrackedResearch(res.id)" /></label>
                    <label class="block"><input v-model="res.hasFormula" @change="saveMagicResearch(res)" type="checkbox" :disabled="isTrackedResearch(res.id)" /> Fórmula</label>
                    <label class="block"><input v-model="res.hasSample" @change="saveMagicResearch(res)" type="checkbox" :disabled="isTrackedResearch(res.id)" /> Amostra (+4 no teste)</label>
                    <label class="block"><input v-model="res.knowsEffect" @change="saveMagicResearch(res)" type="checkbox" :disabled="isTrackedResearch(res.id)" /> Efeito no repertório</label>
                    <label v-if="['CHARGED','BONUS'].includes(res.effectType)" class="block">{{ res.effectType === 'BONUS' ? 'Bônus (+1 a +3)' : 'Cargas' }}<input v-model.number="res.effectCount" @change="saveMagicResearch(res)" type="number" min="1" :max="res.effectType === 'BONUS' ? 3 : 1000" class="inp-table w-16" :disabled="isTrackedResearch(res.id)" /></label>
                  </div>
                </td>
                <td class="py-2 px-2 text-center">
                  <select v-model="res.effectType" @change="saveMagicResearch(res)" class="inp-table w-full text-xs" :disabled="isTrackedResearch(res.id) || res.status !== 'QUEUED'">
                    <option v-for="effect in effectTypes" :key="effect[0]" :value="effect[0]">{{ effect[1] }}</option>
                  </select>
                </td>
                <td class="py-2 px-2 text-center">
                  <input v-model.number="res.spellLevel" @change="saveMagicResearch(res)" type="number" min="1" max="6" class="inp-table text-center w-16" :disabled="isTrackedResearch(res.id) || res.status !== 'QUEUED'" />
                </td>
                <td class="py-2 px-2 text-center text-xs text-steel">
                  <div class="font-bold whitespace-nowrap">{{ res.totalCostGp.toLocaleString() }} GP</div>
                  <div>Componentes: {{ res.componentCostGp ?? 0 }}</div><div>Materiais: {{ res.materialCostGp ?? 0 }}</div><div>Trabalho: {{ res.researchCostGp ?? 0 }}</div>
                  <div>{{ res.remainingDays ?? res.weeksRequired * 7 }} dias restantes</div>
                </td>
                <td class="py-2 px-2 text-center">
                  <select v-model="res.status" @change="saveMagicResearch(res)" class="inp-table w-full text-xs" :class="res.status === 'COMPLETED' ? 'text-green-400' : 'text-gold'" :disabled="isTrackedResearch(res.id)">
                    <option value="QUEUED">Queued</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="READY">Aguardando resolução</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Falhou</option><option value="CANCELLED">Cancelado</option>
                  </select>
                </td>
                <td class="py-2 px-2 text-center">
                  <button type="button" @click="removeMagicResearch(res.id)" class="text-crimson-light hover:text-crimson text-xs font-bold w-6 h-6 rounded hover:bg-crimson/20" :disabled="isTrackedResearch(res.id)">X</button>
                </td>
              </tr>
              <tr v-if="!character.magicItemResearch || character.magicItemResearch.length === 0">
                <td colspan="6" class="text-center text-steel-light py-6 text-xs italic">Nenhum projeto de forja no laboratório.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 text-xs text-steel/70">
          Planejamento para um efeito: componentes, materiais e trabalho têm valores separados. O prazo depende do trabalho por dia. O calendário avança projetos em andamento; ao terminar, confira componentes e teste de pesquisa antes de marcar o resultado. Fórmula dispensa o teste em criação normal. Moedas e itens são registrados separadamente na ficha.
          Efeitos à vontade exigem concentração; efeitos permanentes exigem duração mínima de um turno e afetam o usuário. Limites por tipo de item, múltiplos efeitos, desvantagens e experimentação exigem conferência do mestre. Projetos antigos permanecem em modo manual.
        </div>
      </div>
      <!-- Datalists by level for autocomplete -->
      <datalist v-for="l in 6" :key="'dl-'+l" :id="'acks-spell-compendium-' + l">
        <option v-for="entry in compendiumSpells.filter(s => s.level === l)" :key="entry.id" :value="entry.name" :label="entry.name" />
      </datalist>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'MagicTab' }
</script>

<script setup lang="ts">
import api from '../../services/api'
import HelpTooltip from '../HelpTooltip.vue'
import { notifyError } from '../../utils/toast'
import { errorMessage } from '../../utils/catalog'
import { computed, ref, onMounted } from 'vue'

const props = defineProps<{
  character: any,
  optionalRules?: Record<string, boolean>
}>()

const emit = defineEmits(['save'])

function isRuleEnabled(key: string) {
  return props.optionalRules?.[key] !== false
}

const compendiumSpells = ref<any[]>([])
const effectTypes = [
  ['MANUAL', 'Manual / projeto antigo'], ['ONE_USE', 'Uso único'], ['CHARGED', 'Por cargas'],
  ['WEEKLY', '1/semana'], ['THREE_WEEKLY', '3/semana (máx. 1/dia)'], ['DAILY', '1/dia'], ['THREE_DAILY', '3/dia (máx. 1/hora)'],
  ['HOURLY', '1/hora'], ['THREE_TURNS', '1/3 turnos'], ['EACH_TURN', '1/turno'], ['AT_WILL', 'À vontade'],
  ['PERMANENT_DAY', 'Permanente: duração ≥ dia'], ['PERMANENT_HOUR', 'Permanente: duração ≥ hora'],
  ['PERMANENT_THREE_TURNS', 'Permanente: duração ≥ 3 turnos'], ['PERMANENT_TURN', 'Permanente: duração ≥ turno'],
  ['PERMANENT_CASTER_LEVEL', 'Permanente: duração por nível'], ['BONUS', 'Bônus de equipamento'],
]

onMounted(async () => {
  try {
    const res = await api.get('/api/compendium/search', { params: { type: 'spell', limit: 500 } })
    compendiumSpells.value = res.data.entries || []
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível carregar as sugestões de magias. Reabra a aba para tentar novamente.')) }
})

function getSpellTooltip(name: string) {
  const found = compendiumSpells.value.find((c: any) => c.name.toLowerCase() === String(name || '').trim().toLowerCase())
  return found ? found.notes : ''
}

const spellbookText = computed(() => {
  const list = Array.isArray(props.character?.spellbook) ? props.character.spellbook : []
  return list.join('\n')
})

const learnedSpellsText = computed(() => {
  const list = Array.isArray(props.character?.learnedSpells) ? props.character.learnedSpells : []
  return list.join('\n')
})

const researchQueueText = computed(() => {
  const list = Array.isArray(props.character?.researchQueue) ? props.character.researchQueue : []
  return list.join('\n')
})

const researchValidation = computed(() => {
  const workshop = Number(props.character?.workshopValue || 0)
  const library = Number(props.character?.libraryValue || 0)
  const cost = Number(props.character?.researchCostGp || 0)
  const time = Number(props.character?.researchTimeWeeks || 0)

  if (cost <= 0 || time <= 0) {
    return { ok: false, message: 'Defina custo e tempo de pesquisa para validação automática.' }
  }

  if (!props.character.isSpellcaster || Number(props.character.level) < 5) return { ok: false, message: 'A pesquisa normalmente exige conjurador de nível 5; itens além de poções e pergaminhos exigem nível 9. Exceções precisam ser conferidas pelo mestre.' }

  if (time < 1) {
    return { ok: false, message: 'Tempo de pesquisa deve ser de pelo menos 1 semana.' }
  }

  return { ok: true, message: `Registro de planejamento. Biblioteca: ${library} GP; oficina: ${workshop} GP. A elegibilidade depende do projeto. Para criar itens, use os parâmetros abaixo.` }
})

function linesToArray(input: string) {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function onSpellbookChange(event: Event) {
  const target = event.target as HTMLTextAreaElement
  props.character.spellbook = linesToArray(target.value)
  emit('save')
}

function onLearnedSpellsChange(event: Event) {
  const target = event.target as HTMLTextAreaElement
  props.character.learnedSpells = linesToArray(target.value)
  emit('save')
}

function onResearchQueueChange(event: Event) {
  const target = event.target as HTMLTextAreaElement
  props.character.researchQueue = linesToArray(target.value)
  emit('save')
}

function getSpellsByLevel(level: number) {
  return props.character?.spells?.filter((s: any) => s.level === level) || []
}

// Spells
async function addSpell(level: number) {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/spells`, { level, name: '' })
    if (!props.character.spells) props.character.spells = []
    props.character.spells.push(res.data.spell)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível adicionar a magia.')) }
}

async function removeSpell(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/spells/${id}`)
    props.character.spells = props.character.spells.filter((s: any) => s.id !== id)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível remover a magia.')) }
}

async function saveSpellName(s: any) {
  try {
    await api.put(`/api/characters/${props.character.id}/spells/${s.id}`, { name: s.name })
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível salvar a magia. Tente novamente.')) }
}

// Rituals
async function addRitual() {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/rituals`, { name: '' })
    if (!props.character.rituals) props.character.rituals = []
    props.character.rituals.push(res.data.ritual)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível adicionar o ritual.')) }
}

async function removeRitual(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/rituals/${id}`)
    props.character.rituals = props.character.rituals.filter((r: any) => r.id !== id)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível remover o ritual.')) }
}

async function saveRitualName(r: any) {
  try {
    await api.put(`/api/characters/${props.character.id}/rituals/${r.id}`, { name: r.name })
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível salvar o ritual. Tente novamente.')) }
}

// Magic formulae known
async function addMagicFormula() {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/magic-formulae`, { name: '' })
    if (!props.character.magicFormulae) props.character.magicFormulae = []
    props.character.magicFormulae.push(res.data.formula)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível adicionar a fórmula.')) }
}

async function removeMagicFormula(id: string) {
  try {
    await api.delete(`/api/characters/${props.character.id}/magic-formulae/${id}`)
    props.character.magicFormulae = props.character.magicFormulae.filter((f: any) => f.id !== id)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível remover a fórmula.')) }
}

async function saveMagicFormulaName(f: any) {
  try {
    await api.put(`/api/characters/${props.character.id}/magic-formulae/${f.id}`, { name: f.name })
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível salvar a fórmula. Tente novamente.')) }
}

// ==== MAGICAL RESEARCH (ITEM CREATION) ====
const trackedResearch = computed(() => {
  try { return JSON.parse(props.character.rulesState || '{}').research || {} }
  catch { return null }
})
function isTrackedResearch(id: string) {
  return trackedResearch.value === null || Boolean(trackedResearch.value[id])
}
async function addMagicResearch() {
  try {
    const res = await api.post(`/api/characters/${props.character.id}/magic-research`, {
      itemName: 'Novo item',
      spellLevel: 1,
      effectType: 'ONE_USE',
      status: 'QUEUED'
    })
    if (!props.character.magicItemResearch) props.character.magicItemResearch = []
    props.character.magicItemResearch.push(res.data.research)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível criar a pesquisa.')) }
}

async function removeMagicResearch(id: string) {
  if (isTrackedResearch(id)) return
  try {
    await api.delete(`/api/characters/${props.character.id}/magic-research/${id}`)
    props.character.magicItemResearch = props.character.magicItemResearch.filter((r: any) => r.id !== id)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível remover a pesquisa.')) }
}

async function saveMagicResearch(res: any) {
  if (isTrackedResearch(res.id)) { notifyError('Projeto acompanhado: use Evolução & Regras para trabalho, resolução ou cancelamento.'); return }
  try {
    const saved = await api.put(`/api/characters/${props.character.id}/magic-research/${res.id}`, {
      itemName: res.itemName,
      spellLevel: res.spellLevel,
      totalCostGp: res.totalCostGp,
      weeksRequired: res.weeksRequired,
      isPermanent: res.isPermanent,
      effectType: res.effectType, effectCount: res.effectCount, casterLevel: res.casterLevel,
      researchRateGp: res.researchRateGp, hasFormula: res.hasFormula, hasSample: res.hasSample, knowsEffect: res.knowsEffect,
      status: res.status
    })
    Object.assign(res, saved.data.research)
  } catch (e) { notifyError(errorMessage(e, 'Não foi possível salvar a pesquisa. Revise os campos.')) }
}
</script>
