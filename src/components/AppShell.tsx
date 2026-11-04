import { Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ChartLine, List, LogIn, Map as MapIcon, ShieldCheck, ShoppingBag, Sun, Tag, User, LayoutDashboard, type LucideIcon,
} from 'lucide-react'
import { Logo } from './Logo'
import { Loading } from './ui'
import { useAuth } from '@/lib/auth'
import { useBuyerOrders, useSellerOrders } from '@/lib/queries'
import { initials } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
  end?: boolean
}

function useTabs(selling: boolean): Tab[] {
  const { userId, seller } = useAuth()
  const buyerOrders = useBuyerOrders(selling ? null : userId)
  const sellerOrders = useSellerOrders(selling ? seller?.id : undefined)
  if (!selling) {
    const ready = (buyerOrders.data ?? []).filter((o) => o.status === 'ready').length
    return [
      { to: '/map', label: 'Map', icon: MapIcon },
      { to: '/fresh', label: 'Fresh', icon: List },
      { to: '/prices', label: 'Prices', icon: ChartLine },
      { to: '/verify', label: 'Verify', icon: ShieldCheck },
      { to: '/orders', label: 'Orders', icon: ShoppingBag, badge: ready },
    ]
  }
  const fresh = (sellerOrders.data ?? []).filter((o) => o.status === 'ordered').length
  return [
    { to: '/sell', label: 'Today', icon: Sun, end: true },
    { to: '/sell/prices', label: 'Prices', icon: ChartLine },
    { to: '/sell/add', label: 'Add batch', icon: Tag },
    { to: '/sell/orders', label: 'Orders', icon: ShoppingBag, badge: fresh },
    { to: '/sell/profile', label: 'Profile', icon: User },
  ]
}

/** Buying / Selling switch for people who are both. */
function ModeSwitch({ selling }: { selling: boolean }) {
  const navigate = useNavigate()
  const { isSeller } = useAuth()
  if (!isSeller) return null
  return (
    <div className="flex rounded-full border border-line bg-surface-2 p-[3px]" role="group" aria-label="Mode">
      {(['Buying', 'Selling'] as const).map((m) => {
        const on = (m === 'Selling') === selling
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => !on && navigate(m === 'Selling' ? '/sell' : '/map')}
            className={cn('rounded-full px-[11px] py-[6px] text-[12.5px] font-semibold', on ? 'bg-ink text-surface' : 'text-muted')}
          >
            {m}
          </button>
        )
      })}
    </div>
  )
}

function AccountButton() {
  const { userId, profile, ready } = useAuth()
  const { pathname } = useLocation()
  if (!ready) return <span className="size-8" />
  if (!userId)
    return (
      <Link to={`/signin?next=${encodeURIComponent(pathname)}`} className="btn sm alt">
        <LogIn /> Sign in
      </Link>
    )
  return (
    <Link to="/account" aria-label="Your account" className="grid size-8 place-items-center rounded-full bg-tide-soft font-display text-[12px] font-bold text-tide">
      {initials(profile?.full_name || 'You')}
    </Link>
  )
}

function TabLink({ tab, compact }: { tab: Tab; compact?: boolean }) {
  const Icon = tab.icon
  return (
    <NavLink
      to={tab.to}
      end={tab.end}
      className={({ isActive }) =>
        cn(
          compact
            ? 'relative flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold'
            : 'relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-semibold',
          isActive ? (compact ? 'text-tide' : 'bg-tide-soft text-tide') : compact ? 'text-muted' : 'text-muted hover:bg-surface-2 hover:text-ink',
        )
      }
    >
      <Icon className={compact ? 'size-[22px]' : 'size-[19px]'} strokeWidth={1.8} />
      <span>{tab.label}</span>
      {tab.badge ? (
        <span
          className={cn(
            'min-w-4 rounded-full bg-buoy px-1 text-center text-[10px] leading-4 font-bold text-white',
            compact ? 'absolute top-[3px] left-[calc(50%+6px)]' : 'ml-auto',
          )}
        >
          {tab.badge}
        </span>
      ) : null}
    </NavLink>
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  const selling = pathname.startsWith('/sell')
  const tabs = useTabs(selling)
  const { isAdmin } = useAuth()
  const wide = pathname === '/map' || pathname.startsWith('/admin')

  return (
    <div className="min-h-dvh">
      {/* Sidebar on laptops */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col gap-4 border-r border-line bg-surface p-4 lg:flex">
        <Link to="/" className="px-2 pt-1">
          <Logo />
        </Link>
        <ModeSwitch selling={selling} />
        <nav className="flex flex-col gap-1" aria-label={selling ? 'Selling' : 'Buying'}>
          {tabs.map((t) => (
            <TabLink key={t.to} tab={t} />
          ))}
          {isAdmin && <TabLink tab={{ to: '/admin', label: 'Admin', icon: LayoutDashboard }} />}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 px-1">
          <AccountButton />
          <span className="small">Sample data until the pilot</span>
        </div>
      </aside>

      <div className="lg:pl-[240px]">
        {/* Header on phones */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-surface px-[14px] pt-[calc(10px+env(safe-area-inset-top))] pb-[10px] lg:hidden">
          <Link to="/" aria-label="Landed home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ModeSwitch selling={selling} />
            <AccountButton />
          </div>
        </header>

        <main className={cn('mx-auto flex w-full flex-col gap-3 px-[14px] pt-[14px] pb-[110px] lg:px-8 lg:pt-8 lg:pb-12', wide ? 'max-w-[1100px]' : 'max-w-[680px]')}>
          <Suspense fallback={<Loading />}>
            <div key={pathname} className="rise flex flex-col gap-3">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      {/* Bottom tabs on phones */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface px-1 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        aria-label={selling ? 'Selling' : 'Buying'}
      >
        {tabs.map((t) => (
          <TabLink key={t.to} tab={t} compact />
        ))}
      </nav>
    </div>
  )
}
