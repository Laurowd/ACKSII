<template>
  <details class="rounded-xl border border-gold/20 bg-dark-card p-4 sm:p-5">
    <summary class="font-bold text-gold cursor-pointer">Aprender ou substituir uma magia por estudo</summary>
    <div class="mt-4 space-y-4">
      <p class="text-sm text-steel-light">O grimório guarda fórmulas; o repertório contém as magias disponíveis para conjurar. Conjuradores de estudo precisam de uma semana de dedicação para adicionar uma magia ou substituir outra da mesma tradição e nível (Rulebook p. 182).</p>
      <p v-if="error" role="alert" class="text-sm text-red-400">{{ error }}</p><p v-if="notice" role="status" class="text-sm text-steel-light">{{ notice }}</p>
      <p v-if="loading" role="status" class="text-sm text-steel-light">Carregando opções de aprendizado…</p>
      <button v-if="loadError" type="button" @click="load" class="text-gold underline">Tentar carregar aprendizado novamente</button>
      <p v-if="!loading && !studiousPools.length && !loadError" class="text-sm text-steel-light">A classe atual não usa aprendizado por estudo neste nível. Repertórios por oração seguem a ordem religiosa definida pelo mestre.</p>
      <fieldset v-if="studiousPools.length && !loading" :disabled="busy" class="min-w-0 space-y-4">
        <div v-if="study" class="rounded-lg border border-gold/30 p-4 space-y-3">
          <h3 class="text-gold font-bold">Estudando {{ study.spell.name }}</h3>
          <p class="text-sm">Início: dia {{ study.startDay }} · Conclusão a partir do dia {{ study.earliestDay }}<span v-if="study.replacedName"> · Substitui {{ study.replacedName }}</span></p>
          <label class="block text-sm">Dia de jogo da conclusão<input v-model.number="completionDay" type="number" :min="study.earliestDay" max="2147483647" class="inp mt-1" /></label>
          <label class="block text-sm"><input v-model="dedicationConfirmed" type="checkbox" /> Completei uma semana de estudo dedicado, com a fórmula disponível e legível.</label>
          <div class="flex flex-wrap gap-4"><button type="button" @click="complete" :disabled="!dedicationConfirmed || !Number.isInteger(completionDay) || completionDay < study.earliestDay" class="text-gold underline disabled:opacity-40">Concluir estudo e atualizar repertório</button><button type="button" @click="cancel" class="text-red-400 underline">Cancelar estudo</button></div>
        </div>
        <details class="rounded-lg border border-steel-dark p-3">
          <summary class="text-gold cursor-pointer">Registrar fórmula adquirida</summary>
          <div class="space-y-3 mt-3">
            <label class="block text-sm">Fórmula encontrada<select v-model="acquiredKey" aria-label="Fórmula encontrada" class="inp mt-1"><option value="">Escolha uma magia</option><option v-for="spell in catalog" :key="key(spell)" :value="key(spell)">{{ spell.name }} · {{ spell.tradition === 'arcane' ? 'Arcana' : 'Divina' }} {{ spell.level }}</option></select></label>
            <label class="block text-sm">Origem da fórmula<input v-model="source" maxlength="300" class="inp mt-1" placeholder="Ex.: grimório encontrado nas ruínas" /></label>
            <label class="block text-sm"><input v-model="available" type="checkbox" /> A fórmula já foi adquirida, é legível e está disponível para estudo.</label>
            <p class="text-xs text-steel-light">Este registro não cobra moedas nem copia pergaminhos automaticamente. Compras, cópia e idioma devem ser resolvidos em jogo.</p>
            <button type="button" @click="acquire" :disabled="!acquiredKey || !source.trim() || !available" class="text-gold underline disabled:opacity-40">Adicionar fórmula ao grimório</button>
          </div>
        </details>
        <div v-if="!study" class="space-y-3">
          <label class="block text-sm">Fórmula disponível no grimório<select v-model="selectedKey" aria-label="Fórmula disponível no grimório" class="inp mt-1"><option value="">Escolha uma fórmula</option><option v-for="spell in availableFormulas" :key="key(spell)" :value="key(spell)">{{ spell.name }} · Nível {{ spell.level }}</option></select></label>
          <label class="block text-sm">Substituir no repertório<select v-model="replaceSpellId" aria-label="Substituir no repertório" class="inp mt-1"><option value="">Adicionar sem substituir (se houver espaço)</option><option v-for="spell in replacements" :key="spell.id" :value="spell.id">{{ spell.name }}</option></select></label>
          <label class="block text-sm">Dia de jogo do início<input v-model.number="startDay" type="number" min="0" max="2147483640" class="inp mt-1" /></label>
          <label class="block text-sm"><input v-model="startConfirmed" type="checkbox" /> A fórmula está legível e disponível; vou dedicar uma semana ao estudo.</label>
          <button type="button" @click="start" :disabled="!selectedKey || !startConfirmed || !Number.isInteger(startDay) || startDay < 0" class="text-gold underline disabled:opacity-40">Iniciar semana de estudo</button>
        </div>
      </fieldset>
    </div>
  </details>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import api from '../../services/api'
import { getResource } from '../../services/resources'
import { useCharacterOperations } from '../../composables/characterOperations'
import { errorMessage } from '../../utils/catalog'
const props = defineProps<{ character: any }>()
const operations = useCharacterOperations(), overview = ref<any>({}), metadata = ref<any>({})
const busy = ref(false), loading = ref(true), loadError = ref(false), error = ref(''), notice = ref('')
const acquiredKey = ref(''), selectedKey = ref(''), source = ref(''), available = ref(false), startConfirmed = ref(false), dedicationConfirmed = ref(false), replaceSpellId = ref(''), startDay = ref(1), completionDay = ref(8)
const key = (spell: any) => `${spell.tradition}:${spell.level}:${spell.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
const state = computed(() => { try { return JSON.parse(props.character.rulesState || '{}') } catch { return {} } })
const study = computed(() => state.value.study)
const studiousPools = computed(() => (overview.value.magic || []).filter((pool: any) => pool.studious))
const catalog = computed(() => (metadata.value.spells || []).filter((spell: any) => studiousPools.value.some((pool: any) => pool.tradition === spell.tradition)))
const availableFormulas = computed(() => catalog.value.filter((spell: any) => studiousPools.value.some((pool: any) => pool.tradition === spell.tradition && pool.slots[spell.level - 1]) && ((state.value.formulas || []).some((formula: any) => key(formula) === key(spell)) || (props.character.spellbook || []).some((name: string) => name.toLowerCase() === spell.name.toLowerCase()))))
const selected = computed(() => catalog.value.find((spell: any) => key(spell) === selectedKey.value))
const replacements = computed(() => (props.character.spells || []).filter((spell: any) => spell.level === selected.value?.level && spell.tradition === selected.value?.tradition))
watch(selectedKey, () => { replaceSpellId.value = '' })
watch(study, value => { if (value) completionDay.value = value.earliestDay }, { immediate: true })
async function load() { loading.value = true; loadError.value = false; error.value = ''; try { const [info, meta] = await Promise.all([api.get(`/api/game-rules/characters/${props.character.id}`), getResource('/api/game-rules/metadata')]); overview.value = info.data; metadata.value = meta.data } catch (caught) { loadError.value = true; error.value = errorMessage(caught, 'Não foi possível carregar o aprendizado.') } finally { loading.value = false } }
async function run(path: string, input: any, message: string) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try {
    const result = await operations.run(`magic:study:${path}`, version => api.post(`/api/game-rules/characters/${props.character.id}/magic/${path}`, { version, ...input }))
    if (!result) error.value = errorMessage(operations.getLastError(), 'A operação não foi confirmada; confira a ficha antes de repetir.')
    else notice.value = message
  } finally { busy.value = false }
}
async function acquire() { const spell = catalog.value.find((entry: any) => key(entry) === acquiredKey.value); if (spell) await run('formulas', { spell: { name: spell.name, level: spell.level, tradition: spell.tradition }, source: source.value, available: true }, 'Fórmula registrada no grimório; o repertório permanece igual.') }
async function start() { await run('study/start', { studyId: crypto.randomUUID(), formulaKey: selectedKey.value, day: startDay.value, available: true, ...(replaceSpellId.value && { replaceSpellId: replaceSpellId.value }) }, 'Semana de estudo registrada. A magia será incluída somente na conclusão.') }
async function complete() { if (study.value && dedicationConfirmed.value) await run('study/complete', { studyId: study.value.id, day: completionDay.value, requirementsMet: true }, 'Estudo concluído; repertório atualizado e fórmulas preservadas no grimório.') }
async function cancel() { if (study.value && window.confirm('Cancelar este estudo? A fórmula continuará no grimório.')) await run('study/cancel', { studyId: study.value.id }, 'Estudo cancelado; fórmula preservada.') }
onMounted(load)
</script>
