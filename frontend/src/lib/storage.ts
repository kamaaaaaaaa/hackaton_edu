// Безопасная обёртка над localStorage: всё в try/catch, чтобы приложение
// работало в приватном окне и при заблокированном хранилище.

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* приватный режим / переполнение — тихо игнорируем */
  }
}

export const STORAGE_KEYS = {
  family: 'gkt.family.v1',
  meetingPoint: 'gkt.family.meetingPoint.v1',
  checklist: 'gkt.checklist.v1',
  lang: 'gkt.lang.v1',
  house: 'gkt.house.lastSelected.v1',
  groupCode: 'gkt.family.groupCode.v1',
  myMemberId: 'gkt.family.myMemberId.v1',
  myToken: 'gkt.family.myToken.v1',
  authToken: 'gkt.auth.token.v1',
  /** Какому пользователю сейчас принадлежат данные семьи в этом браузере —
   *  чтобы при входе под другим аккаунтом не унаследовать чужую семью. */
  familyBoundUserId: 'gkt.family.boundUserId.v1',
  plan: 'gkt.plan.v1',
  /** Семья в демо-режиме (сервер недоступен) — только на этом устройстве. */
  familyLocal: 'gkt.family.local.v1',
  drillBest: 'gkt.drill.best.v1',
} as const
