<template>
  <section v-if="definitions.length" class="rounded-xl border border-gold/30 p-4 space-y-4" aria-labelledby="class-choices-title">
    <h3 id="class-choices-title" class="text-lg text-gold">Escolhas próprias da classe</h3>
    <p class="text-sm text-steel-light">As concessões abaixo não gastam escolhas de classe ou gerais.</p>
    <div v-for="definition in definitions" :key="definition.id" class="space-y-2">
      <label :for="`class-choice-${definition.id}`" class="block text-sm">{{ definition.label }} <span v-if="definition.minimumLevel > 1" class="text-steel-light">· nível {{ definition.minimumLevel }}</span></label>
      <SearchableChoice :id="`class-choice-${definition.id}`" :model-value="modelValue[definition.id] || ''" @update:model-value="value => select(definition, value)" :options="optionsFor(definition).map(option => ({value:option.key,label:option.label}))" :label="definition.label" :disabled="!!locked?.[definition.id] && !canApprove" :placeholder="definition.kind === 'craft' ? 'Escolha ou digite Craft (nome do ofício)' : 'Escolha uma opção'" maxlength="160" />
      <p v-if="definition.kind === 'craft'" class="text-xs text-steel-light">Pode informar outro ofício no formato Craft (ofício). A concessão contém três graduações, com alvo padrão 2+.</p>
      <template v-if="modelValue[definition.id] === 'judge'">
        <p class="text-xs text-steel-light">O mestre aprova o poder e seu nível de aquisição. Esta escolha não concede conjuração.</p>
        <label class="block text-sm">Nome do poder aprovado<input :value="modelValue[`${definition.id}-name`]" @input="set(`${definition.id}-name`, ($event.target as HTMLInputElement).value)" :disabled="!canApprove" maxlength="160" class="inp mt-1" /></label>
        <label class="block text-sm">Descrição e condições<textarea :value="modelValue[`${definition.id}-description`]" @input="set(`${definition.id}-description`, ($event.target as HTMLTextAreaElement).value)" :disabled="!canApprove" maxlength="2000" rows="3" class="inp mt-1" /></label>
        <label class="block text-sm">Nível de aquisição do poder<input :value="modelValue[`${definition.id}-level`] || '1'" @input="set(`${definition.id}-level`, ($event.target as HTMLInputElement).value)" :disabled="!canApprove" type="number" min="1" :max="character.level || 1" class="inp mt-1" /></label>
      </template>
    </div>
    <div v-if="totem" class="rounded-lg border border-steel-dark p-3 text-sm space-y-1">
      <p><strong class="text-gold">{{ totem.name }}</strong> · {{ totem.attribute.toUpperCase() }} ≥ 9 · {{ totem.benefit }}</p>
      <p class="text-xs text-steel-light">Animal comum: {{ totem.characteristics }}</p>
      <p class="text-xs text-steel-light">O totem tem {{ totemHd }} HD e {{ totemHd * 4 }} PV. Ajuste as demais características conforme Rulebook p. 70. O benefício depende do animal estar vivo e próximo.</p>
    </div>
    <ul v-if="showErrors && issues.length" role="alert" class="list-disc pl-5 text-sm text-red-400"><li v-for="issue in issues" :key="issue">{{ issue }}</li></ul>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import SearchableChoice from './SearchableChoice.vue'
import { relevantChoices, choiceOptions, classChoiceIssues, TOTEM_ANIMALS, type ClassChoiceDefinition, type ClassSelections } from '../../../backend/src/lib/classAbilities'
const props = defineProps<{ rules: any; character: any; modelValue: ClassSelections; canApprove?: boolean; locked?: ClassSelections; showErrors?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [ClassSelections] }>()
const current = computed(() => ({ ...props.character, classChoices: props.modelValue }))
const definitions = computed(() => relevantChoices(props.rules || {}, current.value))
const optionsFor = (definition: ClassChoiceDefinition) => choiceOptions(definition, current.value).filter(option => option.key !== 'judge' || props.canApprove || props.modelValue[definition.id] === 'judge')
function set(id: string, value: string) { emit('update:modelValue', { ...props.modelValue, [id]: value }) }
function select(definition: ClassChoiceDefinition, value: string) {
  const key = optionsFor(definition).find(option => option.label === value)?.key || value
  const next = { ...props.modelValue, [definition.id]: key }
  if (key === 'judge' && !next[`${definition.id}-level`]) next[`${definition.id}-level`] = '1'
  emit('update:modelValue', next)
}
const issues = computed(() => classChoiceIssues(props.rules || {}, current.value, props.modelValue, true, props.canApprove))
const totem = computed(() => props.rules?.className === 'Shaman' ? TOTEM_ANIMALS.find(animal => animal.name === props.modelValue.totem) : undefined)
const totemHd = computed(() => Math.max(0.5, Math.min(9, Number(props.character.level || 1)) - 1))
</script>
