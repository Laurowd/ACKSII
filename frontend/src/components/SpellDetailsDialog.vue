<template>
  <Teleport to="body">
    <dialog ref="dialog" class="spell-details-dialog" :aria-labelledby="`${id}-title`" @cancel.prevent="close" @click="backdropClose">
      <div class="spell-details-header">
        <div><p class="eyebrow">Consulta de magia</p><h2 :id="`${id}-title`" class="text-2xl text-gold font-bold break-words">{{ name }}</h2><p class="text-sm text-steel-light mt-1">{{ tradition }} · Nível {{ level }}</p></div>
        <button type="button" class="ui-button ui-button-secondary" aria-label="Fechar descrição da magia" autofocus @click="close">Fechar</button>
      </div>
      <dl v-if="range || duration" class="ui-summary-grid mb-5"><div v-if="range"><dt>Alcance</dt><dd>{{ range }}</dd></div><div v-if="duration"><dt>Duração</dt><dd>{{ duration }}</dd></div></dl>
      <p class="spell-details-text">{{ description }}</p>
    </dialog>
  </Teleport>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
defineProps<{ name: string; level: number; tradition: string; description: string; range?: string; duration?: string }>()
const emit = defineEmits<{ close: [] }>()
const id = useId(), dialog = ref<HTMLDialogElement>()
let returnFocus: HTMLElement | null = null
onMounted(() => { returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; dialog.value?.showModal() })
onBeforeUnmount(() => { dialog.value?.close(); if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }) })
function close() { dialog.value?.close(); emit('close') }
function backdropClose(event: MouseEvent) {
  if (event.target !== dialog.value || !dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
}
</script>
