import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowRight, Award, BadgeCheck, EyeOff, LineChart, Lock, PlayCircle, QrCode, ShieldCheck, Ship, Truck, Waves } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { SpeciesArt } from '@/components/SpeciesArt'
import { useApp } from '@/lib/store'
import { LOCKED } from '@/lib/modules'
import { cn } from '@/lib/utils'

const DEMO_TAG = 'CC-25-0412-SHD'

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-teal-500' : 'bg-white/20')}>
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow', checked ? 'right-0.5' : 'left-0.5')} />
    </button>
  )
}

function HeroVisual() {
  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[460px] sm:h-[420px]">
      {/* best offer card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="absolute top-0 left-0 w-[88%] rounded-2xl border border-white/10 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11.5px] font-semibold text-teal-700">
            <Award className="size-3" /> Best offer today
          </span>
          <span className="text-[12px] text-ink-3">Lobster</span>
        </div>
        <div className="mt-3 flex items-end gap-1.5">
          <span className="tabular text-[38px] leading-none font-extrabold tracking-[-0.04em] text-navy-900">$8.10</span>
          <span className="mb-0.5 text-[14px] text-ink-3">/lb</span>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-3">Côte Acadienne Co-op · Cap-Pelé · 20 km</p>
        <div className="mt-4 rounded-xl bg-verified-50 px-3.5 py-2.5 text-[13px] text-ink-2">
          You’d earn <b className="tabular text-[16px] text-verified">+$340</b> on 400 lb vs your usual $7.25
        </div>
        <svg viewBox="0 0 300 60" className="mt-4 h-14 w-full" aria-hidden>
          <path d="M0 48 C30 46 45 40 70 42 S120 34 150 30 S210 26 240 18 S280 10 300 8" fill="none" stroke="#13A89E" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M0 52 C40 50 70 50 100 47 S170 44 200 42 S260 38 300 36" fill="none" stroke="#0B2545" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </motion.div>
      {/* tag card */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }} className="absolute right-0 bottom-0 w-[62%] rounded-2xl border border-white/10 bg-white p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2.5">
          <SpeciesArt kind="lobster" size={36} rounded="rounded-lg" />
          <div className="min-w-0">
            <p className="truncate font-mono text-[12px] font-bold text-navy-900">{DEMO_TAG}</p>
            <p className="text-[11.5px] text-ink-3">400 lb · Marie-Claire II</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <QRCodeSVG value={`https://catchchain.app/trace/${DEMO_TAG}`} size={76} fgColor="#0B2545" marginSize={0} />
          <div className="flex-1 rounded-lg bg-verified px-2.5 py-2 text-white">
            <BadgeCheck className="size-4" />
            <p className="mt-1 text-[12px] leading-tight font-bold">Verified local catch</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function Landing() {
  const { demo, setDemo, resetDemo } = useApp()
  const navigate = useNavigate()

  const launch = () => {
    if (demo) {
      resetDemo()
      navigate('/app/market?species=lobster')
    } else navigate('/app')
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-[0.08]" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M0 ${40 + i * 30} C 240 ${10 + i * 30}, 480 ${70 + i * 30}, 720 ${40 + i * 30} S 1200 ${10 + i * 30}, 1440 ${40 + i * 30}`} fill="none" stroke="#fff" strokeWidth="2" />
          ))}
        </svg>
        <nav className="relative mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Logo light />
          <div className="flex items-center gap-1 sm:gap-6">
            <a href="#problem" className="hidden text-[14px] font-medium text-white/65 hover:text-white sm:block">Problem</a>
            <a href="#product" className="hidden text-[14px] font-medium text-white/65 hover:text-white sm:block">Product</a>
            <a href="#roadmap" className="hidden text-[14px] font-medium text-white/65 hover:text-white sm:block">Roadmap</a>
            <Button size="sm" onClick={launch}>
              Launch demo
            </Button>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16 lg:pb-28">
          <div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12.5px] font-medium text-teal-200">
              <Waves className="size-3.5" /> Seafood intelligence for Atlantic Canada
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-5 text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-[56px]">
              Know what your catch is worth. <span className="text-teal-200">Prove where it came from.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/70">
              CatchChain shows fishers live dock prices across ports and buyers, and gives every catch a scannable tag so restaurants can verify it’s local and legal.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={launch} className="h-13 px-6 text-[16px]">
                <PlayCircle className="size-5!" /> Launch demo
              </Button>
              <Link to={`/trace/${DEMO_TAG}`}>
                <Button size="lg" variant="ghost" className="h-13 w-full text-white/80 hover:bg-white/10 hover:text-white sm:w-auto">
                  <QrCode /> Open a traced catch
                </Button>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-6 flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
              <Switch checked={demo} onChange={setDemo} label="Demo mode" />
              <div className="text-[13px]">
                <p className="font-semibold">Demo mode {demo ? 'on' : 'off'}</p>
                <p className="text-white/55">{demo ? 'Resets sample data and opens Marc’s lobster story in Market Pulse.' : 'Opens the dashboard with your current data.'}</p>
              </div>
            </motion.div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <p className="text-[13px] font-semibold tracking-wide text-teal-600 uppercase">The problem</p>
        <h2 className="mt-2 max-w-2xl text-[30px] leading-tight font-bold tracking-[-0.025em] text-navy-900 sm:text-[36px]">Atlantic fisheries run on weak data, and it costs fishers money.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: EyeOff, title: 'Fishers sell blind', body: 'Most small fishers sell to the buyer at their wharf, at that buyer’s price. They rarely see what the next port is paying today.' },
            { icon: ShieldCheck, title: 'Provenance is hard to prove', body: 'Illegal, unreported fishing and mislabeling let poached product into legitimate supply chains. A restaurant can’t easily check.' },
            { icon: Truck, title: 'Local seafood leaves, supply is fragile', body: 'Local catch ships out while imports come in, and a few buyers, trucks and hubs carry it all. One storm stops distribution.' },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-surface/60 p-6">
              <div className="grid size-10 place-items-center rounded-xl bg-white text-navy-900 shadow-soft">
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-[17px] font-bold text-navy-900">{p.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VALUE PROPS */}
      <section id="product" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
          <p className="text-[13px] font-semibold tracking-wide text-teal-600 uppercase">What CatchChain does</p>
          <h2 className="mt-2 max-w-2xl text-[30px] leading-tight font-bold tracking-[-0.025em] text-navy-900 sm:text-[36px]">Prices and provenance today. The operating system for Atlantic seafood supply next.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: LineChart, title: 'Price intelligence', body: 'Dock prices by species, port and buyer with trends and a best-offer alert that shows exactly how much more a catch could earn.', stat: '+$340', statLabel: 'on one 400 lb lobster catch (sample)' },
              { icon: BadgeCheck, title: 'Verified provenance', body: 'Every catch gets a tag and QR code. Scan it to see the vessel, fishing area, port and journey, with a clear verified badge.', stat: '10 sec', statLabel: 'from scan to proof of origin' },
              { icon: Ship, title: 'Supply resilience', body: 'Next: early warnings when a port, buyer or route goes down, suspicious vessel activity near catch zones, and alternate routes.', stat: 'Pilot', statLabel: 'in development', locked: true },
            ].map((v) => (
              <div key={v.title} className="flex flex-col rounded-2xl border border-line bg-white p-6">
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
                    <v.icon className="size-5" />
                  </div>
                  {v.locked && (
                    <span className="flex items-center gap-1 rounded-full bg-navy-900 px-2 py-0.5 text-[10.5px] font-semibold text-white uppercase">
                      <Lock className="size-2.5" /> Soon
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-[17px] font-bold text-navy-900">{v.title}</h3>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink-3">{v.body}</p>
                <div className="mt-6 border-t border-line pt-4">
                  <p className="tabular text-[24px] font-extrabold tracking-[-0.03em] text-navy-900">{v.stat}</p>
                  <p className="text-[12.5px] text-ink-3">{v.statLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="text-[13px] font-semibold tracking-wide text-teal-600 uppercase">Roadmap</p>
            <h2 className="mt-2 text-[30px] leading-tight font-bold tracking-[-0.025em] text-navy-900 sm:text-[36px]">Four modules live. Four more in development.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-3">Market Pulse, Catch Log, Provenance and the Buyer view work end to end on sample data. The rest are designed and previewed in the app, planned for the pilot phase.</p>
            <Button size="lg" className="mt-6" onClick={launch}>
              Launch demo <ArrowRight />
            </Button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {LOCKED.map((m) => (
              <Link key={m.key} to={m.to} className="group flex items-start gap-3 rounded-xl border border-line p-4 transition-all hover:border-line-strong hover:shadow-soft">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-teal-200">
                  <m.icon className="size-4" />
                </div>
                <div>
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-navy-900">
                    {m.label}
                    <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink-3 uppercase">Soon</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{m.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-8 text-[12.5px] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo size={22} />
          <p>
            Hackathon build. All prices, people and catches are illustrative sample data. ·{' '}
            <Link to="/pitch" className="font-medium text-teal-600 hover:text-teal-700">
              Pitch deck
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
