# API-контракт фронтенда «Готов к толчку»

Какие эндпоинты и форматы ждёт фронтенд от Django-бэкенда. TypeScript-типы —
источник истины: [`src/api/types.ts`](src/api/types.ts), [`src/api/groups.ts`](src/api/groups.ts),
[`src/api/auth.ts`](src/api/auth.ts), [`src/api/houses.ts`](src/api/houses.ts).

## Подключение

- Базовый адрес — **`/api`** (переменная `VITE_API_URL`, по умолчанию `/api`).
  На Render Django отдаёт сайт и API с одного домена, поэтому CORS не нужен.
- При `npm run dev` / `npm run preview` Vite проксирует `/api` на
  `VITE_DEV_API_PROXY` (по умолчанию `https://hackathon-base.onrender.com`,
  для локального Django — `http://127.0.0.1:8000`).
- Ответы — JSON. Ошибка — любой статус `4xx/5xx`, тело по возможности
  `{ "error": "Понятный текст" }`: фронтенд покажет этот текст пользователю.
- Запросы семьи ждут ответа до 70 секунд: бесплатный Render «просыпается».

## Что фронтенд делает без бэкенда

| Функция | Источник |
| --- | --- |
| Карта | OpenFreeMap (векторные тайлы OpenStreetMap) |
| Поиск адреса | дома из списка → Photon → Nominatim |
| Пешие маршруты | Valhalla (FOSSGIS), 5 ближайших пунктов, выбираем самый быстрый |
| Пункты приёма | `src/data/assemblyPoints.json` — распоряжение акима №123ө, 47 из 50 с координатами |
| Дома и ИИ-разбор | `src/data/demoHouses.json`, `src/data/houseAnalyses.json` |
| Данные о любом доме | Overpass API (OpenStreetMap) |

---

## Семья — нужны сейчас

Код семьи: 6 символов из алфавита `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Телефон
фронтенд присылает в виде `+77011234567` или пустой строкой.

### `POST /groups/create/`

```jsonc
// запрос
{ "name": "Айгерим", "phone": "+77011234567" }
// ответ 200/201
{
  "group": { "code": "K7M2QX" },
  "member": {
    "id": 12, "token": "…секрет участника…", "name": "Айгерим", "phone": "+77011234567",
    "isSelf": true, "status": "unknown", "updatedAt": "2026-09-23T15:02:00.000Z"
  }
}
```

### `POST /groups/join/`

Запрос: `{ "code": "K7M2QX", "name": "Ерлан", "phone": "" }`. Ответ — как у create.
Если группы нет — `404 { "error": "…" }`.

### `GET /groups/{code}/members/`

```jsonc
{ "group": { "code": "K7M2QX" }, "members": [ { "id": 12, "name": "Айгерим", "phone": "…", "isSelf": false, "status": "safe", "updatedAt": "…" } ] }
```

Фронтенд опрашивает этот адрес каждые 6 секунд, пока открыт экран «Семья».

### `PATCH /groups/{code}/members/{id}/`

Запрос: `{ "token": "…", "status": "safe" | "no_contact" | "unknown" }`. Ответ — участник.

> **Сейчас на сервере `GET /api/groups/ZZZZZZ/members/` отвечает 500**, хотя
> для несуществующего кода должен быть 404. Похоже, на Render не применены
> миграции приложения `groups`: выполните `python manage.py migrate` и посмотрите
> логи. Пока сервер отвечает 5xx, фронтенд создаёт семью в демо-режиме на
> устройстве и честно пишет об этом.

## Аккаунты и аналитика — уже подключены

| Метод и путь | Тело | Ответ |
| --- | --- | --- |
| `POST /auth/register/` | `{ username, email, password }` | `{ user, token }` |
| `POST /auth/login/` | `{ username, password }` | `{ user, token }` |
| `POST /auth/logout/` | заголовок `Authorization: Token …` | `{ ok: true }` |
| `GET /auth/me/` | заголовок `Authorization: Token …` | `{ user }` |
| `POST /analytics/track/` | `{ event, meta? }` | любой `2xx` |
| `GET /analytics/summary/` | — | `{ totalEvents, byEventType, last24h, generatedAt }` |

События аналитики: `house_checked`, `route_built`, `group_created`, `group_joined`, `status_safe`.

---

## На будущее

### `POST /ai/house-analysis/` — ИИ-разбор любого дома

Сейчас разбор подготовлен заранее для 14 домов из списка. Чтобы он был у
любого адреса, бэкенд вызывает Claude API (ключ хранится только на сервере)
и возвращает тот же формат, что в `src/data/houseAnalyses.json`:

```jsonc
// запрос
{
  "address": "улица Сатпаева, 24",
  "year": 2002, "floors": 10, "material": null, "series": null,
  "risk": { "level": "mid", "score": 2 },
  "route": { "pointName": "Казахская академия спорта и туризма", "timeSec": 840, "lengthM": 1128 }
}
// ответ 200
{
  "summary": "2–3 предложения: что значат эти данные",
  "actions": ["что сделать 1", "что сделать 2", "что сделать 3"],
  "basis": ["Год постройки: 2002", "Этажность: 10"],
  "model": "claude-…",
  "generatedAt": "2026-09-23"
}
```

Правила для промпта: опираться только на присланные поля, не выдумывать
сейсмостойкость, год и материал, в конце не ставить диагноз. Фронтенд
всегда подписывает ответ как «ИИ-разбор, не официальное заключение».

### `GET /assembly-points/`

Когда список пунктов будет храниться в базе — формат как в
`src/data/assemblyPoints.json` (`AssemblyPoint` в `types.ts`): `id`, `district`,
`name`, `address`, `lat`/`lng` (или `null`), `type`, `source`, `needsReview`,
`geocodeMethod`, `geocodeNote`. Пункты с `needsReview: true` на карте не рисуются.

### `GET /alert/active/`

Активная тревога (`Alert` из `types.ts`) или `null`. Вызывается, только если
`VITE_USE_MOCKS=false`; в демо тревогу включает кнопка «Тревога · демо».
