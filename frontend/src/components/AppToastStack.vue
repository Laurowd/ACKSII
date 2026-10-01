<template>
  <div class="fixed right-3 top-3 z-50 w-[min(92vw,26rem)] space-y-2 pointer-events-none">
    <transition-group name="toast">
      <div
        v-for="item in toasts"
        :key="item.id"
        :role="item.type === 'error' ? 'alert' : 'status'"
        aria-atomic="true"
        class="pointer-events-auto rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm"
        :class="toastClass(item.type)"
      >
        <p class="text-sm font-medium">{{ item.message }}</p>
      </div>
    </transition-group>
  </div>
</template>

<script lang="ts">
export default {
  name: 'AppToastStack',
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getToastEventName, type ToastPayload, type ToastType } from '../utils/toast'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

const toasts = ref<ToastItem[]>([])

function toastClass(type: ToastType) {
  if (type === 'success') return 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
  if (type === 'error') return 'bg-red-950/90 border-red-500/40 text-red-100'
  return 'bg-dark-card/95 border-gold/30 text-gold-light'
}

function onToast(event: Event) {
  const custom = event as CustomEvent<ToastPayload>
  const payload = custom.detail
  if (!payload || !payload.message) return

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const item: ToastItem = {
    id,
    message: payload.message,
    type: payload.type ?? 'info',
  }
  toasts.value.push(item)

  const duration = Math.max(1000, Number(payload.durationMs ?? 2400))
  window.setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

onMounted(() => {
  window.addEventListener(getToastEventName(), onToast as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener(getToastEventName(), onToast as EventListener)
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
