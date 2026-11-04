import { clsx as cn } from 'clsx'

/** Landed mark: two waves (the sea) under a sprouting leaf (the land). */
export function LogoMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden className={className}>
      <path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="var(--tide)" />
      <path d="M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0" stroke="var(--tide)" />
      <path d="M12 12c0-4 2-7 6-8-1 4-3 7-6 8zM12 12C12 9 10 7 7 6c0 3 2 5 5 6z" stroke="var(--kelp)" />
    </svg>
  )
}

export function Logo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-[7px] font-display text-[20px] font-bold tracking-[-0.02em] text-ink', className)}>
      <LogoMark size={size} />
      Landed
    </span>
  )
}
