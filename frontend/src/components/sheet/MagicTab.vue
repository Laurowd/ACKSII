<template>
  <div class="space-y-4">
    <SpellLearningPanel :character="character" />
    <SpellcastingPanel :character="character" :prepare="prepare" :refresh="refresh"
      :repertoire-draft="repertoireDraft"
      :spell-descriptions="compendiumSpells" :descriptions-loading="loadingDescriptions" :descriptions-error="descriptionsError"
      @retry-descriptions="loadSpellDescriptions" @choices-updated="spellChoices = $event" />
    <details v-if="canManage" class="bg-dark-card border border-steel-dark rounded-xl p-4 sm:p-5">
      <summary class="font-bold text-gold cursor-pointer">Exceções de magia (mestre)</summary>
      <div class="space-y-4 mt-4">
        <p class="text-sm text-steel-light">Registre aqui magias de campanha e ajustes aprovados pelo mestre. As alterações são salvas na mesma lista de magias do personagem.</p>
        <details class="rounded-lg border border-steel-dark p-3">
          <summary class="text-sm font-bold text-gold cursor-pointer">Referência manual de usos (mestre)</summary>
          <p class="text-xs text-steel-light my-3">Use para regras de campanha ou fichas antigas. Estes valores não alteram os usos calculados acima.</p>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="lev in 6" :key="lev" class="text-center">
              <label class="lbl">Nível {{ lev }}</label>
              <input v-model.number="character['spellSlotsLevel' + lev]" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp text-center font-bold w-full" />
            </div>
          </div>
        </details>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="lev in 6" :key="lev" class="bg-dark-bg/30 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-gold">Nível {{ lev }}</span>
              <button type="button" @click="startSpell(lev)" :disabled="addingSpell" :aria-label="`Adicionar magia de nível ${lev}`" class="text-gold hover:text-gold-light text-sm disabled:opacity-40">+</button>
            </div>
            <div v-for="s in getSpellsByLevel(lev)" :key="s.id" class="flex items-center gap-1 mb-1">
              <SearchableChoice v-model="s.name" @change="saveSpellName(s)" :options="manualSpellChoices(spellChoices.spells, spellChoices.pools, lev, s.tradition)" :disabled="spellChoices.loading" :label="`Magia de nível ${lev}`" class="flex-1" placeholder="Nome da magia" />
              <button type="button" @click="removeSpell(s.id)" :aria-label="`Remover magia ${s.name || 'sem nome'}`" class="text-crimson-light hover:text-crimson text-xs font-bold pl-1">X</button>
            </div>
            <form v-if="newSpell?.level === lev" @submit.prevent="addSpell" class="mt-3 space-y-2">
              <label class="block text-xs text-steel-light">Nome da nova magia
                <SearchableChoice v-model="newSpell.name" @change="chooseNewSpell" :options="manualSpellChoices(spellChoices.spells, spellChoices.pools, lev, newSpell.tradition)" required maxlength="160" :disabled="addingSpell || spellChoices.loading" :label="`Nome da nova magia de nível ${lev}`" class="mt-1" placeholder="Escolha ou digite para buscar" />
              </label>
              <label class="block text-xs text-steel-light">Tradição
                <select v-model="newSpell.tradition" :disabled="addingSpell" :aria-label="`Tradição da nova magia de nível ${lev}`" class="inp mt-1"><option value="">A definir</option><option value="arcane">Arcana</option><option value="divine">Divina</option></select>
              </label>
              <p class="text-xs text-steel-light">A lista mostra magias do livro e homebrew liberadas para esta ficha. Os usos automáticos respeitam a classe e o nível; outras entradas ficam como referência manual.</p>
              <div class="flex flex-wrap gap-3"><button type="submit" :disabled="addingSpell || !newSpell.name.trim()" class="text-sm text-gold disabled:opacity-40">Confirmar magia</button><button type="button" @click="newSpell = null" :disabled="addingSpell" class="text-sm text-steel-light">Cancelar</button></div>
            </form>
          </div>
        </div>
      </div>
    </details>
    <!-- ====== MAGIC SHEET ====== -->
    <details class="bg-dark-card border border-gold/20 rounded-xl p-4 sm:p-5">
      <summary class="text-xl font-bold text-gold cursor-pointer">Aprendizado e pesquisa de magia</summary>
      <div class="mt-4">
      <p class="text-sm text-steel-light mb-4">Grimório, anotações de aprendizado, recursos e projetos de pesquisa.</p>

      <!-- Spells per day + resources -->
      <div class="mb-6">
        <div>
          <h3 class="text-lg font-bold text-gold mb-3">Recursos de magia</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="mb-1 flex items-center gap-1"><label for="magic-library" class="lbl">Valor da biblioteca</label>
                <HelpTooltip label="Valor da biblioteca">
                  Valor total da biblioteca arcana disponível para aprendizado e pesquisa de magia.
                </HelpTooltip>
              </div>
              <input id="magic-library" v-model.number="character.libraryValue" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp" />
            </div>
            <div>
              <div class="mb-1 flex items-center gap-1"><label for="magic-workshop" class="lbl">Valor da oficina</label>
                <HelpTooltip label="Valor da oficina">
                  Estrutura material/laboratório para criação e desenvolvimento de fórmulas e itens mágicos.
                </HelpTooltip>
              </div>
              <input id="magic-workshop" v-model.number="character.workshopValue" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp" />
            </div>
            <div>
              <div class="mb-1 flex items-center gap-1"><label for="magic-congregants" class="lbl">Congregantes</label>
                <HelpTooltip label="Congregantes">
                  Seguidores, aprendizes e assistentes ligados ao seu círculo mágico/templo.
                </HelpTooltip>
              </div>
              <input id="magic-congregants" v-model.number="character.congregants" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp" />
            </div>
            <div class="col-span-2">
              <label for="magic-research-summary" class="lbl">Pesquisa de magia</label>
              <input id="magic-research-summary" v-model="character.magicResearch" @input="emit('save')" @change="emit('save')" class="inp" placeholder="Pesquisa em andamento..." />
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
            <input v-model.number="character.researchTimeWeeks" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp" />
          </div>
          <div>
            <label class="lbl">Custo de Pesquisa (GP)</label>
            <input v-model.number="character.researchCostGp" @input="emit('save')" @change="emit('save')" type="number" min="0" class="inp" />
          </div>
        </div>
      </div>

      <div v-if="isRuleEnabled('enableMagicResearchValidation') && hasResearchPlan" class="text-xs rounded border px-3 py-2 mb-6" :class="researchValidation.ok ? 'border-green-700/40 text-green-400 bg-green-900/10' : 'border-red-700/40 text-red-400 bg-red-900/10'">
        {{ researchValidation.message }}
      </div>

      <!-- Rituals known -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-gold">Rituais conhecidos</h3>
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
          <h3 class="text-lg font-bold text-gold">Fórmulas mágicas conhecidas</h3>
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
          <h3 class="text-lg font-bold text-gold">Laboratório mágico · criação de itens</h3>
          <button type="button" @click="addMagicResearch" class="text-sm bg-gold/10 text-gold px-3 py-1 rounded hover:bg-gold/20 transition-all">+ Novo projeto</button>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead>
              <tr class="text-steel-light border-b border-gold/20">
                <th class="py-2 px-2">Item</th>
                <th class="py-2 px-2 text-center w-24">Tipo</th>
                <th class="py-2 px-2 text-center w-20">Nível da magia</th>
                <th class="py-2 px-2 text-center w-28">Custo / prazo</th>
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
      </div>
    </details>
  </div>
</template>

<script lang="ts">
export default { name: 'MagicTab' }
</script>

<script setup lang="ts">
import SpellLearningPanel from './SpellLearningPanel.vue'
import api from '../../services/api'
import { useCharacterRelations } from '../../composables/characterRelations'
import HelpTooltip from '../HelpTooltip.vue'
import { manualSpellChoices, type RepertoireDraft } from '../../utils/spellcasting'
import SpellcastingPanel from './SpellcastingPanel.vue'
import SearchableChoice from '../SearchableChoice.vue'
import { useAuthStore } from '../../stores/auth'
import { notifyError } from '../../utils/toast'
import { errorMessage } from '../../utils/catalog'
import { computed, ref, onMounted } from 'vue'

const props = defineProps<{
  character: any,
  repertoireDraft: RepertoireDraft,
  optionalRules?: Record<string, boolean>
  prepare: () => Promise<boolean>
  refresh: () => Promise<void>
}>()

const emit = defineEmits(['save'])
const relations = useCharacterRelations(() => props.character)
const authStore = useAuthStore()
const canManage = computed(() => authStore.isMaster)

function isRuleEnabled(key: string) {
  return props.optionalRules?.[key] !== false
}

const compendiumSpells = ref<any[]>([])
const spellChoices = ref<{ spells: any[]; pools: any[]; loading: boolean }>({ spells: [], pools: [], loading: true })
function chooseNewSpell(name: string) {
  if (!newSpell.value || newSpell.value.tradition) return
  const choice = manualSpellChoices(spellChoices.value.spells, spellChoices.value.pools, newSpell.value.level).find(spell => spell.value === name)
  if (choice?.tradition) newSpell.value.tradition = choice.tradition
}
const loadingDescriptions = ref(false), descriptionsError = ref('')
const effectTypes = [
  ['MANUAL', 'Manual / projeto antigo'], ['ONE_USE', 'Uso único'], ['CHARGED', 'Por cargas'],
  ['WEEKLY', '1/semana'], ['THREE_WEEKLY', '3/semana (máx. 1/dia)'], ['DAILY', '1/dia'], ['THREE_DAILY', '3/dia (máx. 1/hora)'],
  ['HOURLY', '1/hora'], ['THREE_TURNS', '1/3 turnos'], ['EACH_TURN', '1/turno'], ['AT_WILL', 'À vontade'],
  ['PERMANENT_DAY', 'Permanente: duração ≥ dia'], ['PERMANENT_HOUR', 'Permanente: duração ≥ hora'],
  ['PERMANENT_THREE_TURNS', 'Permanente: duração ≥ 3 turnos'], ['PERMANENT_TURN', 'Permanente: duração ≥ turno'],
  ['PERMANENT_CASTER_LEVEL', 'Permanente: duração por nível'], ['BONUS', 'Bônus de equipamento'],
]

async function loadSpellDescriptions() {
  if (loadingDescriptions.value) return
  loadingDescriptions.value = true; descriptionsError.value = ''
  try {
    const res = await api.get('/api/compendium/search', { params: { type: 'spell', limit: 500 } })
    compendiumSpells.value = res.data.entries || []
  } catch (e) { descriptionsError.value = errorMessage(e, 'Não foi possível carregar as descrições das magias.') }
  finally { loadingDescriptions.value = false }
}
onMounted(loadSpellDescriptions)

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
const hasResearchPlan = computed(() => Boolean(String(props.character.magicResearch || '').trim() || researchQueueText.value.trim() || Number(props.character.researchCostGp) > 0 || Number(props.character.researchTimeWeeks) > 0))

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
const newSpell = ref<{ name: string; level: number; tradition: string } | null>(null)
const addingSpell = ref(false)
function startSpell(level: number) {
  if (newSpell.value && (newSpell.value.name.trim() || newSpell.value.tradition) && !window.confirm('Descartar o nome da nova magia antes de escolher outro nível?')) return
  newSpell.value = { level, name: '', tradition: '' }
}
async function addSpell() {
  if (addingSpell.value || !newSpell.value?.name.trim()) return
  const input = { ...newSpell.value, name: newSpell.value.name.trim() }
  addingSpell.value = true
  try {
    const result = await relations.add('spells', 'spells', 'spell', input, String(input.level))
    if (result) newSpell.value = null
  } finally { addingSpell.value = false }
}

async function removeSpell(id: string) {
  await relations.remove('spells', 'spells', id)
}

async function saveSpellName(s: any) {
  await relations.update('spells', s, { name: s.name, level: s.level, tradition: s.tradition }, 'spell')
}

// Rituals
async function addRitual() {
  await relations.add('rituals', 'rituals', 'ritual', { name: '' })
}

async function removeRitual(id: string) {
  await relations.remove('rituals', 'rituals', id)
}

async function saveRitualName(r: any) {
  await relations.update('rituals', r, { name: r.name }, 'ritual')
}

// Magic formulae known
async function addMagicFormula() {
  await relations.add('magic-formulae', 'magicFormulae', 'formula', { name: '' })
}

async function removeMagicFormula(id: string) {
  await relations.remove('magic-formulae', 'magicFormulae', id)
}

async function saveMagicFormulaName(f: any) {
  await relations.update('magic-formulae', f, { name: f.name }, 'formula')
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
  await relations.add('magic-research', 'magicItemResearch', 'research', {
    itemName: 'Novo item', spellLevel: 1, effectType: 'ONE_USE', status: 'QUEUED',
  })
}

async function removeMagicResearch(id: string) {
  if (isTrackedResearch(id)) return
  await relations.remove('magic-research', 'magicItemResearch', id)
}

async function saveMagicResearch(project: any) {
  if (isTrackedResearch(project.id)) { notifyError('Projeto acompanhado: use Evolução & Regras para trabalho, resolução ou cancelamento.'); return }
  await relations.update('magic-research', project, {
    itemName: project.itemName, spellLevel: project.spellLevel,
    totalCostGp: project.totalCostGp, weeksRequired: project.weeksRequired,
    isPermanent: project.isPermanent, effectType: project.effectType,
    effectCount: project.effectCount, casterLevel: project.casterLevel,
    researchRateGp: project.researchRateGp, hasFormula: project.hasFormula,
    hasSample: project.hasSample, knowsEffect: project.knowsEffect, status: project.status,
  }, 'research')
}
</script>
