import { Area, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money } from '@/lib/format'

/** 30-day chart: daily average price, with today's fair range shaded. */
export default function PriceChart({ history, low, high, label }: { history: number[]; low: number; high: number; label: string }) {
  const data = history.map((v, i) => ({ i, v, day: i === history.length - 1 ? 'Today' : `${history.length - 1 - i} days ago` }))
  const mn = Math.min(low, ...history)
  const mx = Math.max(high, ...history)
  const pad = (mx - mn) * 0.15 || 0.5
  return (
    <div role="img" aria-label={`${label}: average price over the last 30 days, from ${money(history[0] ?? 0)} to ${money(history.at(-1) ?? 0)}, with today's fair range ${money(low)} to ${money(high)} shaded`}>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <ReferenceArea y1={low} y2={high} fill="var(--kelp-soft)" fillOpacity={1} stroke="var(--line)" ifOverflow="extendDomain" />
          <XAxis
            dataKey="i"
            tickLine={false}
            axisLine={false}
            ticks={[0, data.length - 1]}
            tickFormatter={(i: number) => (i === 0 ? '30 days ago' : 'Today')}
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
          />
          <YAxis
            domain={[mn - pad, mx + pad]}
            ticks={[low, high]}
            tickFormatter={(v: number) => money(v)}
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
          />
          <Tooltip
            formatter={(v) => [money(Number(v)), 'Average']}
            labelFormatter={(i) => data[Number(i)]?.day ?? ''}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
          />
          <Area dataKey="v" type="monotone" stroke="none" fill="transparent" isAnimationActive={false} />
          <Line dataKey="v" type="monotone" stroke="var(--tide)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
