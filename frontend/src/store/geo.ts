import { useSyncExternalStore } from 'react'
import { haversine, ALMATY_CENTER } from '@/lib/geo'

// Местоположение пользователя. Разрешение спрашиваем сразу при входе на
// сайт (initGeolocation в main.tsx); если его уже запретили — не донимаем.
// Карта показывает точку «Вы здесь» и сама строит маршрут от неё.

export type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable' | 'error'

export interface GeoPosition {
  lat: number
  lng: number
  /** Точность, метры. */
  accuracy: number
  at: number
}

export interface GeoState {
  status: GeoStatus
  position: GeoPosition | null
}

/** Дальше этого от центра Алматы — считаем, что человек не в городе. */
export const ALMATY_RADIUS_M = 45_000

let state: GeoState = { status: 'idle', position: null }
const listeners = new Set<() => void>()

function set(next: Partial<GeoState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

const OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }

function onPosition(p: GeolocationPosition) {
  set({
    status: 'granted',
    position: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp },
  })
}

function onError(e: GeolocationPositionError) {
  set({ status: e.code === e.PERMISSION_DENIED ? 'denied' : 'error' })
}

export function isInAlmaty(p: { lat: number; lng: number } | null): boolean {
  return Boolean(p) && haversine(p!, ALMATY_CENTER) <= ALMATY_RADIUS_M
}

/** Один запрос координат. Первый вызов показывает системный вопрос о доступе. */
export function requestLocation(): Promise<GeoPosition | null> {
  if (!('geolocation' in navigator)) {
    set({ status: 'unavailable' })
    return Promise.resolve(null)
  }
  if (state.status !== 'granted') set({ status: 'locating' })
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onPosition(p)
        resolve(state.position)
      },
      (e) => {
        onError(e)
        resolve(null)
      },
      OPTIONS,
    )
  })
}

/** Следить за перемещением, пока открыта карта. Возвращает функцию остановки. */
export function watchLocation(): () => void {
  if (!('geolocation' in navigator) || state.status === 'denied') return () => undefined
  const id = navigator.geolocation.watchPosition(onPosition, onError, OPTIONS)
  return () => navigator.geolocation.clearWatch(id)
}

let started = false

/** При входе на сайт: сразу спросить доступ к геолокации (если его не запретили раньше). */
export async function initGeolocation(): Promise<void> {
  if (started) return
  started = true
  if (!('geolocation' in navigator)) {
    set({ status: 'unavailable' })
    return
  }
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
    if (perm) {
      perm.onchange = () => {
        if (perm.state === 'granted') void requestLocation()
        if (perm.state === 'denied') set({ status: 'denied' })
      }
      if (perm.state === 'denied') {
        set({ status: 'denied' })
        return
      }
    }
  } catch {
    /* Permissions API нет (старый Safari) — просто спрашиваем */
  }
  void requestLocation()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getState = () => state

export function useGeo(): GeoState {
  return useSyncExternalStore(subscribe, getState, getState)
}
