import { onBeforeUnmount, onMounted } from 'vue'

/** One read at a time, only while the page is visible; stop late responses on navigation. */
export function useVisiblePolling(read: (signal: AbortSignal) => Promise<void>, paused = () => false, interval = 30_000) {
  let timer: ReturnType<typeof setTimeout> | undefined, controller: AbortController | undefined, stopped = false
  const schedule = () => { clearTimeout(timer); if (!stopped) timer = setTimeout(tick, interval) }
  async function tick() {
    if (stopped) return
    if (controller || document.hidden || paused()) { schedule(); return }
    controller = new AbortController()
    try { await read(controller.signal) } catch { /* The view supplies its own persistent error state. */ }
    finally { controller = undefined; schedule() }
  }
  function onVisible() { if (!document.hidden) { clearTimeout(timer); void tick() } }
  onMounted(() => { document.addEventListener('visibilitychange', onVisible); schedule() })
  onBeforeUnmount(() => { stopped = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', onVisible) })
}
