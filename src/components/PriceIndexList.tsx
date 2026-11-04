import { Link } from 'react-router-dom'
import { ChangeArrow, ChangeText } from './FairBadge'
import { Sparkline } from './Sparkline'
import { cn } from '@/lib/cn'
import { money } from '@/lib/format'
import type { PriceSummary } from '@/lib/prices'

export function Ticker({ items }: { items: PriceSummary[] }) {
  return (
    <div className="ticker" aria-label="Average prices today">
      {items.map((s) => (
        <span key={s.product.slug} className="tk">
          <b>{s.product.short_name}</b> {money(s.avg)} <ChangeArrow change={s.change} />
        </span>
      ))}
    </div>
  )
}

/** One row per product: fair range, change, data strength, sparkline. */
export function PriceIndexList({
  items,
  forSale,
  base,
  className,
}: {
  items: PriceSummary[]
  forSale?: Record<string, number>
  base: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {items.map((s) => {
        const n = forSale?.[s.product.slug] ?? 0
        return (
          <Link key={s.product.slug} to={`${base}/${s.product.slug}`} className="irow">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="name">{s.product.name}</span>
              <span className="small">
                Based on {s.sales} sales and {s.reports} reports this week ·{' '}
                <span className={`badge ${s.strength.tone} px-1.5! py-px!`}>{s.strength.label}</span>
              </span>
              {forSale && <span className="small">{n ? `${n} for sale near you` : 'None for sale right now'}</span>}
            </div>
            <div>
              <div className="rng">
                {money(s.low)}–{money(s.high)}
              </div>
              <div className="small text-right">
                per {s.product.unit} · <ChangeText change={s.change} />
              </div>
            </div>
            <Sparkline values={s.history} className="col-span-2 h-[30px] w-full" />
          </Link>
        )
      })}
    </div>
  )
}
