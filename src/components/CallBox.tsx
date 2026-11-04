import { MessageSquare, Phone } from 'lucide-react'
import { useToast } from '@/lib/toast'
import { telHref } from '@/lib/format'

/** Big Call button with the number, or Message when the seller hides their phone. */
export function CallBox({ phone, big }: { phone: string | null | undefined; big?: boolean }) {
  const toast = useToast()
  if (!phone)
    return (
      <div className="callbox">
        <span className="small">This seller prefers messages</span>
        <button className="btn sm alt" onClick={() => toast('Messaging comes with the pilot. Use the order notes for now.')}>
          <MessageSquare /> Message
        </button>
      </div>
    )
  return (
    <div className="callbox">
      <div>
        <div className="small">Call before you go</div>
        <div className="num">{phone}</div>
      </div>
      <a className={big ? 'btn kelp w-auto!' : 'btn sm kelp'} href={telHref(phone)}>
        <Phone /> Call
      </a>
    </div>
  )
}
