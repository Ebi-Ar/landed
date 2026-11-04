import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { CallBox } from '@/components/CallBox'
import { OrderProgress, STATUS_TEXT } from '@/components/OrderProgress'
import { ErrorNote, Loading, PageTitle } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useBuyerOrders, useCatalog } from '@/lib/queries'
import { money, qtyText } from '@/lib/format'

/** Buyer's pickup orders with live status from the seller. */
export default function Orders() {
  const { userId } = useAuth()
  const orders = useBuyerOrders(userId)
  const cat = useCatalog()
  if (orders.isLoading) return <Loading />
  if (orders.error) return <ErrorNote error={orders.error} />
  const list = orders.data ?? []
  if (!list.length)
    return (
      <>
        <PageTitle title="Your orders" sub="Nothing ordered yet." />
        <div className="card">
          <p className="sub m-0!">Find something on the map or in Fresh. Your pickup orders show up here, with updates from the seller.</p>
        </div>
        <Link className="btn" to="/map">
          Open the map
        </Link>
      </>
    )
  return (
    <>
      <PageTitle title="Your orders" sub="Show the order number when you pick up. You pay the seller at pickup." />
      <div className="flex flex-col gap-2.5">
        {list.map((o) => {
          const p = o.batches ? cat.productBySlug[o.batches.product_id] : undefined
          const s = cat.sellerById[o.seller_id]
          return (
            <div key={o.id} className="card">
              <div className="flex items-center justify-between gap-2">
                <b>
                  {p ? `${qtyText(o.qty, p.unit)} ${p.short_name.toLowerCase()}` : `${o.qty} items`}
                </b>
                <span className="price">{money(o.total)}</span>
              </div>
              <div className="small">
                Order #{o.id} · {s?.display_name ?? 'Seller'}
              </div>
              {o.status === 'declined' ? (
                <span className="badge bad">{STATUS_TEXT.declined}</span>
              ) : (
                <>
                  <OrderProgress status={o.status} />
                  <div>
                    <span className={`badge ${o.status === 'ready' ? 'fresh' : o.status === 'picked_up' ? '' : 'tide'}`}>{STATUS_TEXT[o.status]}</span>
                  </div>
                </>
              )}
              <div className="small flex items-start gap-1.5">
                <MapPin className="size-4 flex-none" />
                Pickup at {o.pickup_place}
                {o.pickup_when ? ` · ${o.pickup_when}` : ''}
              </div>
              {o.status !== 'picked_up' && o.status !== 'declined' && <CallBox phone={s?.phone} />}
            </div>
          )
        })}
      </div>
    </>
  )
}
