<template>
  <details class="rounded-xl border border-gold/20 bg-dark-card p-4 sm:p-5">
    <summary class="cursor-pointer font-bold text-gold">Origens dos bônus de CA e iniciativa</summary>
    <div class="mt-4 space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 text-sm">
        <div><h3 class="font-bold text-gold">CA sem escudo: {{ metrics.armorClass.noShield }}</h3><p v-for="(entry, i) in metrics.armorSources" :key="i">{{ entry.source }}: {{ signed(entry.value) }}</p></div>
        <div><h3 class="font-bold text-gold">Iniciativa: {{ signed(metrics.initiative) }}</h3><p v-for="(entry, i) in metrics.initiativeSources" :key="i">{{ entry.source }}: {{ signed(entry.value) }}</p></div>
      </div>
      <p class="text-xs text-steel-light">Os valores antigos de armadura e ajuste manual continuam aplicados. Antes de ativar um bônus aqui, retire sua cópia desses campos. Registre uma origem uma única vez por atributo.</p>
      <p v-if="error" role="alert" class="text-sm text-red-400">{{ error }}</p>
      <p v-if="notice" role="status" class="text-sm text-steel-light">{{ notice }}</p>
      <fieldset :disabled="busy" class="min-w-0 space-y-3">
        <label class="block text-sm"><input v-model="configuration.powersEnabled" type="checkbox" @change="save" /> Aplicar Graceful Fighting e Swashbuckling automaticamente</label>
        <label class="block text-sm"><input v-model="configuration.lightArmor" type="checkbox" @change="save" /> A armadura atual é leve ou menor (confirmado em jogo)</label>
        <p class="text-xs text-steel-light">Poderes exigem carga pessoal até 5 stone. A condição de armadura deve ser conferida ao trocar de equipamento. Itens guardados, em montarias ou veículos não concedem bônus.</p>
        <div v-for="(entry, index) in configuration.modifiers" :key="index" class="grid gap-2 rounded-lg border border-steel-dark p-3 sm:grid-cols-2">
          <label class="text-xs">Origem<input v-model="entry.source" @change="save" maxlength="160" :aria-label="`Origem do bônus ${index + 1}`" class="inp mt-1" /></label>
          <label class="text-xs">Item associado<select v-model="entry.itemId" @change="onItemChange(entry)" :aria-label="`Item do bônus ${index + 1}`" class="inp mt-1"><option value="">Poder, magia ou decisão do mestre</option><option v-for="item in character.items" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
          <label class="text-xs">Atributo<select v-model="entry.stat" @change="save" :aria-label="`Atributo do bônus ${index + 1}`" class="inp mt-1"><option value="ac">CA</option><option value="initiative">Iniciativa</option></select></label>
          <label class="text-xs">Valor<input v-model.number="entry.value" @change="save" :aria-label="`Valor do bônus ${index + 1}`" type="number" min="-30" max="30" step="1" class="inp mt-1" /></label>
          <label class="text-xs flex items-center gap-2"><input v-model="entry.active" type="checkbox" @change="save" /> Ativo</label>
          <button type="button" @click="configuration.modifiers.splice(index, 1); save()" class="text-sm text-red-400 sm:justify-self-end">Remover bônus {{ index + 1 }}</button>
        </div>
        <button type="button" @click="add" :disabled="configuration.modifiers.length >= 30" class="text-gold underline text-sm">Adicionar origem de bônus</button>
      </fieldset>
    </div>
  </details>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import api from '../../services/api'
import { useCharacterOperations } from '../../composables/characterOperations'
import { combatConfiguration, type CombatModifier } from '../../utils/combatModifiers'
import { calculateCharacterMetrics } from '../../utils/characterMetrics'
import { errorMessage } from '../../utils/catalog'
const props = defineProps<{ character: any; definition?: any }>()
const operations = useCharacterOperations()
const configuration = ref(combatConfiguration(props.character)), busy = ref(false), error = ref(''), notice = ref('')
const metrics = computed(() => calculateCharacterMetrics(props.character, props.definition))
const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`
watch(() => props.character.rulesState, () => { if (!busy.value) configuration.value = combatConfiguration(props.character) })
function add() { configuration.value.modifiers.push({ source: `Bônus ${configuration.value.modifiers.length + 1}`, stat: 'ac', value: 0, active: false }); void save() }
function onItemChange(entry: CombatModifier) { if (entry.itemId) entry.source = props.character.items.find((item: any) => item.id === entry.itemId)?.name || entry.source; void save() }
async function save() {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  const input = JSON.parse(JSON.stringify(configuration.value))
  try {
    const result = await operations.run('combat:modifiers:update', version => api.post(`/api/game-rules/characters/${props.character.id}/combat/modifiers`, { version, configuration: input }), undefined, { retainDraft: true })
    if (!result) error.value = errorMessage(operations.getLastError(), 'Não foi possível salvar os modificadores. Use Salvar para tentar novamente.')
    else notice.value = 'Origens atualizadas.'
  } finally { busy.value = false }
}
</script>
