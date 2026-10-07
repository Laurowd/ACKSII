<template>
  <section class="ui-section" :aria-labelledby="`${id}-title`">
    <div class="ui-section-heading">
      <h2 :id="`${id}-title`" class="text-xl text-gold font-bold">{{ title }}</h2>
      <button ref="toggle" type="button" class="ui-button ui-button-secondary" :aria-expanded="editing" :aria-controls="`${id}-content`" @click="toggleEditing">
        {{ editing ? 'Voltar à consulta' : 'Editar' }}
        <span class="sr-only"> {{ title }}</span>
      </button>
    </div>
    <div :id="`${id}-content`" ref="content">
      <slot v-if="!editing" />
      <template v-else>
        <p class="text-xs text-steel-light mb-4">As alterações são salvas automaticamente. Acompanhe o estado na barra da ficha.</p>
        <slot name="editor" />
      </template>
    </div>
  </section>
</template>
<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'
defineProps<{ title: string }>()
const id = useId(), editing = ref(false)
const toggle = ref<HTMLButtonElement>(), content = ref<HTMLElement>()
async function toggleEditing() {
  editing.value = !editing.value
  await nextTick()
  if (editing.value) {
    const field = content.value?.querySelector<HTMLElement>('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])')
    field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  } else toggle.value?.focus({ preventScroll: true })
}
</script>
