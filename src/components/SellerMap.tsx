import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { pinColor } from '@/lib/format'
import type { LatLng } from '@/lib/geo'
import type { PinKind } from '@/lib/types'

export interface MapPin {
  id: string
  kind: PinKind
  lat: number
  lng: number
  open: boolean
  label: string
}

// Lucide paths for the pin icons (anchor, barn, map-pin, store).
const ICON: Record<PinKind, string> = {
  wharf: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13"/><path d="M5 13a7 7 0 0 0 14 0"/><path d="M8 10h8"/>',
  farm: '<path d="M3 21V10l9-6 9 6v11z"/><path d="M9 21v-6h6v6"/>',
  pickup: '<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  market: '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6z"/><path d="M10 20v-5h4v5"/>',
}

/** Filled pin = the seller is there now; outlined = not there now. */
function pinIcon(p: MapPin, selected: boolean) {
  const c = pinColor(p.kind)
  const size = 40
  return L.divIcon({
    className: 'landed-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;
      background:${p.open ? c : 'var(--surface)'};border:3.5px solid ${c};box-sizing:border-box;
      box-shadow:${selected ? `0 0 0 8px color-mix(in srgb, ${c} 25%, transparent),` : ''}0 2px 6px rgba(15,42,51,.35)">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${p.open ? 'var(--surface)' : c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${ICON[p.kind]}</svg>
    </div>`,
  })
}

function FitTo({ pins, you, focusId }: { pins: MapPin[]; you: LatLng; focusId?: string | null }) {
  const map = useMap()
  const key = pins.map((p) => p.id).sort().join('|')
  useEffect(() => {
    const focus = focusId ? pins.find((p) => p.id === focusId) : undefined
    if (focus) {
      map.setView([focus.lat, focus.lng], Math.max(map.getZoom(), 11), { animate: true })
      return
    }
    if (!pins.length) return
    const b = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]))
    // Include the buyer if they're reasonably close, so "You" shows on the map.
    const near = pins.some((p) => Math.abs(p.lat - you.lat) < 1.2 && Math.abs(p.lng - you.lng) < 1.6)
    if (near) b.extend([you.lat, you.lng])
    map.fitBounds(b, { padding: [36, 36], maxZoom: 12 })
    // Only refit when the set of pins changes, not on every refresh.
  }, [key, focusId]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function SellerMap({
  pins,
  you,
  selectedId,
  focusId,
  onSelect,
}: {
  pins: MapPin[]
  you: LatLng
  selectedId: string | null
  focusId?: string | null
  onSelect: (id: string) => void
}) {
  const icons = useMemo(() => new Map(pins.map((p) => [p.id, pinIcon(p, p.id === selectedId)])), [pins, selectedId])
  return (
    <MapContainer center={[46.15, -64.75]} zoom={9} scrollWheelZoom className="h-[min(62dvh,560px)] w-full" attributionControl>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={18}
      />
      <FitTo pins={pins} you={you} focusId={focusId} />
      <CircleMarker center={[you.lat, you.lng]} radius={14} pathOptions={{ stroke: false, fillColor: '#14627A', fillOpacity: 0.18 }} interactive={false} />
      <CircleMarker center={[you.lat, you.lng]} radius={7} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#14627A', fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -8]} permanent className="font-bold">
          You
        </Tooltip>
      </CircleMarker>
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={icons.get(p.id)!}
          title={p.label}
          alt={p.label}
          keyboard
          riseOnHover
          zIndexOffset={p.id === selectedId ? 1000 : p.open ? 100 : 0}
          eventHandlers={{ click: () => onSelect(p.id), keypress: (e) => (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ') && onSelect(p.id) }}
        />
      ))}
    </MapContainer>
  )
}
