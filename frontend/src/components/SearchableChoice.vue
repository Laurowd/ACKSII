<template>
  <div class="relative min-w-0" :class="$attrs.class">
    <div class="relative">
      <input v-bind="inputAttributes()" :value="display" :aria-label="label" :placeholder="placeholder" :disabled="disabled"
        role="combobox" aria-autocomplete="list" :aria-expanded="open" :aria-controls="listId"
        :aria-activedescendant="open && filtered[active] ? `${listId}-${active}` : undefined"
        autocomplete="off" class="inp pr-10" @focus="show" @input="input" @change="commitTyped"
        @blur="blur" @keydown="keyDown" />
      <button type="button" tabindex="-1" :disabled="disabled" :aria-label="`Mostrar opções de ${label}`"
        :aria-expanded="open" @pointerdown.prevent @click="open ? open = false : show()"
        class="absolute right-1 top-1 bottom-1 w-8 rounded text-gold hover:bg-gold/10 disabled:opacity-40">▾</button>
    </div>
    <ul v-if="open" :id="listId" role="listbox" :aria-label="`Opções de ${label}`"
      class="relative z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gold/30 bg-dark-card shadow-lg">
      <li v-for="(option, i) in filtered" :id="`${listId}-${i}`" :key="option.value" role="option"
        :aria-selected="option.value === modelValue" @pointerdown.prevent @click="choose(option)"
        class="cursor-pointer px-3 py-2 text-sm break-words hover:bg-gold/10" :class="i === active ? 'bg-gold/10 text-gold' : 'text-dark-text'">
        <span>{{ option.label }}</span><span v-if="option.hint" class="block text-xs text-steel-light">{{ option.hint }}</span>
      </li>
      <li v-if="!filtered.length" role="presentation" class="px-3 py-3 text-sm text-steel-light">Nenhuma opção encontrada.</li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useId, watch } from 'vue'
defineOptions({ inheritAttrs: false })
type Option = { value: string; label?: string; hint?: string }
const props = withDefaults(defineProps<{ modelValue: string; options: (string | Option)[]; label: string; placeholder?: string; disabled?: boolean }>(), { placeholder: 'Escolha ou digite para buscar', disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string] }>()
const listId = `choice-${useId()}`, open = ref(false), query = ref(''), active = ref(0)
const attributes = useAttrs()
const inputAttributes = () => Object.fromEntries(Object.entries(attributes).filter(([key]) => key !== 'class'))
watch(() => props.disabled, disabled => { if (disabled) open.value = false })
const options = computed(() => props.options.map(option => typeof option === 'string' ? { value: option, label: option, hint: '' } : { ...option, label: option.label || option.value }))
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
const filtered = computed(() => options.value.filter(option => fold(`${option.label} ${option.hint || ''}`).includes(fold(query.value.trim()))))
const display = computed(() => options.value.find(option => option.value === props.modelValue)?.label || props.modelValue)
let committed: string | undefined
let blurTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(blurTimer))
function blur() { clearTimeout(blurTimer); blurTimer = setTimeout(() => { open.value = false }, 150) }
function show() { if (props.disabled) return; clearTimeout(blurTimer); query.value = ''; active.value = 0; open.value = true }
function input(event: Event) { const value = (event.target as HTMLInputElement).value; query.value = value; active.value = 0; committed = undefined; open.value = true; emit('update:modelValue', value) }
function choose(option: { value: string }) { if (props.disabled) return; emit('update:modelValue', option.value); committed = option.value; emit('change', option.value); open.value = false }
function commitTyped() { if (committed !== props.modelValue) { committed = props.modelValue; emit('change', props.modelValue) } }
async function keyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') { open.value = false; event.preventDefault(); return }
  if (event.key === 'Tab') { open.value = false; return }
  if (event.key === 'Enter' && open.value && filtered.value[active.value]) { event.preventDefault(); choose(filtered.value[active.value]!); return }
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
  event.preventDefault()
  if (!open.value) show()
  else active.value = Math.max(0, Math.min(filtered.value.length - 1, active.value + (event.key === 'ArrowDown' ? 1 : -1)))
  await nextTick()
  document.getElementById(`${listId}-${active.value}`)?.scrollIntoView({ block: 'nearest' })
}
</script>
