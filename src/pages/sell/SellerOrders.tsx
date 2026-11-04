import { useMutation, useQueryClient } from '@tanstack/react-query'
import { OrderProgress } from '@/components/OrderProgress'
import { Alert, ErrorNote, Loading, PageTitle } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useCatalog, useSellerOrders } from '@/lib/queries'
import { errorMessage, supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { money, qtyText, whenText } from '@/lib/format'
import type { OrderStatus } from '@/lib/types'

const DONE_TEXT: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirmed. The buyer has been told.',
  ready: 'Marked ready. The buyer has been told.',
  picked_up: 'Order completed',
  declined: 'Order declined. The buyer has been told.',
}

/** Incoming orders: Confirm, Can't do it, Mark ready for pickup, Mark picked up. */
export default function SellerOrders() {
  const { seller } = useAuth()
  const orders = useSellerOrders(seller?.id)
  const cat = useCatalog()
  const qc = useQueryClient()
  const toast = useToast()
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: OrderStatus }) => {
      const { error } = await supabase.rpc('set_order_status', { p_order: id, p_status: status })
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      toast(DONE_TEXT[v.status] ?? 'Updated')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['seller', 'batches'] })
      qc.invalidateQueries({ queryKey: ['batches'] })
    },
  })

  if (orders.isLoading) return <Loading />
  if (orders.error) return <ErrorNote error={orders.error} />
  const list = orders.data ?? []
  const busy = (id: number) => update.isPending && update.variables?.id === id

  return (
    <>
      <PageTitle title="Orders" sub="Confirm an order, then mark it ready when it’s packed. Buyers pay you at pickup." />
      {update.error && <Alert tone="bad">{errorMessage(update.error)}</Alert>}
      <div className="flex flex-col gap-2.5">
        {list.map((o) => {
          const p = o.batches ? cat.productBySlug[o.batches.product_id] : undefined
          return (
            <div key={o.id} className="card">
              <div className="flex items-center justify-between gap-2">
                <b>{p ? `${qtyText(o.qty, p.unit)} ${p.short_name.toLowerCase()}` : `${o.qty}`}</b>
                <span className="price">{money(o.total)}</span>
              </div>
              <div className="small">
                #{o.id} · {o.buyer_name}
              </div>
              <div className="small">
                Pickup at {o.pickup_place} · {o.pickup_when || 'time to be agreed'} · ordered {whenText(o.created_at).toLowerCase()}
              </div>
              {o.status === 'declined' ? <span className="badge bad">Declined</span> : <OrderProgress status={o.status} />}
              {o.status === 'ordered' && (
                <div className="flex gap-2">
                  <button className="btn sm" disabled={busy(o.id)} onClick={() => update.mutate({ id: o.id, status: 'confirmed' })}>
                    Confirm
                  </button>
                  <button className="btn sm alt" disabled={busy(o.id)} onClick={() => update.mutate({ id: o.id, status: 'declined' })}>
                    Can’t do it
                  </button>
                </div>
              )}
              {o.status === 'confirmed' && (
                <button className="btn sm kelp" disabled={busy(o.id)} onClick={() => update.mutate({ id: o.id, status: 'ready' })}>
                  Mark ready for pickup
                </button>
              )}
              {o.status === 'ready' && (
                <button className="btn sm" disabled={busy(o.id)} onClick={() => update.mutate({ id: o.id, status: 'picked_up' })}>
                  Mark picked up
                </button>
              )}
              {o.status === 'picked_up' && <span className="badge">Completed</span>}
            </div>
          )
        })}
        {!list.length && <p className="sub">No orders yet. They show up here as soon as a buyer orders.</p>}
      </div>
    </>
  )
}
