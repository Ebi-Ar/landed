import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Printer } from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import { ErrorNote, Loading } from '@/components/ui'
import { labelUrl, publicBase } from '@/lib/labels'
import { supabase } from '@/lib/supabase'

/** Printable sheet of QR labels for one roll. Each QR points to /l/<code> and nothing else. */
export default function PrintRoll() {
  const { rollId } = useParams()
  const [blankOnly, setBlankOnly] = useState(true)
  const q = useQuery({
    queryKey: ['admin', 'roll', rollId],
    queryFn: async () => {
      const roll = await supabase.from('label_rolls').select('*, sellers(display_name)').eq('id', rollId!).single()
      if (roll.error) throw roll.error
      const labels = await supabase.from('labels').select('code, status').eq('roll_id', rollId!).order('code')
      if (labels.error) throw labels.error
      return { roll: roll.data as { size: number; issued_at: string; sellers: { display_name: string } | null }, labels: labels.data as Array<{ code: string; status: string }> }
    },
  })
  if (q.isLoading) return <div className="p-4"><Loading /></div>
  if (q.error) return <div className="p-4"><ErrorNote error={q.error} /></div>
  const labels = q.data!.labels.filter((l) => !blankOnly || l.status === 'blank')
  const seller = q.data!.roll.sellers?.display_name ?? 'Seller'

  return (
    <div className="mx-auto max-w-[900px] bg-white p-4 text-[#0F2A33] print:p-0">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to="/admin" className="link">
            ← Admin
          </Link>
          <h1 className="mt-1">
            Label roll for {seller} · {labels.length} labels
          </h1>
          <p className="sub">QR codes point to {publicBase()}/l/… Print at 100% scale. Sample roll for the prototype.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="small flex items-center gap-1.5">
            <input type="checkbox" checked={blankOnly} onChange={(e) => setBlankOnly(e.target.checked)} /> Blank labels only
          </label>
          <button className="btn sm" onClick={() => window.print()}>
            <Printer /> Print
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 print:grid-cols-4">
        {labels.map((l) => (
          <div key={l.code} className="flex break-inside-avoid flex-col items-center gap-1 rounded-lg border border-dashed border-[#9fb3b8] p-2 text-center">
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <LogoMark size={14} /> Landed
            </div>
            <QRCodeSVG value={labelUrl(l.code)} size={104} level="M" marginSize={1} fgColor="#0F2A33" />
            <div className="mono text-[13px]">{l.code}</div>
            <div className="text-[9px] leading-tight text-[#5A7078]">Scan to see where this food came from</div>
          </div>
        ))}
      </div>
    </div>
  )
}
