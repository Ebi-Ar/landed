import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { BatchCard } from '@/components/BatchCard'
import { ChangeText } from '@/components/FairBadge'
import { PendingNote } from '@/components/PendingNote'
import { Sparkline } from '@/components/Sparkline'
import { Switch } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useBlankLabelCount, useCatalog, usePriceIndex, useSellerBatches, useSellerOrders, useSellerProducts } from '@/lib/queries'
import { useUpdatePin } from '@/lib/seller'
import { useToast } from '@/lib/toast'
import { firstName, hereNowText, money, pinKind } from '@/lib/format'

/** Seller "Today": Available now switch, stats, fair price card, live batches. */
export default function Today() {
  const { seller, location, isApprovedSeller } = useAuth()
  const cat = useCatalog()
  const { summary } = usePriceIndex()
  const orders = useSellerOrders(seller?.id)
  const batches = useSellerBatches(seller?.id)
  const labels = useBlankLabelCount(seller?.id)
  const mine = useSellerProducts(seller?.id)
  const pin = useUpdatePin()
  const toast = useToast()
  const [prod, setProd] = useState<string | null>(null)

  const products = useMemo(() => (mine.data ?? []).map((x) => x.product_id).sort((a, b) => (cat.productBySlug[a]?.sort ?? 0) - (cat.productBySlug[b]?.sort ?? 0)), [mine.data, cat.productBySlug])
  const current = prod && products.includes(prod) ? prod : products[0]
  const s = current ? summary?.[current] : undefined
  const live = (batches.data ?? []).filter((b) => b.status === 'live')
  const held = (batches.data ?? []).filter((b) => b.status === 'held')
  const newOrders = (orders.data ?? []).filter((o) => o.status === 'ordered').length
  const kind = location ? pinKind(location) : 'pickup'
  const avail = pin.isPending && pin.variables?.available_now !== undefined ? pin.variables.available_now : Boolean(location?.available_now)

  if (!seller) return null
  return (
    <>
      <div>
        <h1>Bonjour, {firstName(seller.display_name)}</h1>
        <p className="sub">
          {seller.business_name}
          {location ? ` · ${location.area_label}` : ''}
        </p>
      </div>
      {!isApprovedSeller && <PendingNote status={seller.status} />}

      {location && (
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <b>{hereNowText(kind)}</b>
              <div className="small">{avail ? 'Buyers see you as open on the map' : 'Switch on when you’re there, so buyers know they can come'}</div>
            </div>
            <Switch
              on={avail}
              label={hereNowText(kind)}
              onChange={(v) =>
                pin.mutate({ available_now: v }, { onSuccess: () => toast(v ? 'You’re showing as open on the map' : 'You’re showing as not there') })
              }
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Link to="/sell/orders" className="card gap-0.5! p-2.5! text-inherit no-underline">
          <span className="small">New orders</span>
          <span className="stat text-[22px]!" style={{ color: newOrders ? 'var(--buoy)' : undefined }}>
            {newOrders}
          </span>
        </Link>
        <div className="card gap-0.5! p-2.5!">
          <span className="small">Live batches</span>
          <span className="stat text-[22px]!">{live.length}</span>
        </div>
        <div className="card gap-0.5! p-2.5!">
          <span className="small">Labels left</span>
          <span className="stat text-[22px]!">{labels.data ?? '–'}</span>
        </div>
      </div>

      {products.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h2>Fair prices today</h2>
            <Link className="link text-[13px]!" to="/sell/prices">
              All prices →
            </Link>
          </div>
          <div className="chips" role="group" aria-label="Your products">
            {products.map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={current === k} onClick={() => setProd(k)}>
                {cat.productBySlug[k]?.short_name ?? k}
              </button>
            ))}
          </div>
          {s ? (
            <Link to={`/sell/prices/${s.product.slug}`} className="flex flex-col gap-1.5 text-inherit no-underline">
              <div className="flex items-center justify-between">
                <span className="small">{s.product.name}, near you</span>
                <ChangeText change={s.change} />
              </div>
              <div className="stat">
                {money(s.low)} – {money(s.high)}
                <span className="small font-sans! font-medium!"> /{s.product.unit}</span>
              </div>
              <Sparkline values={s.history} />
              <span className="small">
                Based on {s.sales} sales and {s.reports} price reports this week · Tap for the 30-day chart
              </span>
            </Link>
          ) : (
            <p className="sub">No price data for this product yet.</p>
          )}
          <span className="small">
            Want to check something you don’t sell? Open <b>All prices</b> and pick <b>All products</b>.
          </span>
        </div>
      )}

      {isApprovedSeller && (
        <Link to="/sell/add" className="btn buoy">
          <Tag /> Add a batch
        </Link>
      )}

      {held.length > 0 && (
        <div className="alert warn">
          <span className="font-bold">!</span>
          <div>
            {held.length} batch{held.length > 1 ? 'es are' : ' is'} waiting for a review by the Landed team and not on the map yet.
          </div>
        </div>
      )}

      <h2>Live now</h2>
      <div className="flex flex-col gap-2.5">
        {live.map((b) => {
          const p = cat.productBySlug[b.product_id]
          return p ? <BatchCard key={b.id} batch={b} product={p} seller={cat.sellerById[b.seller_id]} distance={null} price={summary?.[p.slug]} /> : null
        })}
        {!live.length && <p className="sub">Nothing live yet. Add a batch to show up on the map.</p>}
      </div>
    </>
  )
}
