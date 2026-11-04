import { Anchor, Clock, MapPin, Navigation, Store, Warehouse } from 'lucide-react'
import { BatchCard } from './BatchCard'
import { CallBox } from './CallBox'
import { Alert } from './ui'
import { useBuyerLocation } from '@/lib/location'
import { useCatalog, useLiveBatches, usePriceIndex } from '@/lib/queries'
import { FAR_KM } from '@/lib/geo'
import { hereNowText, initials, kmText, pinColor, pinKind, pinSoft, pinWord, visitNote } from '@/lib/format'
import type { PinKind } from '@/lib/types'

export function directionsHref(lat: number, lng: number) {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  return ios ? `https://maps.apple.com/?daddr=${lat},${lng}` : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

const KIND_ICON: Record<PinKind, typeof Anchor> = { wharf: Anchor, farm: Warehouse, pickup: MapPin, market: Store }

/** What a buyer sees after tapping a pin: seller or market details, Call, what's for sale, Directions. */
export function PinSheet({ id, onPick }: { id: string; onPick: (id: string) => void }) {
  const cat = useCatalog()
  const loc = useBuyerLocation()
  const batches = useLiveBatches()
  const { summary } = usePriceIndex()

  if (id.startsWith('m:')) {
    const m = cat.marketById[id.slice(2)]
    if (!m) return <p className="sub">This market isn’t on Landed any more.</p>
    const sellers = cat.sellers.filter((s) => s.market_ids.includes(m.id))
    return (
      <>
        <span className="badge plum">
          <Store /> Market
        </span>
        <div>
          <h1>{m.name}</h1>
          <p className="sub">
            {m.place} · {kmText(loc.distanceTo(m))}
          </p>
        </div>
        <div className="small flex items-center gap-1.5">
          <Clock className="size-4" /> {m.days_text}
        </div>
        <h3>Sellers you’ll find here</h3>
        <div className="flex flex-col gap-2.5">
          {sellers.map((s) => (
            <button key={s.seller_id} className="lock solid" onClick={() => onPick(s.seller_id)}>
              <div className={`avatar ${s.kind === 'farmer' ? 'land' : ''} size-[38px]! text-[13px]!`}>{initials(s.display_name)}</div>
              <div className="flex min-w-0 flex-col">
                <span className="name">{s.display_name}</span>
                <span className="small">{s.product_ids.map((p) => cat.productBySlug[p]?.short_name ?? p).join(', ')}</span>
              </div>
            </button>
          ))}
          {!sellers.length && <p className="sub">No sellers have listed this market yet.</p>}
        </div>
        <a className="btn alt" href={directionsHref(m.lat, m.lng)} target="_blank" rel="noreferrer">
          <Navigation /> Directions
        </a>
      </>
    )
  }

  const s = cat.sellerById[id]
  if (!s) return <p className="sub">This seller isn’t on the map right now.</p>
  const kind = pinKind(s)
  const Icon = KIND_ICON[kind]
  const d = loc.distanceTo(s)
  const items = (batches.data ?? []).filter((b) => b.seller_id === s.seller_id)
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <span className="badge" style={{ background: pinSoft(kind), color: pinColor(kind) }}>
          <Icon /> {pinWord(kind)}
        </span>
        {s.available_now ? <span className="badge">{hereNowText(kind)}</span> : <span className="badge soon">Not there right now</span>}
      </div>
      <div>
        <h1>{s.display_name}</h1>
        <p className="sub">
          {s.business_name}
          {s.verified_note ? ` · ${s.verified_note}` : ''}
        </p>
      </div>
      <div className="card gap-1.5! p-3!">
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-[18px] flex-none text-muted" />
          <div>
            <b>{s.place_name}</b>
            <div className="small">
              {s.area_label} · {kmText(d)}
            </div>
          </div>
        </div>
        <div className="small">{visitNote(kind)}</div>
        {s.hours_text && (
          <div className="small flex items-center gap-1.5">
            <Clock className="size-4 flex-none" /> {s.hours_text}
          </div>
        )}
      </div>
      {d > FAR_KM && (
        <Alert tone="warn">
          This seller is {Math.round(d)} km from {loc.label}, which may be too far for a pickup trip.
        </Alert>
      )}
      <CallBox phone={s.phone} big />
      <h3>Available now</h3>
      <div className="flex flex-col gap-2.5">
        {items.map((b) => {
          const p = cat.productBySlug[b.product_id]
          return p ? <BatchCard key={b.id} batch={b} product={p} seller={s} distance={d} price={summary?.[p.slug]} /> : null
        })}
        {!items.length && <p className="sub">Nothing listed right now.</p>}
      </div>
      <a className="btn alt" href={directionsHref(s.lat, s.lng)} target="_blank" rel="noreferrer">
        <Navigation /> Directions
      </a>
    </>
  )
}
