import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildBoard, dayLabel, pctText, RANGE_WORDS, type Board, type BoardRange } from '@/lib/board'
import { ChangeArrow } from './FairBadge'
import { byFoodGroup, money } from '@/lib/format'
import type { PriceSummary } from '@/lib/prices'

/** At most four foods in colour at once, so every line stays easy to tell apart. */
const SLOTS = 4
const slotColor = (slot: number) => `var(--cmp-${slot + 1})`
const RANGES: Array<[BoardRange, string, string]> = [
  ['1w', '1W', 'One week'],
  ['2w', '2W', 'Two weeks'],
  ['1m', '1M', 'One month'],
]

type Picked = Record<string, number>

const START: BoardRange = '2w'

/** Start by comparing the three foods that moved the most over the starting range. */
function topMovers(items: PriceSummary[]): Picked {
  const b = buildBoard(items, START)
  const top = [...items].sort((x, y) => Math.abs(b.change[y.product.slug]) - Math.abs(b.change[x.product.slug])).slice(0, 3)
  return Object.fromEntries(top.map((s, i) => [s.product.slug, i]))
}

const axisPct = (v: number) => (v ? `${v > 0 ? '+' : '−'}${Math.abs(v)}%` : '0%')

function Change({ v }: { v: number }) {
  return <span className={v > 0 ? 'up' : v < 0 ? 'down' : 'flat'}>{pctText(v)}</span>
}

/**
 * The market board: every food on one chart as % change, with the Landed Food
 * Index (the average of them all) on top. Pick up to four foods to compare.
 */
export default function MarketBoard({
  items,
  scope,
  range: rangeProp,
  onRange,
}: {
  items: PriceSummary[]
  scope: string
  /** Pass these to keep the range when the board is remounted. */
  range?: BoardRange
  onRange?: (r: BoardRange) => void
}) {
  const [ownRange, setOwnRange] = useState<BoardRange>(START)
  const range = rangeProp ?? ownRange
  const setRange = onRange ?? setOwnRange
  // Colour follows the food: it keeps its colour until you drop it.
  const [picked, setPicked] = useState<Picked>(() => topMovers(items))
  const [full, setFull] = useState(false)

  const board = useMemo(() => buildBoard(items, range), [items, range])
  const today = items.map((s) => s.date).sort().at(-1)
  const shown = items.filter((s) => picked[s.product.slug] != null)
  const groups = useMemo(() => byFoodGroup(items, (s) => s.product.food_group), [items])
  const rest = items.filter((s) => picked[s.product.slug] == null)

  function toggle(slug: string) {
    // Foods hidden by the filter give up their colour.
    const live: Picked = Object.fromEntries(Object.entries(picked).filter(([k]) => items.some((s) => s.product.slug === k)))
    if (live[slug] != null) {
      delete live[slug]
      setFull(false)
    } else {
      const used = new Set(Object.values(live))
      const free = [...Array(SLOTS).keys()].find((i) => !used.has(i))
      if (free == null) return setFull(true)
      live[slug] = free
      setFull(false)
    }
    setPicked(live)
  }

  // Round steps (1, 2, 5, 10, 20 … %) with 0% always on the axis.
  const ticks = useMemo(() => {
    let lo = 0
    let hi = 0
    for (const r of board.rows)
      for (const k of ['index', ...items.map((s) => s.product.slug)]) {
        const v = r[k]
        if (typeof v === 'number') {
          lo = Math.min(lo, v)
          hi = Math.max(hi, v)
        }
      }
    const raw = Math.max(hi - lo, 1) / 4
    const mag = 10 ** Math.floor(Math.log10(raw))
    const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag
    const pad = (hi - lo) * 0.08 || 0.5
    const domain: [number, number] = [lo - pad, hi + pad]
    const out: number[] = []
    for (let t = Math.ceil(domain[0] / step) * step; t <= domain[1] + 1e-9; t += step) out.push(Math.round(t * 10) / 10)
    return { domain, list: out }
  }, [board, items])

  const rows = board.rows
  const enough = rows.length >= 2
  const n = items.length

  return (
    <section className="card board @container" aria-labelledby="board-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span id="board-title" className="small font-semibold text-ink!">
            Landed Food Index · {scope}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="stat">{pctText(board.indexChange)}</span>
            <ChangeArrow change={board.indexChange} />
          </div>
          <span className="small">
            Average price change across {n} {n === 1 ? 'food' : 'foods'} {RANGE_WORDS[range]}
          </span>
        </div>
        <div className="seg" role="group" aria-label="Time range">
          {RANGES.map(([k, short, long]) => (
            <button key={k} type="button" aria-pressed={range === k} aria-label={long} onClick={() => setRange(k)}>
              {short}
            </button>
          ))}
        </div>
      </div>

      <div className="board-body">
        <div className="flex min-w-0 flex-col gap-2">
          <ul className="board-legend" aria-label="Lines on the chart">
            <li>
              <i className="ln index" />
              Food index <Change v={board.indexChange} />
            </li>
            {shown.map((s) => (
              <li key={s.product.slug}>
                <i className="ln" style={{ background: slotColor(picked[s.product.slug]) }} />
                {s.product.short_name} <Change v={board.change[s.product.slug]} />
              </li>
            ))}
            {rest.length > 0 && (
              <li className="text-muted">
                <i className="ln rest" />
                Other foods
              </li>
            )}
          </ul>
          {enough ? (
            <div
              className="h-[260px] w-full @3xl:h-[340px]"
              role="img"
              aria-label={`Landed Food Index ${pctText(board.indexChange)} ${RANGE_WORDS[range]}. ${shown
                .map((s) => `${s.product.short_name} ${pctText(board.change[s.product.slug])}`)
                .join(', ')}. Every food is listed with its change in the table next to the chart.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 6, right: 18, bottom: 0, left: 0 }} accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <ReferenceLine y={0} stroke="var(--muted)" strokeOpacity={0.55} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    ticks={[rows[0].date, rows[Math.floor((rows.length - 1) / 2)].date, rows[rows.length - 1].date]}
                    tickFormatter={(d: string) => dayLabel(d, today)}
                    tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    height={22}
                    interval={0}
                    padding={{ left: 4, right: 4 }}
                  />
                  <YAxis
                    domain={ticks.domain}
                    ticks={ticks.list}
                    tickFormatter={axisPct}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    interval={0}
                    tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  />
                  <Tooltip
                    content={<Tip board={board} shown={shown} picked={picked} today={today} />}
                    cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                    isAnimationActive={false}
                    position={{ y: 4 }}
                    wrapperStyle={{ outline: 'none', zIndex: 2, pointerEvents: 'none' }}
                  />
                  {rest.map((s) => (
                    <Line
                      key={s.product.slug}
                      dataKey={s.product.slug}
                      stroke="var(--muted)"
                      strokeOpacity={0.3}
                      strokeWidth={1.25}
                      dot={false}
                      activeDot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                  <Line
                    dataKey="index"
                    stroke="var(--ink)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--ink)', stroke: 'var(--surface)', strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                  {shown.map((s) => (
                    <Line
                      key={s.product.slug}
                      dataKey={s.product.slug}
                      stroke={slotColor(picked[s.product.slug])}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: slotColor(picked[s.product.slug]), stroke: 'var(--surface)', strokeWidth: 2 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="sub">Not enough price history yet to draw the board.</p>
          )}
        </div>

        <div className="watch" role="group" aria-label={`Foods to compare, up to ${SLOTS} at once`}>
          <div className="flex items-center justify-between">
            <span className="small font-semibold">Compare up to {SLOTS}</span>
            <span className="small">{RANGES.find((r) => r[0] === range)?.[2]}</span>
          </div>
          <div className="watch-list">
            {groups.map((g) => (
              <div key={g.group} className="flex flex-col gap-0.5">
                {groups.length > 1 && <span className="watch-head">{g.name}</span>}
                {g.items.map((s) => {
                  const slot = picked[s.product.slug]
                  const on = slot != null
                  return (
                    <button key={s.product.slug} type="button" className="wrow" aria-pressed={on} onClick={() => toggle(s.product.slug)}>
                      <i className="sw" style={on ? { background: slotColor(slot), borderColor: slotColor(slot) } : undefined} aria-hidden />
                      <span className="min-w-0 truncate font-semibold">{s.product.short_name}</span>
                      <span className="small tabular-nums">
                        {money(s.avg)}/{s.product.unit}
                      </span>
                      <Change v={board.change[s.product.slug]} />
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          {full && (
            <p className="small m-0" role="status">
              You can compare {SLOTS} at once. Tap one to take it off first.
            </p>
          )}
        </div>
      </div>

      <p className="small m-0">
        Each line shows how much a price has moved since the first day on the chart, so foods sold by the pound and by the bag fit on one scale. The Food
        Index is the average of those moves, with every food counted equally.
      </p>
    </section>
  )
}

interface TipProps {
  active?: boolean
  label?: string
  board: Board
  shown: PriceSummary[]
  picked: Picked
  today?: string
}

function Tip({ active, label, board, shown, picked, today }: TipProps) {
  if (!active || !label) return null
  const row = board.rows.find((r) => r.date === label)
  if (!row) return null
  return (
    <div className="board-tip">
      <b>{dayLabel(label, today)}</b>
      <div className="tr">
        <i className="ln index" />
        <span>Food index</span>
        <span className="num">{row.index == null ? '–' : pctText(row.index)}</span>
      </div>
      {shown.map((s) => {
        const v = row[s.product.slug]
        const p = board.price[s.product.slug]?.[label]
        return (
          <div key={s.product.slug} className="tr">
            <i className="ln" style={{ background: slotColor(picked[s.product.slug]) }} />
            <span>
              {s.product.short_name}
              {p != null && <span className="text-muted"> · {money(p)}</span>}
            </span>
            <span className="num">{typeof v === 'number' ? pctText(v) : '–'}</span>
          </div>
        )
      })}
    </div>
  )
}
