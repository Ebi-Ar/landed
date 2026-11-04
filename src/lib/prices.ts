import type { IndexRow, Product } from './types'

export interface PriceSummary {
  product: Product
  date: string
  low: number
  high: number
  avg: number
  /** Change in the average over 7 days. */
  change: number
  sales: number
  reports: number
  /** Daily averages for the last 30 days, oldest first. */
  history: number[]
  strength: Strength
}

export interface Strength {
  label: 'Solid data' | 'Some data' | 'Limited data'
  tone: '' | 'tide' | 'warn'
}

/** Solid data (12+ points this week), Some data (6–11), Limited data (under 6). */
export function strengthOf(points: number): Strength {
  if (points >= 12) return { label: 'Solid data', tone: '' }
  if (points >= 6) return { label: 'Some data', tone: 'tide' }
  return { label: 'Limited data', tone: 'warn' }
}

export function summarize(rows: IndexRow[], products: Product[]): Record<string, PriceSummary> {
  const byProduct = new Map<string, IndexRow[]>()
  for (const r of rows) {
    const list = byProduct.get(r.product_id) ?? []
    list.push(r)
    byProduct.set(r.product_id, list)
  }
  const out: Record<string, PriceSummary> = {}
  for (const p of products) {
    const list = (byProduct.get(p.slug) ?? []).sort((a, b) => a.date.localeCompare(b.date))
    const today = list.at(-1)
    if (!today) continue
    const weekAgoDate = new Date(today.date + 'T12:00:00Z')
    weekAgoDate.setUTCDate(weekAgoDate.getUTCDate() - 7)
    const weekAgoKey = weekAgoDate.toISOString().slice(0, 10)
    const weekAgo = list.find((r) => r.date === weekAgoKey) ?? list.find((r) => r.date > weekAgoKey)
    const n = Number(today.sales_count) + Number(today.report_count)
    out[p.slug] = {
      product: p,
      date: today.date,
      low: Number(today.low),
      high: Number(today.high),
      avg: Number(today.avg),
      change: weekAgo ? Math.round((Number(today.avg) - Number(weekAgo.avg)) * 100) / 100 : 0,
      sales: Number(today.sales_count),
      reports: Number(today.report_count),
      history: list.slice(-30).map((r) => Number(r.avg)),
      strength: strengthOf(n),
    }
  }
  return out
}

export type Fairness = 'fair' | 'above' | 'below'

export function fairness(price: number, s: PriceSummary | undefined): Fairness | null {
  if (!s) return null
  if (price > s.high) return 'above'
  if (price < s.low) return 'below'
  return 'fair'
}

export const FAIR_NOTE = 'Information to help everyone price fairly, not a rule. Sellers set their own prices.'
