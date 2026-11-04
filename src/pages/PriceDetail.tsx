import { lazy, Suspense } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChangeText } from '@/components/FairBadge'
import { ProductTile } from '@/components/ProductIcon'
import { Alert, BackLink, ErrorNote, Loading, SampleNote } from '@/components/ui'
import { useLiveBatches, usePriceIndex } from '@/lib/queries'
import { FAIR_NOTE } from '@/lib/prices'
import { money } from '@/lib/format'

const PriceChart = lazy(() => import('@/components/PriceChart'))

/** One product's fair range, 30-day chart and data strength. */
export default function PriceDetail() {
  const { product = '' } = useParams()
  const { pathname } = useLocation()
  const seller = pathname.startsWith('/sell')
  const { summary, isLoading, error } = usePriceIndex()
  const batches = useLiveBatches()
  if (isLoading) return <Loading />
  if (error) return <ErrorNote error={error} />
  const s = summary?.[product]
  if (!s)
    return (
      <>
        <BackLink />
        <Alert tone="info">No prices for this product yet.</Alert>
      </>
    )
  const p = s.product
  const lo = Math.min(...s.history)
  const hi = Math.max(...s.history)
  const n = (batches.data ?? []).filter((b) => b.product_id === p.slug).length

  return (
    <>
      <BackLink />
      <div className="flex items-center gap-2.5">
        <ProductTile icon={p.icon} category={p.category} size={52} />
        <div>
          <h1>{p.name}</h1>
          <p className="sub">Southeast New Brunswick</p>
        </div>
      </div>
      <div className="card">
        <span className="small">Fair price range today</span>
        <div className="stat">
          {money(s.low)} – {money(s.high)}
          <span className="small font-sans! font-medium!"> per {p.unit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="small">Average {money(s.avg)}</span>
          <span>
            <ChangeText change={s.change} /> <span className="small">over 7 days</span>
          </span>
        </div>
        <Suspense fallback={<div className="h-[180px] animate-pulse rounded-xl bg-surface-2" />}>
          <PriceChart history={s.history} low={s.low} high={s.high} label={p.short_name} />
        </Suspense>
        <span className="small">Line: daily average price. Shaded band: today’s fair range.</span>
      </div>
      <div className="card">
        <dl className="kv">
          <dt>Sales on Landed this week</dt>
          <dd>{s.sales}</dd>
          <dt>Price reports this week</dt>
          <dd>{s.reports}</dd>
          <dt>How solid</dt>
          <dd>
            <span className={`badge ${s.strength.tone}`}>{s.strength.label}</span>
          </dd>
          <dt>Lowest in 30 days</dt>
          <dd>{money(lo)}</dd>
          <dt>Highest in 30 days</dt>
          <dd>{money(hi)}</dd>
        </dl>
      </div>
      {!seller && (
        <Link className="btn" to={`/fresh?q=${encodeURIComponent(p.short_name)}`}>
          {n ? `See ${p.short_name.toLowerCase()} for sale near you (${n})` : `Nothing for sale right now. See what’s fresh`}
        </Link>
      )}
      <SampleNote>{FAIR_NOTE} · Sample data</SampleNote>
    </>
  )
}
