/**
 * Пункты «на проверке» → координаты объектов OpenStreetMap — node scripts/apply-osm-objects.ts
 *
 * Для пунктов, чей адрес геокодер не подтвердил, scripts/find-review-points.ts
 * нашёл в OSM объекты с тем же номером школы / названием вуза, стадиона, арены.
 * Здесь каждый кандидат проверяется ещё раз: Nominatim по координатам объекта
 * должен вернуть тот же район города, что и в распоряжении акима. Совпало —
 * пункт получает координаты объекта (geocodeMethod: 'osm-object') и заметку
 * с источником. Не совпало — пункт остаётся на проверке.
 *
 * Номера школ в Алматы уникальны в пределах города, поэтому совпадение номера
 * и района — сильный признак. Адреса у этих объектов в OSM обычно нет — об этом
 * честно пишем в заметке.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { request } from 'node:https'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const FILE = `${ROOT}src/data/assemblyPoints.json`
const UA = 'gotov-k-tolchku/0.2 (hackathon MVP; checking official points)'

/** Кандидаты из find-review-points.ts (объект OSM и координаты его центра). */
const CANDIDATES: { id: string; osm: string; osmName: string; lat: number; lng: number }[] = [
  { id: 'alatau-02', osm: 'way/275446465', osmName: '№26 жалпы білім беретін мектеп', lat: 43.29775, lng: 76.8525 },
  { id: 'alatau-03', osm: 'way/1148885095', osmName: 'Лицей №166', lat: 43.25991, lng: 76.8722 },
  { id: 'alatau-04', osm: 'way/1120399117', osmName: 'лицей №169', lat: 43.29716, lng: 76.86131 },
  { id: 'almaly-01', osm: 'relation/3206884', osmName: 'Динамо Стадионы', lat: 43.24685, lng: 76.93619 },
  { id: 'auezov-04', osm: 'way/1329350303', osmName: '№173 Лицей', lat: 43.21178, lng: 76.84676 },
  { id: 'bostandyk-02', osm: 'way/360167896', osmName: 'Әл-Фараби атындағы Қазақ Ұлттық Университеті', lat: 43.22057, lng: 76.92288 },
  { id: 'zhetysu-01', osm: 'way/1149029871', osmName: 'Школа №57', lat: 43.28429, lng: 76.94089 },
  { id: 'medeu-06', osm: 'way/209199863', osmName: 'Мұз Сарайы «Halyk Arena» (Құлжа трактісі)', lat: 43.28758, lng: 76.99047 },
  { id: 'nauryzbay-01', osm: 'way/1149587511', osmName: 'Общеобразовательная школа №187', lat: 43.18682, lng: 76.82931 },
  { id: 'nauryzbay-02', osm: 'way/1149587510', osmName: 'Школа-гимназия №188', lat: 43.18623, lng: 76.82822 },
  { id: 'nauryzbay-04', osm: 'way/277597747', osmName: 'Школа №157', lat: 43.21899, lng: 76.80205 },
]

function get(url: URL): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (c: string) => (data += c))
      res.on('end', () => (res.statusCode === 200 ? resolve(data) : reject(new Error(`HTTP ${res.statusCode}`))))
    })
    req.on('error', reject)
    req.setTimeout(30000, () => req.destroy(new Error('timeout')))
    req.end()
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function districtAt(lat: number, lng: number): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '16')
  url.searchParams.set('accept-language', 'ru')
  for (let i = 1; i <= 4; i++) {
    try {
      const a = (JSON.parse(await get(url)) as { address?: Record<string, string> }).address
      return a?.city_district?.replace(/\s*район$/i, '') ?? null
    } catch (e) {
      console.log(`  Nominatim: ${(e as Error).message}, повтор ${i}`)
      await sleep(2500 * i)
    }
  }
  return null
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').slice(0, 5)

const points = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>[]
let applied = 0
for (const c of CANDIDATES) {
  const p = points.find((x) => x.id === c.id)
  if (!p) continue
  await sleep(1100) // политика Nominatim: не чаще 1 запроса в секунду
  const district = await districtAt(c.lat, c.lng)
  const ok = district !== null && norm(district) === norm(String(p.district))
  console.log(`${ok ? '✓' : '✗'} ${c.id} · ${p.name} · район по распоряжению: ${p.district}, по OSM: ${district ?? '—'}`)
  if (!ok) continue
  Object.assign(p, {
    lat: c.lat,
    lng: c.lng,
    needsReview: false,
    geocodeMethod: 'osm-object',
    geocodeProvider: 'openstreetmap',
    geocodeNote: `Координаты объекта OpenStreetMap «${c.osmName}» (${c.osm}): совпадают номер или название и район. Адрес у объекта в OSM не указан — сверьте на месте.`,
  })
  applied += 1
}
writeFileSync(FILE, `${JSON.stringify(points, null, 2)}\n`)
console.log(`\nПодтверждено по объектам OSM: ${applied} из ${CANDIDATES.length}`)
