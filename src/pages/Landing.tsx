import { Link } from 'react-router-dom'
import { BadgeCheck, ChartLine, MapPin, Phone, ScanLine, ShoppingBag, Tag } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ProductIcon } from '@/components/ProductIcon'
import { useAuth } from '@/lib/auth'

const BUY = [
  { Icon: MapPin, title: 'Find it on a map', text: 'Farms, wharves, pickup spots and markets near you. A filled pin means the seller is there now.' },
  { Icon: ShoppingBag, title: 'Order for pickup', text: 'Reserve what you want and pay the seller when you pick it up. No card needed.' },
  { Icon: ScanLine, title: 'Check any label', text: 'Scan the Landed label with your phone camera to see who caught or grew it, and when.' },
]
const SELL = [
  { Icon: ChartLine, title: 'Know the fair price', text: 'The Landed Price Index shows today’s local range for every product, from real sales.' },
  { Icon: Tag, title: 'One roll of labels', text: 'Blank labels work for lobster, potatoes or honey. Scan one, take a photo, and you’re live.' },
  { Icon: Phone, title: 'Buyers call you', text: 'Show your number, switch on “Available now”, and nearby buyers know they can come.' },
]

export default function Landing() {
  const { userId, isSeller } = useAuth()
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-3 lg:px-8">
        <Logo />
        {userId ? (
          <Link to={isSeller ? '/sell' : '/map'} className="btn sm alt">
            Open Landed
          </Link>
        ) : (
          <Link to="/signin" className="btn sm alt">
            Sign in
          </Link>
        )}
      </header>

      <main className="mx-auto flex max-w-[1080px] flex-col gap-10 px-4 pt-6 pb-16 lg:px-8 lg:pt-14">
        <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-4">
            <span className="badge tide">New Brunswick · prototype</span>
            <h1 className="text-[36px]! leading-[1.05]! lg:text-[52px]!">Local food, straight from the boat and the field.</h1>
            <p className="max-w-[520px] text-[17px] text-muted">
              Landed connects New Brunswick fishers and farmers with the people who eat their food. Find it on a map, order for pickup, and scan any label to
              see exactly where it came from.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/map" className="btn sm:w-auto! sm:px-6!">
                <MapPin /> Find local food
              </Link>
              <Link to={userId ? '/sell/join' : '/signup?role=seller'} className="btn alt sm:w-auto! sm:px-6!">
                <Tag /> Sell on Landed
              </Link>
            </div>
            <p className="small">All people, prices and places in this prototype are sample data until the pilot.</p>
          </div>
          <div className="card gap-3! p-5!" aria-label="Example: a verified lobster label">
            <div className="flex items-center gap-3">
              <div className="tile sea">
                <ProductIcon icon="lobster" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="badge">
                  <BadgeCheck /> Verified local catch
                </span>
                <b className="font-display text-[19px]">Live lobster</b>
                <span className="mono small">LD-8F3K2Q</span>
              </div>
            </div>
            <ol className="timeline">
              <li>
                <div>
                  <b>Caught</b>
                  <span>Lobster Fishing Area 25 · Marie-Claire II</span>
                </div>
              </li>
              <li>
                <div>
                  <b>Landed</b>
                  <span>Pointe-du-Chêne wharf, today</span>
                </div>
              </li>
              <li className="todo">
                <div>
                  <b>With you</b>
                  <span>After pickup</span>
                </div>
              </li>
            </ol>
            <Link to="/verify" className="link text-[13px]!">
              Try checking a label →
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px]!">For buyers: families, restaurants and grocers</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {BUY.map(({ Icon, title, text }) => (
              <div key={title} className="card">
                <Icon className="size-6 text-tide" />
                <h3 className="text-[15px]!">{title}</h3>
                <p className="small m-0">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px]!">For fishers and farmers</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {SELL.map(({ Icon, title, text }) => (
              <div key={title} className="card">
                <Icon className="size-6 text-kelp" />
                <h3 className="text-[15px]!">{title}</h3>
                <p className="small m-0">{text}</p>
              </div>
            ))}
          </div>
          <p className="small">New sellers are checked before they can list: fishing licence and boat, or farm registration. Only approved sellers can activate labels.</p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-2 px-4 py-6 text-[12.5px] text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Logo size={20} className="text-[16px]!" />
          <p className="m-0">Built by Fundy Five for H2A Canada. Prototype: sample data until the pilot.</p>
        </div>
      </footer>
    </div>
  )
}
