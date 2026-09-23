import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { AssemblyPoint, House } from '@/api/types'
import type { RankedPoint } from '@/lib/geo'
import { ALMATY_CENTER } from '@/lib/geo'

const houseIcon = L.divIcon({
  className: 'house-marker',
  html: '<div class="ring"></div><div class="dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function apIcon(isNearest: boolean) {
  const size = isNearest ? 20 : 14
  return L.divIcon({
    className: 'ap-icon',
    html: `<div class="ap-marker ${isNearest ? 'nearest' : ''}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** Автоподгон карты под дом и ближайший пункт. */
function FitBounds({ house, nearest }: { house: House | null; nearest: RankedPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (house && nearest) {
      const bounds = L.latLngBounds([
        [house.lat, house.lon],
        [nearest.point.lat, nearest.point.lon],
      ])
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15 })
    } else if (house) {
      map.setView([house.lat, house.lon], 15)
    }
  }, [house, nearest, map])
  return null
}

interface Props {
  points: AssemblyPoint[]
  house: House | null
  nearest: RankedPoint | null
  showRoute: boolean
}

export function MapView({ points, house, nearest, showRoute }: Props) {
  return (
    <MapContainer
      center={[ALMATY_CENTER.lat, ALMATY_CENTER.lon]}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      {/* Тайлы TomTom Maps (Map Display API); в CSS приглушаются под светлый минимализм. */}
      <TileLayer
        url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${
          import.meta.env.VITE_TOMTOM_KEY as string
        }`}
        maxZoom={19}
        attribution='&copy; <a href="https://www.tomtom.com">TomTom</a>'
      />

      {points.map((p) => {
        const isNearest = nearest?.point.id === p.id
        const meta = [
          p.district ? `${p.district} р-н` : null,
          p.capacity ? `~${p.capacity.toLocaleString('ru-RU')} чел.` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <Marker key={p.id} position={[p.lat, p.lon]} icon={apIcon(isNearest)}>
            <Popup>
              <strong>{p.name}</strong>
              {meta && (
                <>
                  <br />
                  {meta}
                </>
              )}
            </Popup>
          </Marker>
        )
      })}

      {house && (
        <Marker position={[house.lat, house.lon]} icon={houseIcon}>
          <Popup>
            <strong>{house.address}</strong>
          </Popup>
        </Marker>
      )}

      {showRoute && house && nearest && (
        <Polyline
          positions={[
            [house.lat, house.lon],
            [nearest.point.lat, nearest.point.lon],
          ]}
          pathOptions={{ color: '#3B6BFF', weight: 4, opacity: 0.85, dashArray: '2 10', lineCap: 'round' }}
        />
      )}

      <FitBounds house={house} nearest={nearest} />
    </MapContainer>
  )
}
