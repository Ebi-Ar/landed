import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CircleX, ScanLine, ShieldCheck } from 'lucide-react'
import { QrScanner } from '@/components/QrScanner'
import { Sheet } from '@/components/Sheet'
import { PageTitle } from '@/components/ui'
import { normalizeCode } from '@/lib/labels'
import { useToast } from '@/lib/toast'

const SAMPLES = [
  { code: 'LD-8F3K2Q', text: 'A real label on today’s lobster', tone: 'kelp', Icon: ShieldCheck },
  { code: 'LD-0X4K8L', text: 'A real label that someone copied', tone: 'warn', Icon: AlertTriangle },
  { code: 'LD-QQ7Z2W', text: 'A fake, homemade label', tone: 'bad', Icon: CircleX },
] as const

export default function Verify() {
  const [code, setCode] = useState('')
  const [scan, setScan] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const go = (raw: string) => {
    const c = normalizeCode(raw)
    if (!c) return toast('Type a label code first')
    navigate(`/l/${encodeURIComponent(c)}`)
  }
  return (
    <>
      <PageTitle title="Is it really local?" sub="Scan the Landed label on a box, bag or menu, or type its code, to see who caught or grew it." />
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          go(code)
        }}
      >
        <label className="field" htmlFor="code">
          Label code
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="LD-8F3K2Q" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </label>
        <button className="btn" type="submit">
          Check this label
        </button>
        <button className="btn alt" type="button" onClick={() => setScan(true)}>
          <ScanLine /> Scan with camera
        </button>
        <p className="small m-0">Your phone’s normal camera works too: it opens the label page directly.</p>
      </form>
      <h2>Try a sample</h2>
      <div className="flex flex-col gap-2.5">
        {SAMPLES.map(({ code: c, text, tone, Icon }) => (
          <button key={c} className="lock solid" onClick={() => go(c)}>
            <div className="ic" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}>
              <Icon />
            </div>
            <div className="flex flex-col">
              <span className="name mono">{c}</span>
              <span className="small">{text}</span>
            </div>
          </button>
        ))}
      </div>
      <Sheet open={scan} onClose={() => setScan(false)} label="Scan a label">
        <h2>Scan a Landed label</h2>
        {scan && (
          <QrScanner
            onResult={(text) => {
              setScan(false)
              go(text)
            }}
          />
        )}
      </Sheet>
    </>
  )
}
