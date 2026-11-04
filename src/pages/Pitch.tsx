import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Expand, EyeOff, Handshake, LineChart, ListChecks, Lock, PlayCircle, PlusCircle,
  ScanLine, ShieldAlert, ShieldQuestion, Smartphone, Sparkles, StickyNote, Store, Trophy, Truck, Users, Waves, X,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { SpeciesArt } from '@/components/SpeciesArt'
import { LOCKED } from '@/lib/modules'
import { bestOffer } from '@/lib/pricing'
import { useApp } from '@/lib/store'
import { publicBase } from '@/lib/tags'
import { cn, fmtMoney, fmtMoney0 } from '@/lib/utils'

/* Slides are laid out on a fixed 1600×900 stage and scaled to fit the window. */
const W = 1600
const H = 900
const DEMO_TAG = 'CC-25-0412-SHD'
const QTY = 400

const offer = bestOffer('lobster')
const gain = offer.gainPerUnit * QTY

function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return <p className={cn('text-[22px] font-semibold tracking-[0.08em] uppercase', light ? 'text-teal-200' : 'text-teal-600')}>{children}</p>
}

function WaveLines({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[220px] w-full" style={{ opacity }} viewBox="0 0 1600 220" preserveAspectRatio="none" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M0 ${60 + i * 40} C 260 ${20 + i * 40}, 540 ${100 + i * 40}, 800 ${60 + i * 40} S 1340 ${20 + i * 40}, 1600 ${60 + i * 40}`} fill="none" stroke="#fff" strokeWidth="3" />
      ))}
    </svg>
  )
}

function Footnote({ children, light }: { children: ReactNode; light?: boolean }) {
  return <p className={cn('absolute bottom-10 left-24 text-[17px]', light ? 'text-white/40' : 'text-ink-4')}>{children}</p>
}

/* ------------------------------------------------------------------ slides */

function HookSlide() {
  return (
    <div className="relative flex h-full items-center bg-navy-900 px-24 text-white">
      <WaveLines />
      <div className="absolute top-14 left-24">
        <Logo light size={40} className="[&>span:last-child]:text-[28px]" />
      </div>
      <div className="grid w-full grid-cols-[1.25fr_1fr] items-center gap-20">
        <div>
          <p className="text-[70px] leading-[1.08] font-extrabold tracking-[-0.035em]">
            A lobster fisher in Shediac can lose <span className="text-teal-200">hundreds of dollars</span> on a single catch
          </p>
          <p className="mt-8 text-[34px] leading-snug text-white/70">just by not knowing what the next port is paying.</p>
        </div>
        <div className="rounded-[28px] bg-white p-10 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-4">
            <SpeciesArt kind="lobster" size={64} rounded="rounded-2xl" />
            <div>
              <p className="text-[26px] font-bold">{QTY} lb of lobster</p>
              <p className="text-[19px] text-ink-3">Same catch, same morning</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl bg-surface px-6 py-5">
              <div>
                <p className="text-[18px] text-ink-3">Usual buyer · {offer.usual.port}</p>
                <p className="text-[22px] font-semibold">{offer.usual.buyer}</p>
              </div>
              <p className="tabular text-[40px] font-bold text-ink-2">{fmtMoney(offer.usual.price)}</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border-2 border-teal-500 bg-teal-50 px-6 py-5">
              <div>
                <p className="text-[18px] text-teal-700">{offer.best.port} · {Math.round(offer.best.distanceKm)} km away</p>
                <p className="text-[22px] font-semibold">{offer.best.buyer}</p>
              </div>
              <p className="tabular text-[40px] font-bold text-navy-900">{fmtMoney(offer.best.price)}</p>
            </div>
          </div>
          <div className="mt-6 flex items-baseline justify-between border-t border-line pt-6">
            <p className="text-[22px] text-ink-2">Left on the table</p>
            <p className="tabular text-[56px] leading-none font-extrabold tracking-[-0.03em] text-verified">+{fmtMoney0(gain)}</p>
          </div>
        </div>
      </div>
      <Footnote light>Illustrative sample prices ($/lb)</Footnote>
    </div>
  )
}

function ProblemSlide() {
  const items = [
    { icon: EyeOff, title: 'Fishers sell blind', body: 'One wharf, one buyer, one price. Small fishers rarely see what other ports or buyers pay that day.', lead: true },
    { icon: Truck, title: 'Local seafood leaves the province', body: 'Local catch ships out while restaurants and grocers pay more for imported product.' },
    { icon: ShieldQuestion, title: 'Provenance can’t be verified', body: 'Poached and mislabeled seafood slips into legitimate supply chains. A restaurant has no easy way to check.', lead: true },
  ]
  return (
    <div className="relative flex h-full flex-col justify-center bg-white px-24">
      <Eyebrow>The problem</Eyebrow>
      <h2 className="mt-4 max-w-[1200px] text-[64px] leading-[1.08] font-extrabold tracking-[-0.03em] text-navy-900">Atlantic fisheries run on weak data, and it costs fishers money.</h2>
      <div className="mt-16 grid grid-cols-3 gap-8">
        {items.map((it) => (
          <div key={it.title} className={cn('rounded-[28px] p-10', it.lead ? 'bg-navy-900 text-white' : 'border-2 border-line bg-surface')}>
            <div className={cn('grid size-[84px] place-items-center rounded-3xl', it.lead ? 'bg-white/10 text-teal-200' : 'bg-white text-navy-900')}>
              <it.icon className="size-11" strokeWidth={1.8} />
            </div>
            <h3 className="mt-8 text-[36px] leading-tight font-bold tracking-[-0.02em]">{it.title}</h3>
            <p className={cn('mt-4 text-[23px] leading-relaxed', it.lead ? 'text-white/70' : 'text-ink-3')}>{it.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SolutionSlide() {
  const pillars = [
    { icon: LineChart, title: 'Price intelligence', body: 'Dock prices by species, port and buyer, with a best-offer alert.', live: true },
    { icon: BadgeCheck, title: 'Verified provenance', body: 'Every catch gets a tag and QR code that proves where it came from.', live: true },
    { icon: ShieldAlert, title: 'Supply resilience', body: 'Early warnings when a port, buyer or route goes down.', live: false },
  ]
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-surface px-24 text-center">
      <Logo size={64} className="[&>span:last-child]:text-[44px]" />
      <h2 className="mt-10 max-w-[1250px] text-[60px] leading-[1.1] font-extrabold tracking-[-0.03em] text-navy-900">
        Live dock prices for fishers. <span className="text-teal-600">Proof of origin</span> for every catch.
      </h2>
      <div className="mt-16 grid w-full grid-cols-3 gap-8">
        {pillars.map((p) => (
          <div key={p.title} className="relative rounded-[28px] border-2 border-line bg-white p-10">
            {!p.live && (
              <span className="absolute top-7 right-7 flex items-center gap-1.5 rounded-full bg-navy-900 px-3 py-1 text-[15px] font-semibold tracking-wide text-white uppercase">
                <Lock className="size-3.5" /> Next
              </span>
            )}
            <div className="mx-auto grid size-[96px] place-items-center rounded-3xl bg-teal-50 text-teal-600">
              <p.icon className="size-12" strokeWidth={1.8} />
            </div>
            <h3 className="mt-7 text-[34px] font-bold tracking-[-0.02em] text-navy-900">{p.title}</h3>
            <p className="mt-3 text-[22px] leading-relaxed text-ink-3">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoSlide() {
  const { resetDemo } = useApp()
  const steps = [
    { icon: LineChart, title: 'Market Pulse', body: 'Marc sees today’s lobster prices across 6 buyers and 5 ports.' },
    { icon: Sparkles, title: 'Spots the gap', body: `${fmtMoney(offer.usual.price)} at his usual buyer, ${fmtMoney(offer.best.price)} in ${offer.best.port}: +${fmtMoney0(gain)}.` },
    { icon: PlusCircle, title: 'Logs his catch', body: '400 lb, LFA 25, Marie-Claire II. Gets a CatchChain tag and QR.' },
    { icon: ScanLine, title: 'Restaurant scans', body: 'A Moncton restaurant sees a green “Verified local catch”.' },
  ]
  const launch = () => {
    resetDemo()
    window.open('/app/market?species=lobster', '_blank', 'noopener')
  }
  return (
    <div className="relative flex h-full flex-col justify-center bg-navy-900 px-24 text-white">
      <WaveLines opacity={0.06} />
      <Eyebrow light>Live demo · 2 minutes</Eyebrow>
      <h2 className="mt-4 text-[64px] leading-tight font-extrabold tracking-[-0.03em]">Marc’s lobster, from wharf to plate</h2>
      <div className="mt-14 grid grid-cols-[1fr_340px] items-center gap-14">
        <ol className="grid grid-cols-2 gap-6">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-6 rounded-[24px] bg-white/[0.06] p-8">
              <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-teal-500 text-[28px] font-bold">{i + 1}</div>
              <div>
                <p className="flex items-center gap-3 text-[30px] font-bold">
                  <s.icon className="size-7 text-teal-200" /> {s.title}
                </p>
                <p className="mt-2 text-[22px] leading-snug text-white/70">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-col items-center">
          <div className="rounded-[24px] bg-white p-6">
            <QRCodeSVG value={`${publicBase()}/trace/${DEMO_TAG}`} size={260} fgColor="#0B2545" marginSize={0} />
          </div>
          <p className="mt-4 font-mono text-[22px] font-bold">{DEMO_TAG}</p>
          <p className="mt-1 flex items-center gap-2 text-[19px] text-white/60">
            <Smartphone className="size-5" /> Scan with your phone
          </p>
          <button onClick={launch} className="mt-7 flex h-16 items-center gap-3 rounded-2xl bg-teal-500 px-8 text-[24px] font-bold transition-colors hover:bg-teal-600">
            <PlayCircle className="size-7" /> Launch demo
          </button>
        </div>
      </div>
    </div>
  )
}

function VisionSlide() {
  const lk = Object.fromEntries(LOCKED.map((m) => [m.key, m]))
  const stages = [
    { when: 'Today', live: true, items: [{ icon: LineChart, label: 'Market Pulse' }, { icon: PlusCircle, label: 'Catch Log' }, { icon: BadgeCheck, label: 'Provenance' }, { icon: Store, label: 'Buyer view' }], title: 'Prices and provenance' },
    { when: 'Next', items: [lk.sell, lk.logistics].map((m) => ({ icon: m.icon, label: m.label, to: m.to })), title: 'Marketplace and logistics' },
    { when: 'Then', items: [lk['vessel-watch'], lk.resilience].map((m) => ({ icon: m.icon, label: m.label, to: m.to })), title: 'Vessel Watch and resilience' },
  ]
  return (
    <div className="relative flex h-full flex-col justify-center bg-white px-24">
      <Eyebrow>Vision</Eyebrow>
      <h2 className="mt-4 text-[60px] leading-tight font-extrabold tracking-[-0.03em] text-navy-900">Four modules live today. Four more on the roadmap.</h2>
      <div className="mt-14 grid grid-cols-[1fr_1fr_1fr_1.05fr] gap-6">
        {stages.map((s, i) => (
          <div key={s.when} className={cn('relative rounded-[28px] p-8', s.live ? 'bg-teal-50 ring-2 ring-teal-500' : 'border-2 border-line bg-surface')}>
            <div className="flex items-center justify-between">
              <p className={cn('text-[20px] font-bold tracking-[0.08em] uppercase', s.live ? 'text-teal-700' : 'text-ink-3')}>{s.when}</p>
              {s.live ? (
                <span className="rounded-full bg-verified px-3 py-1 text-[15px] font-bold text-white uppercase">Live</span>
              ) : (
                <Lock className="size-5 text-ink-4" />
              )}
            </div>
            <h3 className="mt-4 text-[30px] leading-tight font-bold tracking-[-0.02em] text-navy-900">{s.title}</h3>
            <ul className="mt-6 flex flex-col gap-3">
              {s.items.map((it) => (
                <li key={it.label} className="flex items-center gap-3 text-[22px] font-medium text-ink-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-white text-navy-900 shadow-soft">
                    <it.icon className="size-5" />
                  </span>
                  {'to' in it && it.to ? (
                    <Link to={it.to as string} target="_blank" className="hover:text-teal-700 hover:underline">
                      {it.label}
                    </Link>
                  ) : (
                    it.label
                  )}
                </li>
              ))}
            </ul>
            {i < 3 && <ArrowRight className="absolute top-1/2 -right-[22px] z-10 size-8 -translate-y-1/2 rounded-full bg-white p-1 text-ink-4" />}
          </div>
        ))}
        <div className="flex flex-col justify-center rounded-[28px] bg-navy-900 p-8 text-white">
          <p className="text-[20px] font-bold tracking-[0.08em] text-teal-200 uppercase">Goal</p>
          <Waves className="mt-5 size-12 text-teal-200" />
          <p className="mt-5 text-[34px] leading-tight font-bold tracking-[-0.02em]">The operating system for Atlantic Canada’s seafood supply chain</p>
        </div>
      </div>
    </div>
  )
}

function CloseSlide() {
  const cols = [
    {
      title: 'Why now',
      icon: Smartphone,
      points: ['Every fisher already carries a smartphone', 'Buyers and diners increasingly ask where seafood comes from', 'Public vessel-tracking data is openly available'],
    },
    {
      title: 'Business model',
      icon: ListChecks,
      points: ['Free for fishers', 'Subscriptions for buyers and processors', 'Pilot: one port and a handful of buyers'],
    },
    {
      title: 'The ask',
      icon: Handshake,
      points: ['Pilot partners: a port, a co-op, buyers', 'Mentorship on seafood markets and regulation', 'This prize, to fund the pilot'],
      accent: true,
    },
  ]
  return (
    <div className="relative flex h-full flex-col justify-center bg-navy-900 px-24 text-white">
      <WaveLines />
      <div className="grid grid-cols-3 gap-8">
        {cols.map((c) => (
          <div key={c.title} className={cn('rounded-[28px] p-10', c.accent ? 'bg-teal-500' : 'bg-white/[0.06]')}>
            <c.icon className={cn('size-11', c.accent ? 'text-white' : 'text-teal-200')} strokeWidth={1.8} />
            <h3 className="mt-6 text-[40px] font-bold tracking-[-0.02em]">{c.title}</h3>
            <ul className="mt-6 flex flex-col gap-4">
              {c.points.map((p) => (
                <li key={p} className={cn('flex gap-3 text-[24px] leading-snug', c.accent ? 'text-white' : 'text-white/75')}>
                  <span className={cn('mt-3 size-2 shrink-0 rounded-full', c.accent ? 'bg-white' : 'bg-teal-200')} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-16 flex items-center justify-between">
        <p className="text-[40px] leading-tight font-bold tracking-[-0.02em]">
          Today: prices and provenance. <span className="text-teal-200">Next: the operating system for Atlantic seafood supply chains.</span>
        </p>
      </div>
      <div className="absolute top-14 right-24 flex items-center gap-3 text-[20px] text-white/50">
        <Users className="size-5" /> <Trophy className="size-5" /> Thank you
      </div>
    </div>
  )
}

const SLIDES: { title: string; node: () => ReactNode; notes: string }[] = [
  { title: 'Hook', node: () => <HookSlide />, notes: 'Open with the number. Same catch, same morning, 20 km apart: one buyer pays more. Pause on the +$340.' },
  { title: 'Problem', node: () => <ProblemSlide />, notes: 'Lead with 1 and 3 (the dark cards): selling blind and provenance. Those are what the demo solves. Mention the middle one briefly.' },
  { title: 'Solution', node: () => <SolutionSlide />, notes: 'CatchChain in one line. Two pillars are live today; supply resilience is next.' },
  { title: 'Live demo', node: () => <DemoSlide />, notes: 'Click Launch demo (opens a new tab). Market Pulse → best offer → Log this catch → Generate tag → scan the QR on a phone. End on the green badge. The QR on this slide opens the seeded demo tag as a backup.' },
  { title: 'Vision', node: () => <VisionSlide />, notes: 'The locked modules are the roadmap. Optional: click Vessel Watch to show its preview with the “in development” banner.' },
  { title: 'Why now and the ask', node: () => <CloseSlide />, notes: 'Free for fishers, buyers pay. Close with the ask: pilot partners, mentorship, the prize. End on the pitch line.' },
]

/* ------------------------------------------------------------------ player */

function readHash() {
  const n = Number(window.location.hash.replace('#', ''))
  return Number.isInteger(n) && n >= 1 && n <= SLIDES.length ? n - 1 : 0
}

export default function Pitch() {
  const [index, setIndex] = useState(readHash)
  const [dir, setDir] = useState(1)
  const [scale, setScale] = useState(1)
  const [notes, setNotes] = useState(false)
  const touchX = useRef<number | null>(null)

  const go = useCallback((next: number) => {
    setIndex((cur) => {
      const n = Math.max(0, Math.min(SLIDES.length - 1, next))
      setDir(n >= cur ? 1 : -1)
      return n
    })
  }, [])

  useEffect(() => {
    window.history.replaceState(null, '', `#${index + 1}`)
    document.title = `${SLIDES[index].title} · CatchChain pitch`
    return () => {
      document.title = 'CatchChain'
    }
  }, [index])

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, (window.innerHeight - 64) / H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        go(index + 1)
      } else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        go(index - 1)
      } else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(SLIDES.length - 1)
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else if (e.key === 'n' || e.key === 'N') setNotes((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, go])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-navy-950 select-none"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
        touchX.current = null
      }}
    >
      {/* stage */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 overflow-hidden rounded-[6px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={index}
              custom={dir}
              className="absolute inset-0"
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {SLIDES[index].node()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* speaker notes */}
      <AnimatePresence>
        {notes && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="absolute inset-x-4 bottom-20 z-10 mx-auto max-w-3xl rounded-xl border border-white/10 bg-navy-900/95 p-4 text-[14px] leading-relaxed text-white/85 shadow-pop backdrop-blur">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wide text-teal-200 uppercase">Speaker notes · {SLIDES[index].title}</span>
              <button onClick={() => setNotes(false)} className="text-white/50 hover:text-white" aria-label="Hide notes">
                <X className="size-4" />
              </button>
            </div>
            {SLIDES[index].notes}
          </motion.div>
        )}
      </AnimatePresence>

      {/* controls */}
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 text-white/60 sm:px-6">
        <Link to="/" className="hidden text-[13px] font-medium hover:text-white sm:block">
          ← CatchChain
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => go(index - 1)} disabled={index === 0} className="grid size-9 place-items-center rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-30" aria-label="Previous slide">
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button key={s.title} onClick={() => go(i)} aria-label={`Slide ${i + 1}: ${s.title}`} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-teal-500' : 'w-1.5 bg-white/25 hover:bg-white/50')} />
            ))}
          </div>
          <button onClick={() => go(index + 1)} disabled={index === SLIDES.length - 1} className="grid size-9 place-items-center rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-30" aria-label="Next slide">
            <ChevronRight className="size-5" />
          </button>
          <span className="tabular ml-1 text-[13px]">
            {index + 1} / {SLIDES.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setNotes((v) => !v)} className={cn('flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium hover:bg-white/10 hover:text-white', notes && 'text-white')} title="Speaker notes (N)">
            <StickyNote className="size-4" /> <span className="hidden sm:inline">Notes</span>
          </button>
          <button onClick={toggleFullscreen} className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium hover:bg-white/10 hover:text-white" title="Fullscreen (F)">
            <Expand className="size-4" /> <span className="hidden sm:inline">Present</span>
          </button>
        </div>
      </div>
    </div>
  )
}
