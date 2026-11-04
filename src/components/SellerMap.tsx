import { useEffect, useRef, useState } from 'react'
import { AttributionControl, LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl, type MapOptions } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { pinColor } from '@/lib/format'
import type { LatLng } from '@/lib/geo'
import type { PinKind } from '@/lib/types'

// MapLibre works out its worker's address at runtime, which a bundler can't see,
// so hand it the file Vite ships.
setWorkerUrl(workerUrl)

export interface MapPin {
  id: string
  kind: PinKind
  lat: number
  lng: number
  open: boolean
  label: string
}

type StyleSpec = Exclude<MapOptions['style'], string | undefined>
type Layer = StyleSpec['layers'][number]
type Scheme = 'light' | 'dark'

/* ------------------------------------------------------------------ basemap
   OpenFreeMap's Positron style (free, no key), recoloured to the Landed tokens
   in index.css and stripped of anything a buyer doesn't need. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

const PALETTE: Record<Scheme, Record<string, string>> = {
  light: {
    land: '#f1f4f1',
    residential: '#e9eeeb',
    park: '#e0ece3',
    wood: '#e2ece4',
    water: '#cde3ea',
    waterLine: '#b6d4dd',
    building: '#e5eae7',
    buildingLine: '#d9e0dd',
    road: '#ffffff',
    roadCasing: '#d6dfe1',
    roadMinor: '#e1e8e8',
    roadPath: '#e7ecec',
    roadSubtle: 'rgba(170, 190, 195, 0.55)',
    boundary: '#b4c4c8',
    label: '#0f2a33',
    labelMinor: '#5a7078',
    labelHalo: 'rgba(241, 244, 241, 0.92)',
    waterLabel: '#3b7b8f',
    roadLabel: '#71858b',
  },
  dark: {
    land: '#13272e',
    residential: '#162b32',
    park: '#15302a',
    wood: '#152e29',
    water: '#0a1c23',
    waterLine: '#0d2630',
    building: '#1a3038',
    buildingLine: '#21383f',
    road: '#2c444c',
    roadCasing: '#1c333a',
    roadMinor: '#223a42',
    roadPath: '#1e353c',
    roadSubtle: 'rgba(70, 98, 106, 0.6)',
    boundary: '#3c585f',
    label: '#e7f1f2',
    labelMinor: '#93aab0',
    labelHalo: 'rgba(19, 39, 46, 0.92)',
    waterLabel: '#5fb7d0',
    roadLabel: '#7f979e',
  },
}

const HIDE = /^(railway|aeroway|airport$|boundary_disputed$|highway-shield|road_shield|highway-name-path$)/

function paintFor(id: string, c: Record<string, string>): Record<string, unknown> | undefined {
  const text = (color: string, halo = 1.3) => ({ 'text-color': color, 'text-halo-color': c.labelHalo, 'text-halo-width': halo, 'text-halo-blur': 0.4 })
  switch (id) {
    case 'background':
      return { 'background-color': c.land }
    case 'park':
      return { 'fill-color': c.park }
    case 'water':
      return { 'fill-color': c.water }
    case 'landcover_ice_shelf':
    case 'landcover_glacier':
    case 'road_area_pier':
      return { 'fill-color': c.land }
    case 'road_pier':
      return { 'line-color': c.land }
    case 'landuse_residential':
      return { 'fill-color': c.residential }
    case 'landcover_wood':
      return { 'fill-color': c.wood }
    case 'waterway':
      return { 'line-color': c.waterLine }
    case 'building':
      return { 'fill-color': c.building, 'fill-outline-color': c.buildingLine }
    case 'highway_path':
      return { 'line-color': c.roadPath }
    case 'highway_minor':
      return { 'line-color': c.roadMinor }
    case 'highway_major_subtle':
    case 'highway_motorway_subtle':
      return { 'line-color': c.roadSubtle }
    case 'boundary_2':
    case 'boundary_3':
      return { 'line-color': c.boundary }
    case 'waterway_line_label':
    case 'water_name_point_label':
    case 'water_name_line_label':
      return text(c.waterLabel)
    case 'highway-name-minor':
    case 'highway-name-major':
      return text(c.roadLabel, 1.1)
    case 'label_other':
    case 'label_village':
      return text(c.labelMinor)
  }
  if (id.startsWith('label_')) return text(c.label, 1.5)
  if (id.includes('casing')) return { 'line-color': c.roadCasing }
  if (id.endsWith('_inner')) return { 'line-color': c.road }
  return undefined
}

function tint(base: StyleSpec, scheme: Scheme): StyleSpec {
  const c = PALETTE[scheme]
  const layers = base.layers
    .filter((l) => !HIDE.test(l.id))
    .map((l) => {
      const paint = paintFor(l.id, c)
      return paint ? ({ ...l, paint: { ...('paint' in l ? l.paint : {}), ...paint } } as Layer) : l
    })
  return { ...base, layers }
}

/** Just the land colour: shown while the basemap loads, or if it can't. */
const blank = (scheme: Scheme): StyleSpec => ({
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': PALETTE[scheme].land } }],
})

let positron: Promise<StyleSpec> | undefined
function loadPositron() {
  positron ??= fetch(STYLE_URL).then((r) => {
    if (!r.ok) throw new Error(`Map style ${r.status}`)
    return r.json() as Promise<StyleSpec>
  })
  positron.catch(() => (positron = undefined)) // try again next time
  return positron
}

/** Follows the system setting, with <html data-theme> as an override. */
function readScheme(): Scheme {
  const forced = document.documentElement.dataset.theme
  if (forced === 'light' || forced === 'dark') return forced
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
function useScheme() {
  const [scheme, setScheme] = useState(readScheme)
  useEffect(() => {
    const update = () => setScheme(readScheme())
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', update)
      mo.disconnect()
    }
  }, [])
  return scheme
}

/* ------------------------------------------------------------------ pins */
// Lucide paths for the pin icons (anchor, barn, map-pin, store).
const ICON: Record<PinKind, string> = {
  wharf: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13"/><path d="M5 13a7 7 0 0 0 14 0"/><path d="M8 10h8"/>',
  farm: '<path d="M3 21V10l9-6 9 6v11z"/><path d="M9 21v-6h6v6"/>',
  pickup: '<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  market: '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6z"/><path d="M10 20v-5h4v5"/>',
}

/** Filled pin = the seller is there now; outlined = not there now. */
function pinFace(p: MapPin, selected: boolean) {
  const c = pinColor(p.kind)
  const size = 40
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;
    background:${p.open ? c : 'var(--surface)'};border:3.5px solid ${c};box-sizing:border-box;
    box-shadow:${selected ? `0 0 0 8px color-mix(in srgb, ${c} 25%, transparent),` : ''}0 2px 6px rgba(15,42,51,.35)">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${p.open ? 'var(--surface)' : c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[p.kind]}</svg>
  </div>`
}

/** A click that isn't the end of a map drag that happened to start on the pin. */
function onTap(el: HTMLElement, fn: () => void) {
  let down: [number, number] | null = null
  el.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]))
  el.addEventListener('click', (e) => {
    const dragged = down && e.detail !== 0 && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6
    down = null
    e.stopPropagation()
    if (!dragged) fn()
  })
}

/* ------------------------------------------------------------------ map */
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
  const box = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [failed, setFailed] = useState(false)
  const [bare, setBare] = useState(false)
  const scheme = useScheme()
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>())
  const latest = useRef({ pins, you, onSelect })
  latest.current = { pins, you, onSelect }

  // Create the map once. WebGL can be missing or blocked, so fail softly.
  useEffect(() => {
    let m: MapLibreMap
    try {
      m = new MapLibreMap({
        container: box.current!,
        style: blank(readScheme()),
        center: [-64.75, 46.15],
        zoom: 9,
        minZoom: 3,
        maxZoom: 18,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      })
    } catch {
      setFailed(true)
      return
    }
    m.touchZoomRotate.disableRotation()
    m.keyboard.disableRotation()
    m.addControl(new NavigationControl({ showCompass: false }), 'top-left')
    m.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    setMap(m)
    const live = markers.current
    return () => {
      live.clear()
      m.remove()
      setMap(null)
    }
  }, [])

  // Basemap, recoloured for light or dark, and again when that changes.
  useEffect(() => {
    if (!map) return
    let current = true
    loadPositron()
      .then((base) => {
        if (!current) return
        // Diff only onto a finished style (a light/dark swap); otherwise MapLibre warns and rebuilds anyway.
        map.setStyle(tint(base, scheme), { diff: map.isStyleLoaded() === true })
        setBare(false)
        // MapLibre opens the compact credit until the first drag; start it folded into the ⓘ.
        map.once('idle', () => map.getContainer().querySelector('.maplibregl-compact')?.classList.remove('maplibregl-compact-show'))
      })
      .catch(() => {
        if (!current) return
        map.setStyle(blank(scheme))
        setBare(true)
      })
    return () => {
      current = false
    }
  }, [map, scheme])

  // Pins: update in place by id, so a selection change keeps keyboard focus.
  useEffect(() => {
    if (!map) return
    const live = markers.current
    const seen = new Set<string>()
    for (const p of pins) {
      seen.add(p.id)
      let m = live.get(p.id)
      if (!m) {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'landed-pin'
        const id = p.id
        onTap(el, () => latest.current.onSelect(id))
        m = { el, marker: new Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(map) }
        live.set(p.id, m)
      } else {
        m.marker.setLngLat([p.lng, p.lat])
      }
      const selected = p.id === selectedId
      m.el.setAttribute('aria-label', p.label)
      m.el.title = p.label
      m.el.innerHTML = pinFace(p, selected)
      m.el.style.zIndex = selected ? '3' : p.open ? '2' : '1'
    }
    for (const [id, m] of live) {
      if (seen.has(id)) continue
      m.marker.remove()
      live.delete(id)
    }
  }, [map, pins, selectedId])

  // "You": a dot with a soft halo and a label above it.
  useEffect(() => {
    if (!map) return
    const el = document.createElement('div')
    el.className = 'landed-you'
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', 'Your location')
    el.innerHTML = '<span class="landed-you-label" aria-hidden="true">You</span>'
    const m = new Marker({ element: el, anchor: 'center' }).setLngLat([you.lng, you.lat]).addTo(map)
    return () => {
      m.remove()
    }
  }, [map, you.lat, you.lng])

  // Frame the pins. Only refit when the set of pins changes, not on every refresh.
  const key = pins
    .map((p) => p.id)
    .sort()
    .join('|')
  const framed = useRef<MapLibreMap | null>(null) // the first frame jumps, later ones glide
  useEffect(() => {
    if (!map) return
    const { pins, you } = latest.current
    const animate = framed.current === map
    const focus = focusId ? pins.find((p) => p.id === focusId) : undefined
    if (focus) {
      map.easeTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.getZoom(), 11), animate })
      framed.current = map
      return
    }
    if (!pins.length) return
    const b = new LngLatBounds()
    for (const p of pins) b.extend([p.lng, p.lat])
    // Include the buyer if they're reasonably close, so "You" shows on the map.
    const near = pins.some((p) => Math.abs(p.lat - you.lat) < 1.2 && Math.abs(p.lng - you.lng) < 1.6)
    if (near) b.extend([you.lng, you.lat])
    map.fitBounds(b, { padding: 36, maxZoom: 12, animate })
    framed.current = map
  }, [map, key, focusId])

  if (failed)
    return (
      <div className="grid h-[min(62dvh,560px)] w-full place-items-center bg-surface-2 p-6 text-center text-[13.5px] text-muted">
        This device can’t show the map. The sellers are still listed in Fresh.
      </div>
    )

  return (
    <div className="relative h-[min(62dvh,560px)] w-full">
      {/* MapLibre's stylesheet makes this position: relative, so size it with h-full rather than inset-0. */}
      <div ref={box} className="h-full w-full" />
      {bare && (
        <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-muted">
          Couldn’t load the map. Check your connection.
        </p>
      )}
    </div>
  )
}
