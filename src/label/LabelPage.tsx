import { useEffect, useState } from 'react'
import { AlertTriangle, BadgeCheck, CircleX, Phone } from 'lucide-react'
import { ProductTile } from '@/components/ProductIcon'
import { deviceId, normalizeCode } from '@/lib/labels'
import { qtyText, telHref, whenText } from '@/lib/format'
import type { LabelLookup } from '@/lib/types'

/**
 * The public label page. Looks the code up on the server every time (nothing
 * about the food is in the QR link) and shows the journey, the seller and any
 * warnings. Every view is recorded as a scan.
 */
// One lookup per page view: a quick remount (React StrictMode in development)
// reuses the request in flight instead of recording a second scan.
const inflight = new Map<string, Promise<LabelLookup>>()

function lookup(code: string): Promise<LabelLookup> {
  const have = inflight.get(code)
  if (have) return have
  const p = fetch(`/api/label?code=${encodeURIComponent(code)}&d=${encodeURIComponent(deviceId())}`, { headers: { accept: 'application/json' } })
    .then(async (r) => {
      const body = (await r.json().catch(() => null)) as LabelLookup | null
      return body && body.status ? body : ({ status: 'error', code } as LabelLookup)
    })
    .catch(() => ({ status: 'error', code, message: 'No connection. Check your signal and try again.' }) as LabelLookup)
    .finally(() => window.setTimeout(() => inflight.delete(code), 1500))
  inflight.set(code, p)
  return p
}

export function LabelPage({ code: raw }: { code: string }) {
  const code = normalizeCode(raw)
  const [data, setData] = useState<LabelLookup | null>(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    lookup(code).then((d) => !cancelled && setData(d))
    return () => {
      cancelled = true
    }
  }, [code])

  if (!data)
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <div className="card items-center py-8 text-center">
          <div className="size-20 animate-pulse rounded-xl bg-surface-2" />
          <p className="sub">Checking label {code}…</p>
        </div>
      </div>
    )

  if (data.status !== 'active') return <Problem data={data} />

  const p = data.product!
  const b = data.batch!
  const s = data.seller!
  const sea = p.category === 'sea'
  const copied = data.warnings?.copied
  const cities = data.scans?.cities ?? []
  const farCities = data.warnings?.far_cities?.length ? data.warnings.far_cities : cities
  const scans = data.scans?.count ?? 0

  return (
    <div className="flex flex-col gap-3">
      {copied && (
        <div className="alert warn" role="alert">
          <AlertTriangle />
          <div>
            <b>Warning: this label may have been copied.</b>
            <br />
            {data.sold ? `It was sold to ${data.sold.to}${data.sold.at ? ` on ${whenText(data.sold.at).replace(/,.*/, '')}` : ''}, but it` : 'It'} has been scanned{' '}
            {scans} times{farCities.length ? ` in ${farCities.join(', ')}` : ''}. Ask the seller where this food came from.
          </div>
        </div>
      )}
      {data.warnings?.late && (
        <div className="alert warn" role="status">
          <AlertTriangle />
          <div>
            <b>This batch should be sold out by now.</b>
            <br />
            It was {sea ? 'landed' : 'harvested'} {whenText(b.caught_at).replace(', ', ' at ')}. Old labels can be reused on other food, so ask the seller.
          </div>
        </div>
      )}

      <div className="card items-center text-center">
        <ProductTile icon={p.icon} category={p.category} size={80} />
        {copied ? (
          <span className="badge warn px-3! py-[5px]! text-[12.5px]!">Original label, copy suspected</span>
        ) : (
          <span className="badge px-3! py-[5px]! text-[12.5px]!">
            <BadgeCheck className="size-3.5!" /> Verified local {sea ? 'catch' : 'harvest'}
          </span>
        )}
        <h1>{p.name}</h1>
        <p className="sub mono m-0!">{data.code}</p>
      </div>

      <div className="card">
        <h2>The journey</h2>
        <ol className="timeline mt-1.5">
          <li>
            <div>
              <b>{sea ? 'Caught' : 'Grown'}</b>
              <span>
                {b.origin}
                {sea && b.source ? ` · ${b.source}` : ''}
              </span>
            </div>
          </li>
          <li>
            <div>
              <b>{sea ? 'Landed' : p.harvest_verb}</b>
              <span>{b.when_text ?? whenText(b.caught_at)}</span>
            </div>
          </li>
          <li>
            <div>
              <b>Labelled and listed on Landed</b>
              <span>
                by {s.display_name} · {qtyText(b.qty_total, p.unit)} in this batch
                {b.checks_passed ? ' · passed the automatic checks' : ''}
              </span>
            </div>
          </li>
          {data.sold ? (
            <li>
              <div>
                <b>Sold</b>
                <span>to {data.sold.to}</span>
              </div>
            </li>
          ) : (
            <li className="todo">
              <div>
                <b>With you</b>
                <span>After pickup at {b.pickup_place}</span>
              </div>
            </li>
          )}
        </ol>
      </div>

      <div className="card">
        <dl className="kv">
          <dt>Seller</dt>
          <dd>{s.display_name}</dd>
          <dt>Seller check</dt>
          <dd>{s.verified_note ?? 'Checked by Landed'}</dd>
          <dt>Sold from</dt>
          <dd>
            {s.place_name}, {s.area_label.replace(/^Near /, 'near ')}
          </dd>
          <dt>Scanned</dt>
          <dd>
            {scans} time{scans === 1 ? '' : 's'}
            {cities.length ? ` · ${cities.join(', ')}` : ''}
          </dd>
        </dl>
      </div>

      {s.phone && (
        <div className="callbox">
          <div>
            <div className="small">Questions? Call the seller</div>
            <div className="num">{s.phone}</div>
          </div>
          <a className="btn sm kelp" href={telHref(s.phone)}>
            <Phone /> Call
          </a>
        </div>
      )}
      <p className="sample">Traced by Landed · sample data until the pilot</p>
    </div>
  )
}

function Problem({ data }: { data: LabelLookup }) {
  const code = data.code
  if (data.status === 'not_found')
    return (
      <div className="alert bad" role="alert">
        <CircleX />
        <div>
          <b>This label was never issued by Landed.</b>
          <br />
          The code <span className="mono">{code}</span> isn’t one of ours, so it may be fake. Ask the seller for proof of where the food came from.
        </div>
      </div>
    )
  if (data.status === 'blank')
    return (
      <div className="alert bad" role="alert">
        <CircleX />
        <div>
          <b>This label hasn’t been set up.</b>
          <br />
          <span className="mono">{code}</span> is a real Landed label, but no seller has linked it to any food yet. It may come from a lost or stolen roll. Don’t trust
          it, and ask the seller for proof.
        </div>
      </div>
    )
  if (data.status === 'void')
    return (
      <div className="alert bad" role="alert">
        <CircleX />
        <div>
          <b>This label was cancelled.</b>
          <br />
          Landed cancelled <span className="mono">{code}</span> after a review. Ask the seller where this food came from.
        </div>
      </div>
    )
  if (data.status === 'rate_limited')
    return (
      <div className="alert warn" role="alert">
        <AlertTriangle />
        <div>
          <b>Too many checks from this connection.</b>
          <br />
          Wait a few minutes, then try again.
        </div>
      </div>
    )
  return (
    <div className="alert warn" role="alert">
      <AlertTriangle />
      <div>
        <b>Couldn’t check this label right now.</b>
        <br />
        {data.message ?? 'Try again in a moment.'}
      </div>
    </div>
  )
}
