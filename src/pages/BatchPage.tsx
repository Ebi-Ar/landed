import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Anchor, Check, MapPin, Store, Warehouse } from 'lucide-react'
import { CallBox } from '@/components/CallBox'
import { FairBadge } from '@/components/FairBadge'
import { ProductTile } from '@/components/ProductIcon'
import { Alert, BackLink, ErrorNote, Loading, SampleNote } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useBuyerLocation } from '@/lib/location'
import { useBatch, useCatalog, usePriceIndex } from '@/lib/queries'
import { errorMessage, photoUrl, supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { ageText, firstName, hereNowText, initials, kmText, money, pinKind, pinWord, qtyText, unitWord, whenText } from '@/lib/format'
import { cn } from '@/lib/cn'

export default function BatchPage() {
  const { batchId } = useParams()
  const batch = useBatch(batchId)
  const cat = useCatalog()
  const { summary } = usePriceIndex()
  const loc = useBuyerLocation()
  const auth = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [qty, setQty] = useState(1)
  const [pick, setPick] = useState('pin')

  const b = batch.data
  const p = b ? cat.productBySlug[b.product_id] : undefined
  const s = b ? cat.sellerById[b.seller_id] : undefined

  useEffect(() => {
    if (b && qty > Number(b.qty_left)) setQty(Math.max(1, Math.floor(Number(b.qty_left))))
  }, [b, qty])

  const order = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('place_order', { p_batch: b!.id, p_qty: qty, p_pickup: pick })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast(`Order sent to ${s ? firstName(s.display_name) : 'the seller'}. You’ll see updates here.`)
      navigate('/orders')
    },
  })

  if (batch.isLoading || cat.isLoading) return <Loading />
  if (batch.error) return <ErrorNote error={batch.error} />
  if (!b || !p)
    return (
      <>
        <BackLink />
        <Alert tone="info" title="This batch isn’t listed any more">
          It may have sold out. <Link to="/fresh" className="link">See what’s fresh</Link>
        </Alert>
      </>
    )

  const sea = p.category === 'sea'
  const sum = summary?.[p.slug]
  const kind = s ? pinKind(s) : 'pickup'
  const PinIcon = kind === 'wharf' ? Anchor : kind === 'farm' ? Warehouse : MapPin
  const mine = auth.seller?.id === b.seller_id
  const checksOk = b.check_results.length > 0 && b.check_results.every((c) => c.ok)
  const options = [
    { k: 'pin', t: s?.place_name ?? b.pickup_place, d: s ? `${pinWord(kind)} · ${s.hours_text}` : 'Seller’s pickup place' },
    ...(s?.market_ids ?? []).map((m) => ({ k: 'market:' + m, t: cat.marketById[m]?.name ?? m, d: `Market · ${cat.marketById[m]?.days_text ?? ''}` })),
  ]
  const step = 1
  const total = Number(b.price) * qty

  return (
    <>
      <BackLink />
      <ProductTile big icon={p.icon} category={p.category} photo={photoUrl(b.photo_path)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>{p.name}</h1>
          <p className="sub">
            {qtyText(b.qty_left, p.unit)} left · {ageText(p.harvest_verb, b.caught_or_harvested_at, b.when_text)}
          </p>
        </div>
        <span className="price text-[22px]!">
          {money(b.price)}
          <small>/{p.unit}</small>
        </span>
      </div>

      {b.status !== 'live' && (
        <Alert tone={b.status === 'held' ? 'warn' : 'info'} title={b.status === 'sold_out' ? 'Sold out' : b.status === 'held' ? 'Waiting for a review' : 'No longer listed'}>
          {b.status === 'held' ? 'This batch didn’t pass every automatic check, so it isn’t on the map until the Landed team reviews it.' : 'You can’t order from this batch any more.'}
        </Alert>
      )}

      {sum && (
        <div className="hint">
          <FairBadge price={Number(b.price)} summary={sum} />{' '}
          <span className="ml-1">
            Local range is <b>{money(sum.low)}–{money(sum.high)}</b> per {p.unit}, based on {sum.sales} sales and {sum.reports} price reports this week.{' '}
            <Link className="link text-[13px]!" to={`/prices/${p.slug}`}>
              See prices →
            </Link>
          </span>
        </div>
      )}

      <div className="card">
        <h2>Why you can trust this</h2>
        <ul className="checks">
          <li className="ok">
            <i>
              <Check strokeWidth={3} />
            </i>
            <div>
              <b>Verified seller</b>
              <div className="small">{s?.verified_note ?? 'Checked by Landed'} when they joined</div>
            </div>
          </li>
          <li className={checksOk ? 'ok' : 'wait'}>
            <i>{checksOk && <Check strokeWidth={3} />}</i>
            <div>
              <b>Verified listing</b>
              <div className="small">{checksOk ? 'Passed the automatic checks: season, place, time and photo' : 'Waiting for the automatic checks'}</div>
            </div>
          </li>
          <li className="wait">
            <i />
            <div>
              <b>Verified {sea ? 'catch' : 'harvest'}</b>
              <div className="small">Coming: matched to official {sea ? 'landing' : 'farm'} records</div>
            </div>
          </li>
        </ul>
        <ol className="timeline mt-1 border-t border-line pt-3">
          <li>
            <div>
              <b>{sea ? 'Caught' : 'Grown'}</b>
              <span>
                {b.origin_text}
                {sea && b.source_text ? ` · ${b.source_text}` : ''}
              </span>
            </div>
          </li>
          <li>
            <div>
              <b>{sea ? 'Landed' : p.harvest_verb}</b>
              <span>{b.when_text ?? whenText(b.caught_or_harvested_at)}</span>
            </div>
          </li>
          <li>
            <div>
              <b>Labelled and listed on Landed</b>
              <span>
                by {s?.display_name ?? 'the seller'} · {qtyText(b.qty_total, p.unit)} in this batch
              </span>
            </div>
          </li>
        </ol>
      </div>

      {s && (
        <div className="card">
          <div className="flex items-center gap-2.5">
            <div className={cn('avatar', s.kind === 'farmer' && 'land')}>{initials(s.display_name)}</div>
            <div className="flex min-w-0 flex-col">
              <span className="name">{s.display_name}</span>
              <span className="small">{s.story || s.business_name}</span>
            </div>
          </div>
          <div className="small flex items-center gap-1.5">
            <PinIcon className="size-4 flex-none" />
            {pinWord(kind)}: {s.place_name} · {s.area_label} · {kmText(loc.distanceTo(s))}
          </div>
          <div>{s.available_now ? <span className="badge">{hereNowText(kind)}</span> : <span className="badge soon">Not there right now · call first</span>}</div>
          <CallBox phone={s.phone} />
          <Link to={`/map?pin=${s.seller_id}&focus=${s.seller_id}`} className="link text-[13px]!">
            See on the map →
          </Link>
        </div>
      )}

      {b.status === 'live' && !mine && (
        <div className="card">
          <div className="flex items-center justify-between gap-2">
            <h2>Order for pickup</h2>
            <div className="stepper">
              <button type="button" aria-label="Less" onClick={() => setQty((q) => Math.max(step, q - step))}>
                −
              </button>
              <output aria-live="polite">
                {qty} {unitWord(p.unit, qty)}
              </output>
              <button type="button" aria-label="More" onClick={() => setQty((q) => Math.min(Number(b.qty_left), q + step))}>
                +
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Pickup place">
            {options.map((o) => (
              <button key={o.k} type="button" role="radio" aria-checked={pick === o.k} className="opt" onClick={() => setPick(o.k)}>
                <span className="r" />
                <span>
                  {o.k.startsWith('market:') ? <Store className="mr-1 inline size-3.5 align-[-2px]" /> : null}
                  {o.t}
                  <small>{o.d}</small>
                </span>
              </button>
            ))}
          </div>
          {s && !s.available_now && <div className="small">The seller will confirm a pickup time with you.</div>}
          {order.error && <Alert tone="bad">{errorMessage(order.error)}</Alert>}
          {auth.userId ? (
            <button className="btn" disabled={order.isPending} onClick={() => order.mutate()}>
              {order.isPending ? 'Sending…' : `Order ${money(total)} · pay at pickup`}
            </button>
          ) : (
            <Link className="btn" to={`/signin?next=${encodeURIComponent(`/b/${b.id}`)}`}>
              Sign in to order · pay at pickup
            </Link>
          )}
          <SampleNote>Prototype: no payment is taken. You pay the seller at pickup.</SampleNote>
        </div>
      )}
      {mine && <Alert tone="info">This is your batch. Buyers see this page when they tap it on the map.</Alert>}
    </>
  )
}
