/** Tiny 30-day trend line (from the mockup). Decorative: the numbers are next to it. */
export function Sparkline({ values, className = 'h-[52px] w-full' }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const w = 300
  const h = 50
  const mn = Math.min(...values)
  const mx = Math.max(...values)
  const pad = (mx - mn) * 0.15 || 0.1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 6) + 1, h - 4 - ((v - mn + pad) / (mx - mn + 2 * pad)) * (h - 8)])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('')
  const last = pts[pts.length - 1]
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L${w - 5} ${h} L1 ${h}Z`} fill="var(--kelp-soft)" />
      <path d={d} fill="none" stroke="var(--kelp)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--kelp)" />
    </svg>
  )
}
