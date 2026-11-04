import type { OrderStatus } from '@/lib/types'

const STEPS: OrderStatus[] = ['ordered', 'confirmed', 'ready', 'picked_up']

export const STATUS_TEXT: Record<OrderStatus, string> = {
  ordered: 'Waiting for the seller to confirm',
  confirmed: 'Confirmed by the seller',
  ready: 'Ready for pickup',
  picked_up: 'Picked up',
  declined: 'The seller can’t do this order',
}

/** Ordered → Confirmed → Ready for pickup → Picked up. */
export function OrderProgress({ status }: { status: OrderStatus }) {
  const i = STEPS.indexOf(status)
  return (
    <div role="img" aria-label={`Order progress: ${STATUS_TEXT[status]}`} className="flex flex-col gap-1">
      <div className="prog">
        {STEPS.map((s, k) => (
          <span key={s} className={k <= i ? 'on' : ''} />
        ))}
      </div>
      <div className="progl" aria-hidden>
        <span>Ordered</span>
        <span>Confirmed</span>
        <span>Ready</span>
        <span>Picked up</span>
      </div>
    </div>
  )
}
