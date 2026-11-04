import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { BadgeCheck, Camera, ScanLine, Tag } from 'lucide-react'
import { CameraCapture, type CapturedPhoto } from '@/components/CameraCapture'
import { PendingNote } from '@/components/PendingNote'
import { ProductIcon } from '@/components/ProductIcon'
import { QrScanner } from '@/components/QrScanner'
import { Sheet } from '@/components/Sheet'
import { Alert, CheckList } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { labelUrl, normalizeCode } from '@/lib/labels'
import { useBlankLabelCount, useCatalog, usePriceIndex, useSellerProducts } from '@/lib/queries'
import { errorMessage, PHOTO_BUCKET, supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { money, pinKind, pinWord, qtyText, unitPlural } from '@/lib/format'
import type { CheckResult } from '@/lib/types'

type Step = 'scan' | 'form' | 'checking' | 'done' | 'held'

interface Result {
  batch_id: string
  status: 'live' | 'held'
  code: string
  checks: CheckResult[]
}

/** Placeholder pattern for the blank-label illustration (not a real code). */
function BlankLabelArt() {
  return (
    <div className="grid size-[84px] flex-none place-items-center rounded-lg bg-white p-1.5" aria-hidden>
      <svg viewBox="0 0 29 29" className="h-full w-full" shapeRendering="crispEdges">
        {[0, 22].flatMap((x) => [0, 22].map((y) => (x === 22 && y === 22 ? null : <g key={`${x}${y}`}><rect x={x} y={y} width="7" height="7" fill="#0F2A33" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" /><rect x={x + 2} y={y + 2} width="3" height="3" fill="#0F2A33" /></g>)))}
        <rect x="10" y="10" width="9" height="9" fill="none" stroke="#9fb3b8" strokeDasharray="1.5 1.5" />
      </svg>
    </div>
  )
}

export default function AddBatch() {
  const { seller, location, isApprovedSeller } = useAuth()
  const cat = useCatalog()
  const { summary } = usePriceIndex()
  const products = useSellerProducts(seller?.id)
  const labels = useBlankLabelCount(seller?.id)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState<Step>('scan')
  const [code, setCode] = useState('')
  const [typed, setTyped] = useState('')
  const [scanFor, setScanFor] = useState<null | 'first' | 'extra'>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<string | null>(null)
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [pickup, setPickup] = useState('pin')
  const [origin, setOrigin] = useState(seller?.default_origin ?? '')
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null)
  const [camera, setCamera] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [labelsOnBatch, setLabelsOnBatch] = useState(1)

  const approved = useMemo(
    () => (products.data ?? []).filter((p) => p.approved).map((p) => cat.productBySlug[p.product_id]).filter(Boolean).sort((a, b) => a.sort - b.sort),
    [products.data, cat.productBySlug],
  )
  const p = product ? cat.productBySlug[product] : undefined
  const sum = product ? summary?.[product] : undefined
  const me = seller ? cat.sellerById[seller.id] : undefined
  const pickupOptions = [
    { k: 'pin', t: location?.place_name ?? 'Your pin', d: location ? `${pinWord(pinKind(location))} · ${location.hours_text}` : '' },
    ...(me?.market_ids ?? []).map((m) => ({ k: 'market:' + m, t: cat.marketById[m]?.name ?? m, d: `Market · ${cat.marketById[m]?.days_text ?? ''}` })),
  ]

  // Reveal the server's check results one at a time, like the mockup.
  useEffect(() => {
    if (step !== 'checking' || !result) return
    if (revealed >= result.checks.length) {
      const t = window.setTimeout(() => setStep(result.status === 'live' ? 'done' : 'held'), 500)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setRevealed((n) => n + 1), 420)
    return () => window.clearTimeout(t)
  }, [step, result, revealed])

  useEffect(
    () => () => {
      if (photo?.url) URL.revokeObjectURL(photo.url)
    },
    [photo],
  )

  function reset() {
    setStep('scan')
    setCode('')
    setTyped('')
    setError(null)
    setProduct(null)
    setQty('')
    setPrice('')
    setPickup('pin')
    setPhoto(null)
    setResult(null)
    setRevealed(0)
    setLabelsOnBatch(1)
    setOrigin(seller?.default_origin ?? '')
  }

  async function takeLabel(raw: string) {
    const c = normalizeCode(raw)
    if (!c) return setError('Type the code printed under the QR')
    setBusy(true)
    setError(null)
    const { data, error: e } = await supabase.rpc('check_blank_label', { p_code: c })
    setBusy(false)
    if (e) return setError(errorMessage(e))
    if (!data?.ok) return setError(data?.message ?? 'This label can’t be used.')
    setCode(data.code)
    setTyped('')
    setStep('form')
  }

  async function addExtra(raw: string) {
    if (!result) return
    setBusy(true)
    setError(null)
    const { data, error: e } = await supabase.rpc('add_label_to_batch', { p_code: normalizeCode(raw), p_batch: result.batch_id })
    setBusy(false)
    if (e) return setError(errorMessage(e))
    setLabelsOnBatch(data.labels_on_batch)
    qc.invalidateQueries({ queryKey: ['seller', 'labels'] })
    toast(`Label ${data.code} added to this batch`)
  }

  async function goLive() {
    setError(null)
    const q = Number(qty)
    const pr = Number(price)
    if (!p) return setError('Pick what this batch is')
    if (!q || q <= 0) return setError('Add how much you have')
    if (!pr || pr <= 0) return setError('Add your price')
    if (!photo) return setError('Take a photo in Landed first')
    setBusy(true)
    try {
      const path = `${seller!.id}/${crypto.randomUUID()}.jpg`
      const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, photo.blob, { contentType: 'image/jpeg', upsert: false })
      if (up.error) throw up.error
      const { data, error: e } = await supabase.rpc('create_batch', {
        p_code: code,
        p_product: p.slug,
        p_qty: q,
        p_price: pr,
        p_pickup: pickup,
        p_photo_path: path,
        p_photo_taken_at: photo.takenAt,
        p_photo_lat: photo.lat,
        p_photo_lng: photo.lng,
        p_origin: origin,
        p_source: null,
      })
      if (e) throw e
      setResult(data as Result)
      setRevealed(0)
      setStep('checking')
      qc.invalidateQueries({ queryKey: ['batches'] })
      qc.invalidateQueries({ queryKey: ['seller'] })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!seller) return null
  if (!isApprovedSeller)
    return (
      <>
        <h1>Add a batch</h1>
        <PendingNote status={seller.status} />
      </>
    )

  const scanSheet = (
    <Sheet open={scanFor !== null} onClose={() => setScanFor(null)} label="Scan a blank label">
      <h2>Scan a blank label</h2>
      {scanFor && (
        <QrScanner
          onResult={(text) => {
            const which = scanFor
            setScanFor(null)
            if (which === 'extra') addExtra(text)
            else takeLabel(text)
          }}
        />
      )}
    </Sheet>
  )

  if (step === 'scan')
    return (
      <>
        <div>
          <h1>Add a batch</h1>
          <p className="sub">Peel a blank label off your Landed roll and scan it. You’ll pick what it is next.</p>
        </div>
        <div className="labelcard">
          <BlankLabelArt />
          <div>
            <div className="small">Blank label</div>
            <div className="mono">LD-??????</div>
            <div className="small mt-1">Not set up yet · works for any product you sell</div>
          </div>
        </div>
        <div className="card gap-1!">
          <span className="small">Labels left on your roll</span>
          <span className="stat">{labels.data ?? '–'}</span>
          <span className="small">One roll works for lobster, carrots, apples or anything else you’re approved to sell.</span>
        </div>
        {error && <Alert tone="bad">{error}</Alert>}
        <button className="btn buoy" disabled={busy || labels.data === 0} onClick={() => setScanFor('first')}>
          <ScanLine /> Scan a blank label
        </button>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            takeLabel(typed)
          }}
        >
          <label className="field">
            Or type the code under the QR
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="LD-XXXXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} />
          </label>
          <button className="btn alt" disabled={busy || !typed.trim()}>
            {busy ? 'Checking…' : 'Use this label'}
          </button>
        </form>
        {labels.data === 0 && (
          <Alert tone="warn">
            Your roll is empty. <Link className="link" to="/sell/profile">Order a new roll in Profile</Link>.
          </Alert>
        )}
        {scanSheet}
      </>
    )

  if (step === 'form')
    return (
      <>
        <button className="link" onClick={reset}>
          ← Cancel
        </button>
        <div className="labelcard">
          <div className="grid size-11 place-items-center rounded-xl bg-kelp-soft text-kelp">
            <Tag className="size-5" />
          </div>
          <div>
            <div className="mono">{code}</div>
            <div className="small">Not set up yet · belongs to your account</div>
          </div>
        </div>
        <div>
          <h2 className="mb-2">What is this batch?</h2>
          <div className="grid grid-cols-3 gap-2">
            {approved.map((x) => (
              <button
                key={x.slug}
                type="button"
                className={`pick ${x.category}`}
                aria-pressed={product === x.slug}
                onClick={() => {
                  setProduct(x.slug)
                  const s = summary?.[x.slug]
                  setPrice(s ? s.avg.toFixed(2) : '')
                }}
              >
                <ProductIcon icon={x.icon} />
                {x.short_name}
              </button>
            ))}
          </div>
          <p className="small mt-1.5">Selling something new? Ask for it under Profile first, so it can be checked.</p>
        </div>
        {p && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="field">
                How much ({unitPlural(p.unit)})
                <input type="number" inputMode="decimal" min="1" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 100" />
              </label>
              <label className="field">
                Your price ($/{p.unit})
                <input type="number" inputMode="decimal" min="0" step="0.05" value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
            </div>
            {sum && (
              <div className="hint">
                Fair price nearby: <b>{money(sum.low)}–{money(sum.high)}</b> per {p.unit}, based on {sum.sales} sales and {sum.reports} price reports this week. Most
                buyers look for a “Fair price” badge.
              </div>
            )}
            <div>
              <h2 className="mb-2">Where can buyers pick it up?</h2>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Pickup place">
                {pickupOptions.map((o) => (
                  <button key={o.k} type="button" role="radio" aria-checked={pickup === o.k} className="opt" onClick={() => setPickup(o.k)}>
                    <span className="r" />
                    <span>
                      {o.t}
                      <small>{o.d}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              {p.category === 'sea' ? 'Where it was caught' : 'Where it was grown'}
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder={p.category === 'sea' ? 'e.g. Lobster Fishing Area 25' : 'e.g. Field 2'} />
            </label>
            <div>
              <h2 className="mb-2">Photo</h2>
              {photo ? (
                <div className="flex items-center gap-3">
                  <img src={photo.url} alt="Your batch photo" className="size-24 rounded-xl object-cover" />
                  <div className="flex flex-col gap-1">
                    <span className="small">
                      Taken in Landed · just now · {photo.lat != null ? 'location saved' : <b className="text-warn">no location</b>}
                    </span>
                    <button type="button" className="link text-[13px]!" onClick={() => setCamera(true)}>
                      Retake
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button type="button" className="btn alt" onClick={() => setCamera(true)}>
                    <Camera /> Take photo in Landed
                  </button>
                  <p className="small mt-1.5">Photos come from the Landed camera only, so the time and place are stamped automatically.</p>
                </>
              )}
            </div>
            {error && <Alert tone="bad">{error}</Alert>}
            <button className="btn buoy" disabled={busy} onClick={goLive}>
              {busy ? 'Uploading…' : 'Check and go live'}
            </button>
          </>
        )}
        <Sheet open={camera} onClose={() => setCamera(false)} label="Take a photo">
          <h2>Take a photo of the batch</h2>
          {camera && (
            <CameraCapture
              onCapture={(ph) => {
                setPhoto(ph)
                setCamera(false)
              }}
            />
          )}
        </Sheet>
      </>
    )

  if (step === 'checking' && result)
    return (
      <>
        <div>
          <h1>Checking your batch</h1>
          <p className="sub">This takes a few seconds.</p>
        </div>
        <div className="card">
          <CheckList items={result.checks} revealed={revealed} />
        </div>
      </>
    )

  if (step === 'held' && result)
    return (
      <>
        <Alert tone="warn" title="Saved, but held for a review">
          Not every check passed, so this batch isn’t on the map yet. The Landed team will look at it. Your label {result.code} stays blank until then.
        </Alert>
        <div className="card">
          <CheckList items={result.checks} />
        </div>
        <button className="btn" onClick={reset}>
          Add a different batch
        </button>
        <Link className="btn alt" to="/sell">
          Back to Today
        </Link>
      </>
    )

  if (step === 'done' && result && p)
    return (
      <>
        <div className="card items-center text-center">
          <span className="badge px-3! py-[5px]! text-[12.5px]!">
            <BadgeCheck className="size-3.5!" /> Live on the map
          </span>
          <h1>Your {p.short_name.toLowerCase()} is on sale</h1>
          <p className="sub m-0!">Stick the label on the box or bag. Anyone who scans it sees where it came from.</p>
          <div className="labelcard w-full text-left">
            <div className="flex-none rounded-lg bg-white p-1.5">
              <QRCodeSVG value={labelUrl(result.code)} size={108} level="M" marginSize={0} fgColor="#0F2A33" title={`QR code for label ${result.code}`} />
            </div>
            <div>
              <div className="mono">{result.code}</div>
              <div className="small">
                {p.short_name} · {qtyText(qty, p.unit)}
              </div>
              <div className="small">
                {labelsOnBatch} label{labelsOnBatch > 1 ? 's' : ''} on this batch
              </div>
            </div>
          </div>
          {error && <Alert tone="bad">{error}</Alert>}
          <button className="btn alt" disabled={busy} onClick={() => setScanFor('extra')}>
            <ScanLine /> Add another label to this batch
          </button>
          <form
            className="flex w-full gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim()) addExtra(typed).then(() => setTyped(''))
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-[14px]"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="or type the next code"
              aria-label="Next label code"
              autoCapitalize="characters"
              autoComplete="off"
            />
            <button className="btn sm alt" disabled={busy || !typed.trim()}>
              Add
            </button>
          </form>
          <div className="grid w-full grid-cols-2 gap-2">
            <Link className="btn alt" to={`/l/${result.code}`}>
              Preview label page
            </Link>
            <button className="btn alt" onClick={() => navigate(`/map?pin=${seller.id}&focus=${seller.id}`)}>
              See it on the map
            </button>
          </div>
          <button className="btn" onClick={reset}>
            Add a different batch
          </button>
        </div>
        {scanSheet}
      </>
    )

  return null
}
