import { useSyncExternalStore } from 'react'

// «Установить на телефон»: ловим beforeinstallprompt как можно раньше
// (модуль импортируется в main.tsx), а iOS Safari получает инструкцию.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export type InstallMode = 'prompt' | 'ios' | 'installed' | 'unavailable'

function getMode(): InstallMode {
  if (typeof window === 'undefined') return 'unavailable'
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return 'installed'
  if (deferred) return 'prompt'
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 'ios'
  return 'unavailable'
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, getMode, () => 'unavailable' as const)
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice.catch(() => undefined)
  deferred = null
  emit()
}
