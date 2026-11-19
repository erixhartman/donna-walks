import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export interface MapMarker {
  lat: number
  lng: number
  color: string
  radius?: number
  label?: string
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  const key = coords.length ? `${coords.length}:${coords[0]}:${coords[coords.length - 1]}` : ''
  useEffect(() => {
    if (!coords.length) return
    if (coords.length === 1) map.setView(coords[0], 17)
    else map.fitBounds(L.latLngBounds(coords), { padding: [24, 24], maxZoom: 17 })
  }, [key, map])
  return null
}

function Follow({ at }: { at?: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (at) map.panTo(at, { animate: true })
  }, [at, map])
  return null
}

export function MapView({
  track = [],
  markers = [],
  tall,
  follow,
}: {
  track?: [number, number][]
  markers?: MapMarker[]
  tall?: boolean
  follow?: boolean
}) {
  const all: [number, number][] = [...track, ...markers.map((m) => [m.lat, m.lng] as [number, number])]
  const surface = cssVar('--md-surface-container-low') || '#fff'
  if (!all.length) {
    return (
      <div className={`map ${tall ? 'tall' : ''}`} style={{ display: 'grid', placeItems: 'center' }}>
        <span className="body-m muted">Waiting for location…</span>
      </div>
    )
  }
  return (
    <MapContainer
      className={`map ${tall ? 'tall' : ''}`}
      center={all[0]}
      zoom={16}
      zoomControl={false}
      attributionControl
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {track.length > 1 && <Polyline positions={track} pathOptions={{ color: cssVar('--md-primary'), weight: 4, opacity: 0.9 }} />}
      {markers.map((m, i) => (
        <CircleMarker
          key={i}
          center={[m.lat, m.lng]}
          radius={m.radius ?? 8}
          pathOptions={{ color: surface, weight: 2, fillColor: m.color, fillOpacity: 0.85 }}
        >
          {m.label && <Tooltip>{m.label}</Tooltip>}
        </CircleMarker>
      ))}
      {follow ? <Follow at={track[track.length - 1]} /> : <FitBounds coords={all} />}
    </MapContainer>
  )
}
