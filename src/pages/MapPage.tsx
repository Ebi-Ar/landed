import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LocationPicker } from '@/components/LocationPicker'
import { PinSheet } from '@/components/PinSheet'
import { Sheet } from '@/components/Sheet'
import { Chips, ErrorNote, PageTitle, SampleNote } from '@/components/ui'
import type { MapPin } from '@/components/SellerMap'
import { useBuyerLocation } from '@/lib/location'
import { useCatalog } from '@/lib/queries'
import { pinKind, pinWord } from '@/lib/format'

const SellerMap = lazy(() => import('@/components/SellerMap'))

type Filter = 'all' | 'open' | 'sea' | 'land' | 'markets'

export default function MapPage() {
  const cat = useCatalog()
  const loc = useBuyerLocation()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const selected = params.get('pin')

  const select = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params)
      if (id) next.set('pin', id)
      else next.delete('pin')
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const pins = useMemo<MapPin[]>(() => {
    const list: MapPin[] = []
    if (filter !== 'markets')
      for (const s of cat.sellers) {
        if (filter === 'sea' && s.kind === 'farmer') continue
        if (filter === 'land' && s.kind === 'fisher') continue
        if (filter === 'open' && !s.available_now) continue
        const k = pinKind(s)
        list.push({
          id: s.seller_id,
          kind: k,
          lat: s.lat,
          lng: s.lng,
          open: s.available_now,
          label: `${s.display_name}, ${pinWord(k)}, ${s.area_label}, ${s.available_now ? 'there now' : 'not there now'}`,
        })
      }
    if (filter === 'all' || filter === 'markets')
      for (const m of cat.markets) list.push({ id: 'm:' + m.id, kind: 'market', lat: m.lat, lng: m.lng, open: false, label: `${m.name}, ${m.days_text}` })
    return list
  }, [cat.sellers, cat.markets, filter])

  return (
    <>
      <PageTitle title="Local food near you" sub="Farms, wharves, pickup spots and markets in southeast New Brunswick." />
      <LocationPicker />
      <Chips<Filter>
        label="Filter the map"
        value={filter}
        onChange={setFilter}
        options={[
          ['all', 'All'],
          ['open', 'Open now'],
          ['sea', 'From the sea'],
          ['land', 'From the land'],
          ['markets', 'Markets'],
        ]}
      />
      {cat.error ? <ErrorNote error={cat.error} /> : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <Suspense fallback={<div className="h-[min(62dvh,560px)] animate-pulse bg-surface-2" />}>
          <SellerMap pins={pins} you={loc.point} selectedId={selected} focusId={params.get('focus')} onSelect={select} />
        </Suspense>
        <div className="legend" aria-label="Map legend">
          <span>
            <i style={{ background: 'var(--kelp)' }} />
            Farm
          </span>
          <span>
            <i style={{ background: 'var(--tide)' }} />
            Wharf
          </span>
          <span>
            <i style={{ background: 'var(--buoy)' }} />
            Pickup spot
          </span>
          <span>
            <i style={{ background: 'var(--plum)' }} />
            Market
          </span>
          <span>
            <i style={{ background: 'var(--surface)', border: '2px solid var(--muted)' }} />
            Filled = there now · Outline = not there now
          </span>
        </div>
      </div>
      <SampleNote>Tap a pin to see what’s available, call the seller or order for pickup. Sample sellers until the pilot.</SampleNote>
      <Sheet open={Boolean(selected)} onClose={() => select(null)} label="Seller details">
        {selected && <PinSheet id={selected} onPick={(id) => select(id)} />}
      </Sheet>
    </>
  )
}
