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
  crab: 'M12 9c3 0 5 1.8 5 4s-2 4-5 4-5-1.8-5-4 2-4 5-4zM7 12l-3-2M17 12l3-2M7.5 15l-3 2M16.5 15l3 2M9.5 9.5 7.5 6M14.5 9.5l2-3.5M5.5 4.5 7.5 6l-2.5.5M18.5 4.5 16.5 6l2.5.5',
  mussel: 'M6 18c-2-2-1-6 2.5-9.5S17 3 19 5s-.5 6.5-4 10-7 5-9 3zM6 18 18 6M9 17l-1.5-3.5M13 14l-1.5-3.5',
  seaweed: 'M9 21c0-4 3-5 1.5-9S7 7 9 3M15 21c0-3 3-5 1.5-8.5S14 7.5 16 3.5M5 21h14',
  sprout: 'M12 21v-8M12 13c0-3.5 2.2-6 5-6s4 2 4 4-1.5 3.5-3.5 3.5-2.5-1.2-2.5-2.5 1-1.8 2-1.8M12 16c-1.5-2-4-2.5-6-1.5',
  corn: 'M12 3c2.4 0 4 3.4 4 8s-1.6 8-4 8-4-3.4-4-8 1.6-8 4-8zM12 3v16M8.4 8h7.2M8 12h8M8.6 16h6.8M8 14c-2 1.2-3 4-3 7M16 14c2 1.2 3 4 3 7',
  broccoli: 'M8 12a3.2 3.2 0 0 1-.6-6.3A3.6 3.6 0 0 1 14.6 4a3.2 3.2 0 0 1 1.6 6.1A3.2 3.2 0 0 1 16 12zM10.5 12l.8 9h1.4l.8-9M12 15.5l-2-1.5M12 17l2-1.5',
  cabbage: 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M12 20v-10M12 14c-2-1.4-4.4-1.6-6.5-.6M12 14c2-1.4 4.4-1.6 6.5-.6M12 10c-1.4-1-3-1.3-4.6-.9M12 10c1.4-1 3-1.3 4.6-.9',
  beet: 'M12 10c3.4 0 6 2.4 6 5.3S15.4 20 12 21c-3.4-1-6-2.8-6-5.7S8.6 10 12 10zM12 21v2M12 10c-1.2-3-3-5-5.5-6M12 10c1.2-3 3-5 5.5-6M12 10V3',
  onion: 'M12 4c0 3.2-6 5-6 10a6 6 0 0 0 12 0c0-5-6-6.8-6-10zM12 4V2M12 8.5c-1.6 2-2.2 3.8-2.2 5.8s.6 3.8 2.2 5.7M12 8.5c1.6 2 2.2 3.8 2.2 5.8s-.6 3.8-2.2 5.7',
  garlic: 'M12 3c0 3.5-7 5-7 11a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5c0-6-7-7.5-7-11zM12 7c-2 2-3 4.7-3 7.3S10 19 10 19M12 7c2 2 3 4.7 3 7.3S14 19 14 19M12 7v12',
  berries: 'M5.0 15.5a3.5 3.5 0 1 0 7.0 0a3.5 3.5 0 1 0 -7.0 0M12.0 15.5a3.5 3.5 0 1 0 7.0 0a3.5 3.5 0 1 0 -7.0 0M8.5 9.5a3.5 3.5 0 1 0 7.0 0a3.5 3.5 0 1 0 -7.0 0M12 6V3M12 4.2l2.8-1',
  strawberry: 'M12 7.5c4 0 7 1.8 7 4.8 0 4.2-4 8.7-7 8.7s-7-4.5-7-8.7c0-3 3-4.8 7-4.8zM8.5 4.5 12 7.5l3.5-3M12 7.5V3M9.5 11.5v.01M14.5 11.5v.01M12 14.5v.01M9.5 17v.01M14.5 17v.01',
  egg: 'M12 3c-3.5 0-6.5 5.4-6.5 10.5a6.5 6.5 0 0 0 13 0C18.5 8.4 15.5 3 12 3z',
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
