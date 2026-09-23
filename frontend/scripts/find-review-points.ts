/**
 * Кандидаты в OpenStreetMap для пунктов с needsReview — node scripts/find-review-points.ts
 *
 * Для каждого пункта, который геокодер не подтвердил, ищем в OSM объект с тем же
 * номером школы / названием вуза или стадиона и печатаем его теги (адрес, район).
 * Скрипт ничего не записывает: координаты переносятся в assemblyPoints.json
 * вручную и только при совпадении адреса в тегах объекта OSM.
 */
import { readFileSync } from 'node:fs'
import { request } from 'node:https'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const UA = 'gotov-k-tolchku/0.2 (hackathon MVP; checking official points)'

interface Point {
  id: string
  district: string
  name: string
  address: string
  type: string
  needsReview: boolean
}

function post(body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(
      new URL('https://overpass-api.de/api/interpreter'),
      { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' } },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (c: string) => (data += c))
        res.on('end', () => (res.statusCode === 200 ? resolve(data) : reject(new Error(`HTTP ${res.statusCode}`))))
      },
    )
    req.on('error', reject)
    req.setTimeout(90000, () => req.destroy(new Error('timeout')))
    req.write(body)
    req.end()
  })
}

async function overpass(q: string) {
  for (let i = 1; i <= 5; i++) {
    try {
      return (JSON.parse(await post(`data=${encodeURIComponent(q)}`)) as {
        elements: { type: string; id: number; center?: { lat: number; lon: number }; lat?: number; lon?: number; tags: Record<string, string> }[]
      }).elements
    } catch (e) {
      console.log(`  Overpass: ${(e as Error).message}, повтор ${i}`)
      await new Promise((r) => setTimeout(r, 4000 * i))
    }
  }
  return []
}

/** Регулярка для названия в OSM по названию пункта из распоряжения. */
function pattern(p: Point): { tag: string; re: string } {
  const num = p.name.match(/№\s*(\d+)/)?.[1]
  if (num) return { tag: '"amenity"="school"', re: `(^|[^0-9])${num}([^0-9]|$)` }
  if (/Динамо/.test(p.name)) return { tag: '"leisure"="stadium"', re: 'Динамо|Dinamo' }
  if (/Халык/.test(p.name)) return { tag: '"leisure"', re: 'Халык|Halyk' }
  if (/аль-Фараби/.test(p.name)) return { tag: '"amenity"="university"', re: 'аль-Фараби|әл-Фараби|al-Farabi' }
  if (/Асфендиярова/.test(p.name)) return { tag: '"amenity"', re: 'Асфендиярова|Asfendiyarov' }
  if (/Абылай хана/.test(p.name)) return { tag: '"amenity"="university"', re: 'Абылай хан|Ablai Khan|Абылай хана' }
  if (/Даукеева/.test(p.name)) return { tag: '"amenity"="university"', re: 'Даукеева|Даукеев|энергетики|АУЭС' }
  return { tag: '"amenity"', re: p.name }
}

const points = (JSON.parse(readFileSync(`${ROOT}src/data/assemblyPoints.json`, 'utf8')) as Point[]).filter((p) => p.needsReview)

for (const p of points) {
  const { tag, re } = pattern(p)
  const q = `[out:json][timeout:60][bbox:43.1,76.7,43.42,77.2];nwr[${tag}]["name"~"${re}",i];out tags center;`
  const found = await overpass(q)
  console.log(`\n${p.id} · ${p.name} · ${p.address} · ${p.district}`)
  for (const e of found.slice(0, 8)) {
    const c = e.center ?? { lat: e.lat, lon: e.lon }
    const t = e.tags
    console.log(
      `  ${e.type}/${e.id} ${c.lat?.toFixed(5)},${c.lon?.toFixed(5)} | ${t.name} | addr: ${t['addr:street'] ?? '—'} ${t['addr:housenumber'] ?? ''} | ${t['addr:suburb'] ?? t['addr:district'] ?? ''}`,
    )
  }
  if (!found.length) console.log('  — нет кандидатов')
  await new Promise((r) => setTimeout(r, 1500))
}
