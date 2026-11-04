import type { PriceSummary } from './prices'

/** How far back the market board looks: 1 week, 2 weeks or the full month we keep. */
export type BoardRange = '1w' | '2w' | '1m'
export const RANGE_DAYS: Record<BoardRange, number> = { '1w': 7, '2w': 14, '1m': 29 }
export const RANGE_WORDS: Record<BoardRange, string> = { '1w': 'this week', '2w': 'over two weeks', '1m': 'this month' }

/** One day on the board: the index and each food as % change since the first day shown. */
export interface BoardRow {
  date: string
  index: number | null
  [slug: string]: number | string | null
}

export interface Board {
  rows: BoardRow[]
  /** % change of the Landed Food Index across the range. */
  indexChange: number
  /** % change of each food across the range. */
  change: Record<string, number>
  /** Average price of each food on each day, for the tooltip. */
  price: Record<string, Record<string, number>>
}

const pct = (v: number, base: number) => Math.round((v / base - 1) * 1000) / 10

/**
 * Put every food on one scale: % change since the first day in the range.
 * The Landed Food Index is the plain average of those changes, so each food
 * counts equally whatever its unit (a lb of lobster, a bag of potatoes).
 */
export function buildBoard(items: PriceSummary[], range: BoardRange): Board {
  const all = new Set<string>()
  for (const s of items) for (const d of s.days) all.add(d)
  const dates = [...all].sort().slice(-(RANGE_DAYS[range] + 1))
  const from = dates[0]

  const price: Board['price'] = {}
  const base: Record<string, number> = {}
  for (const s of items) {
    const byDay: Record<string, number> = {}
    s.days.forEach((d, i) => d >= from && (byDay[d] = s.history[i]))
    price[s.product.slug] = byDay
    const first = dates.find((d) => byDay[d] != null)
    if (first) base[s.product.slug] = byDay[first]
  }

  const rows = dates.map((date) => {
    const row: BoardRow = { date, index: null }
    let sum = 0
    let n = 0
    for (const s of items) {
      const slug = s.product.slug
      const v = price[slug][date]
      if (v == null || !base[slug]) {
        row[slug] = null
        continue
      }
      const c = pct(v, base[slug])
      row[slug] = c
      sum += c
      n++
    }
    row.index = n ? Math.round((sum / n) * 10) / 10 : null
    return row
  })

  const change: Record<string, number> = {}
  for (const s of items) {
    const slug = s.product.slug
    const last = [...rows].reverse().find((r) => r[slug] != null)
    change[slug] = (last?.[slug] as number | undefined) ?? 0
  }
  const lastIndex = [...rows].reverse().find((r) => r.index != null)
  return { rows, indexChange: lastIndex?.index ?? 0, change, price }
}

/** "+2.4%", "−1.1%", "0%". */
export function pctText(v: number) {
  if (!v) return '0%'
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`
}

export function dayLabel(date: string, today?: string) {
  if (date === today) return 'Today'
  return new Date(date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
