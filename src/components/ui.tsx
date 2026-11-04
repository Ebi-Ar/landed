import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, ChevronLeft, CircleX, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} />
}

export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map(([k, l]) => (
        <button key={k} type="button" className="chip" aria-pressed={value === k} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function Alert({ tone, title, children }: { tone: 'warn' | 'bad' | 'info'; title?: ReactNode; children?: ReactNode }) {
  const Icon = tone === 'bad' ? CircleX : tone === 'warn' ? AlertTriangle : Info
  return (
    <div className={cn('alert', tone)} role={tone === 'info' ? 'status' : 'alert'}>
      <Icon />
      <div>
        {title && <b>{title}</b>}
        {title && children ? <br /> : null}
        {children}
      </div>
    </div>
  )
}

export function BackLink({ to, onClick, label = 'Back' }: { to?: string; onClick?: () => void; label?: string }) {
  const inner = (
    <>
      <ChevronLeft className="size-4" />
      {label}
    </>
  )
  if (to)
    return (
      <Link to={to} className="link inline-flex items-center gap-0.5">
        {inner}
      </Link>
    )
  return (
    <button type="button" onClick={onClick ?? (() => history.back())} className="link inline-flex items-center gap-0.5">
      {inner}
    </button>
  )
}

export function PageTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label={label}>
      <div className="h-7 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="h-24 animate-pulse rounded-2xl bg-surface" />
      <div className="h-24 animate-pulse rounded-2xl bg-surface" />
    </div>
  )
}

export function ErrorNote({ error }: { error: unknown }) {
  const msg = (error as { message?: string })?.message ?? 'Something went wrong.'
  return (
    <Alert tone="bad" title="Couldn’t load this">
      {/failed to fetch/i.test(msg) ? 'No connection. Check your signal and try again.' : msg}
    </Alert>
  )
}

export function CheckList({ items, revealed }: { items: Array<{ label: string; detail?: string; ok: boolean }>; revealed?: number }) {
  return (
    <ul className="checks">
      {items.map((c, i) => {
        const shown = revealed === undefined || i < revealed
        return (
          <li key={i} className={!shown ? 'wait' : c.ok ? 'ok' : 'fail'}>
            <i>{shown ? c.ok ? <Check strokeWidth={3} /> : <span className="text-[13px] font-bold">!</span> : null}</i>
            <div>
              <b>{c.label}</b>
              {c.detail && shown && <div className="small">{c.detail}</div>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function SampleNote({ children }: { children: ReactNode }) {
  return <p className="sample">{children}</p>
}
