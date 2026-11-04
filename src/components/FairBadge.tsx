import { fairness, type PriceSummary } from '@/lib/prices'

export function FairBadge({ price, summary }: { price: number; summary: PriceSummary | undefined }) {
  const f = fairness(price, summary)
  if (!f) return null
  if (f === 'above') return <span className="badge warn">Above local range</span>
  if (f === 'below') return <span className="badge">Below local range</span>
  return <span className="badge">Fair price</span>
}

export function ChangeText({ change }: { change: number }) {
  if (change > 0) return <span className="up">▲ {change.toFixed(2)}</span>
  if (change < 0) return <span className="down">▼ {Math.abs(change).toFixed(2)}</span>
  return <span className="flat">no change</span>
}

export function ChangeArrow({ change }: { change: number }) {
  if (change > 0) return <span className="up" aria-label="up">▲</span>
  if (change < 0) return <span className="down" aria-label="down">▼</span>
  return <span className="flat" aria-label="no change">–</span>
}
