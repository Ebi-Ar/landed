import { clsx as cn } from 'clsx'

/** Line icons for the product catalogue (products.icon). */
const PATHS: Record<string, string> = {
  lobster:
    'M12 21v-6M9 21l3-3 3 3M12 15c-2.5 0-4-2-4-5s1.5-5 4-5 4 2 4 5-1.5 5-4 5zM8 8C5 7 4 4 5 2c1 2 2 3 4 3M16 8c3-1 4-4 3-6-1 2-2 3-4 3M8 11H4M16 11h4M8 13l-3 2M16 13l3 2',
  fish: 'M3 12c3-5 10-6 14-2l4-3v10l-4-3c-4 4-11 3-14-2z',
  shell: 'M12 4C6 4 3 9 3 13l9 7 9-7c0-4-3-9-9-9zM12 4v16M7 6l5 14M17 6l-5 14',
  tuber: '',
  carrot: 'M8 21c-2 0-4-2-4-4l9-9 4 4-9 9zM15 8l2-5M17 10l5-2M16 7l3-3',
  squash:
    'M12 3v3M12 6c-2 0-3 2-3 4 0 1 .5 2 .5 3C8 14 7 15.5 7 17.5a5 5 0 0 0 10 0c0-2-1-3.5-2.5-4.5 0-1 .5-2 .5-3 0-2-1-4-3-4z',
  apple: 'M12 7c-3-2-8-1-8 5s4 9 6 9c1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 6-3 6-9s-5-7-8-5zM12 7c0-2 1-4 3-4',
  drop: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
  honey: 'M12 3l7 4v8l-7 4-7-4V7zM12 11l3.5 2v4',
}

export function ProductIcon({ icon, className, strokeWidth = 1.6 }: { icon: string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn('size-9', className)}>
      {icon === 'tuber' ? (
        <>
          <ellipse cx="12" cy="13" rx="8" ry="6" transform="rotate(-20 12 13)" />
          <circle cx="9" cy="12" r=".7" fill="currentColor" />
          <circle cx="14" cy="15" r=".7" fill="currentColor" />
          <circle cx="15" cy="10" r=".7" fill="currentColor" />
        </>
      ) : (
        <>
          <path d={PATHS[icon] ?? PATHS.fish} />
          {icon === 'fish' && <circle cx="8" cy="11" r=".8" fill="currentColor" />}
        </>
      )}
    </svg>
  )
}

/** Square product tile: the batch photo if there is one, else the icon. */
export function ProductTile({
  icon,
  category,
  photo,
  size = 68,
  big,
  className,
}: {
  icon: string
  category: 'sea' | 'land'
  photo?: string | null
  size?: number
  big?: boolean
  className?: string
}) {
  return (
    <div
      className={cn('tile', category, big && 'h-[180px] w-full rounded-[18px]', className)}
      style={big ? undefined : { width: size, height: size }}
    >
      {photo ? <img src={photo} alt="" loading="lazy" /> : <ProductIcon icon={icon} strokeWidth={big ? 1.3 : 1.6} className={big ? 'size-[76px]' : size < 60 ? 'size-7' : undefined} />}
    </div>
  )
}
