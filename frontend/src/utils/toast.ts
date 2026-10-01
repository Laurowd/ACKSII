export type ToastType = 'success' | 'error' | 'info'

export interface ToastPayload {
  message: string
  type?: ToastType
  durationMs?: number
}

const TOAST_EVENT = 'app:toast'

export function notify(payload: ToastPayload) {
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }))
}

export function notifySuccess(message: string, durationMs = 2600) {
  notify({ message, type: 'success', durationMs })
}

export function notifyError(message: string, durationMs = 3200) {
  notify({ message, type: 'error', durationMs })
}

export function notifyInfo(message: string, durationMs = 2200) {
  notify({ message, type: 'info', durationMs })
}

export function getToastEventName() {
  return TOAST_EVENT
}
