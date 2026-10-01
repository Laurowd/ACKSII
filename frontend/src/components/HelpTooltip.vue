<template>
  <span class="help-anchor">
    <button ref="trigger" type="button" class="help-trigger" :aria-label="`Ajuda: ${label}`"
      :aria-describedby="open ? id : undefined"
      @pointerenter="enter" @pointerleave="leave" @focus="focus" @blur="blur" @click.stop="toggle">
      ?
    </button>
    <Teleport to="body">
      <div v-if="open" :id="id" ref="panel" role="tooltip" class="help-panel" :style="position"
        @pointerenter="cancelClose" @pointerleave="leave">
        <slot />
      </div>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

defineProps<{ label: string }>()
const id = useId()
const trigger = ref<HTMLButtonElement>()
const panel = ref<HTMLElement>()
const open = ref(false)
const position = ref<Record<string, string>>({})
let pinned = false
let keyboardFocus = false
let timer: ReturnType<typeof setTimeout> | undefined

function cancelClose() { clearTimeout(timer) }
function place() {
  if (!open.value || !trigger.value || !panel.value) return
  const rect = trigger.value.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = document.documentElement.clientHeight
  const width = Math.min(320, viewportWidth - 24)
  const below = viewportHeight - rect.bottom - 20
  const above = rect.top - 20
  const useBelow = below >= Math.min(panel.value.scrollHeight, 240) || below >= above
  const height = Math.max(0, Math.min(360, useBelow ? below : above))
  position.value = {
    width: `${width}px`, maxHeight: `${height}px`,
    left: `${Math.max(12, Math.min(rect.left, viewportWidth - width - 12))}px`,
    ...(useBelow ? { top: `${rect.bottom + 8}px` } : { bottom: `${viewportHeight - rect.top + 8}px` }),
  }
}
function show() { cancelClose(); open.value = true; void nextTick(place) }
function close() { cancelClose(); open.value = false; pinned = false }
function enter(event: PointerEvent) { if (event.pointerType === 'mouse') show() }
function leave() { cancelClose(); if (!pinned && !keyboardFocus) timer = setTimeout(close, 150) }
function focus(event: FocusEvent) {
  keyboardFocus = (event.target as HTMLElement).matches(':focus-visible')
  if (keyboardFocus) show()
}
function blur() { keyboardFocus = false; close() }
function toggle() { if (pinned) close(); else { pinned = true; show() } }
function outside(event: PointerEvent) {
  const target = event.target as Node
  if (!trigger.value?.contains(target) && !panel.value?.contains(target)) close()
}
function escape(event: KeyboardEvent) { if (event.key === 'Escape') close() }
function scroll(event: Event) {
  // Let long descriptions scroll without dismissing the help.
  if (!open.value || panel.value?.contains(event.target as Node)) return
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect || rect.bottom < 0 || rect.top > document.documentElement.clientHeight) close()
  else place()
}
onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', escape)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', scroll, true)
})
onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', escape)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', scroll, true)
})
</script>

<style scoped>
.help-anchor { display: inline-flex; flex: none; vertical-align: middle; }
.help-trigger {
  display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem;
  border-radius: 50%; border: 1px solid var(--color-steel-light); background: var(--color-dark-bg);
  color: var(--color-gold); font: 700 12px/1 system-ui, sans-serif; cursor: help;
}
.help-trigger:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 3px; }
.help-panel {
  position: fixed; z-index: 1000; box-sizing: border-box; padding: 12px; overflow: auto;
  border: 1px solid var(--color-gold); border-radius: 8px; background: var(--color-dark-bg);
  color: var(--color-dark-text); box-shadow: 0 4px 20px #0008; font: 400 13px/1.5 system-ui, sans-serif;
  text-align: left; text-transform: none; letter-spacing: normal; white-space: pre-line; overflow-wrap: anywhere;
}
</style>
