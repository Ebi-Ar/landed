import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer, RotateCcw } from 'lucide-react'
import { Alert, CheckList, Chips, ErrorNote, Loading, PageTitle } from '@/components/ui'
import { useCatalog } from '@/lib/queries'
import { errorMessage, supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { money, qtyText, shortDate, whenText } from '@/lib/format'
import type { Batch, Credential, Flag, LabelRoll, Seller } from '@/lib/types'

type Tab = 'sellers' | 'held' | 'flags' | 'rolls' | 'demo'

const FLAG_TEXT: Record<string, string> = {
  fake_code: 'Fake code scanned',
  blank_scanned: 'Blank label scanned (roll may be lost or stolen)',
  too_many_scans: 'Too many scans for the batch size',
  far_scans: 'Scanned far from where it was sold',
  late_scan: 'Scanned long after it should be sold out',
  failed_check: 'Batch failed an automatic check',
  buyer_report: 'Buyer report',
}

async function rpc(name: string, args?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('sellers')
  return (
    <>
      <PageTitle title="Admin" sub="Approve sellers, issue label rolls, review held batches and copied labels. Every action is logged." />
      <Chips<Tab>
        label="Admin sections"
        value={tab}
        onChange={setTab}
        options={[
          ['sellers', 'Sellers'],
          ['held', 'Held batches'],
          ['flags', 'Flags'],
          ['rolls', 'Label rolls'],
          ['demo', 'Demo'],
        ]}
      />
      {tab === 'sellers' && <Sellers />}
      {tab === 'held' && <Held />}
      {tab === 'flags' && <Flags />}
      {tab === 'rolls' && <Rolls />}
      {tab === 'demo' && <Demo />}
    </>
  )
}

function useAdminAction(keys: string[][]) {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ name, args }: { name: string; args?: Record<string, unknown>; done?: string }) => rpc(name, args),
    onSuccess: (_d, v) => v.done && toast(v.done),
    onSettled: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  })
}

function Sellers() {
  const cat = useCatalog()
  const sellers = useQuery({
    queryKey: ['admin', 'sellers'],
    queryFn: async () => {
      const [s, c, p] = await Promise.all([
        supabase.from('sellers').select('*').order('created_at', { ascending: false }),
        supabase.from('seller_credentials').select('*'),
        supabase.from('seller_products').select('*'),
      ])
      if (s.error) throw s.error
      if (c.error) throw c.error
      if (p.error) throw p.error
      return { sellers: s.data as Seller[], creds: c.data as Credential[], products: p.data as Array<{ seller_id: string; product_id: string; approved: boolean }> }
    },
  })
  const act = useAdminAction([['admin'], ['directory']])
  const [size, setSize] = useState<Record<string, string>>({})
  if (sellers.isLoading) return <Loading />
  if (sellers.error) return <ErrorNote error={sellers.error} />
  const order = { pending: 0, approved: 1, suspended: 2 }
  const list = [...sellers.data!.sellers].sort((a, b) => order[a.status] - order[b.status] || Number(Boolean(b.roll_requested_at)) - Number(Boolean(a.roll_requested_at)))
  return (
    <div className="flex flex-col gap-2.5">
      {act.error && <Alert tone="bad">{errorMessage(act.error)}</Alert>}
      {list.map((s) => {
        const creds = sellers.data!.creds.filter((c) => c.seller_id === s.id)
        const prods = sellers.data!.products.filter((p) => p.seller_id === s.id)
        return (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <b>{s.display_name}</b>
                <div className="small">
                  {s.business_name} · {s.kind}
                  {s.is_sample ? ' · sample' : ''}
                </div>
              </div>
              <span className={`badge ${s.status === 'approved' ? '' : s.status === 'pending' ? 'warn' : 'bad'}`}>{s.status}</span>
            </div>
            <dl className="kv">
              {creds.map((c) => (
                <div key={c.id} className="contents">
                  <dt>{c.type.replace('_', ' ')}</dt>
                  <dd>
                    {c.number} {c.checked_at ? <span className="text-kelp">✓</span> : <span className="text-warn">to check</span>}
                  </dd>
                </div>
              ))}
              <dt>Products</dt>
              <dd>{prods.map((p) => cat.productBySlug[p.product_id]?.short_name ?? p.product_id).join(', ') || '–'}</dd>
            </dl>
            {s.roll_requested_at && <span className="badge fresh">Roll requested {shortDate(s.roll_requested_at)}</span>}
            <div className="flex flex-wrap items-center gap-2">
              {s.status !== 'approved' && (
                <button className="btn sm kelp" disabled={act.isPending} onClick={() => act.mutate({ name: 'admin_set_seller_status', args: { p_seller: s.id, p_status: 'approved' }, done: `${s.display_name} approved` })}>
                  {s.status === 'pending' ? 'Approve (credentials checked)' : 'Reinstate'}
                </button>
              )}
              {s.status !== 'suspended' && (
                <button className="btn sm alt" disabled={act.isPending} onClick={() => act.mutate({ name: 'admin_set_seller_status', args: { p_seller: s.id, p_status: 'suspended' }, done: `${s.display_name} suspended` })}>
                  Suspend
                </button>
              )}
              {s.status === 'approved' && (
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    act.mutate({ name: 'admin_issue_roll', args: { p_seller: s.id, p_size: Number(size[s.id] || 200) }, done: 'Roll issued. Print it under Label rolls.' })
                  }}
                >
                  <input
                    aria-label="Labels in the roll"
                    inputMode="numeric"
                    className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px]"
                    value={size[s.id] ?? '200'}
                    onChange={(e) => setSize((x) => ({ ...x, [s.id]: e.target.value }))}
                  />
                  <button className="btn sm">Issue roll</button>
                </form>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Held() {
  const cat = useCatalog()
  const held = useQuery({
    queryKey: ['admin', 'held'],
    queryFn: async () => {
      const [b, s] = await Promise.all([
        supabase.from('batches').select('*').eq('status', 'held').order('created_at', { ascending: false }),
        supabase.from('sellers').select('id, display_name'),
      ])
      if (b.error) throw b.error
      if (s.error) throw s.error
      return { batches: b.data as Batch[], names: Object.fromEntries((s.data as Array<{ id: string; display_name: string }>).map((x) => [x.id, x.display_name])) }
    },
  })
  const act = useAdminAction([['admin'], ['batches']])
  if (held.isLoading) return <Loading />
  if (held.error) return <ErrorNote error={held.error} />
  const list = held.data!.batches
  return (
    <div className="flex flex-col gap-2.5">
      {act.error && <Alert tone="bad">{errorMessage(act.error)}</Alert>}
      {list.map((b) => {
        const p = cat.productBySlug[b.product_id]
        return (
          <div key={b.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <b>
                {p ? `${qtyText(b.qty_total, p.unit)} ${p.short_name.toLowerCase()}` : b.product_id} at {money(b.price)}
              </b>
              <span className="small">{whenText(b.created_at)}</span>
            </div>
            <div className="small">{held.data!.names[b.seller_id] ?? 'Seller'} · pickup at {b.pickup_place}</div>
            <CheckList items={b.check_results} />
            <div className="flex gap-2">
              <button className="btn sm kelp" disabled={act.isPending} onClick={() => act.mutate({ name: 'admin_review_batch', args: { p_batch: b.id, p_approve: true }, done: 'Approved: live on the map' })}>
                Approve and put live
              </button>
              <button className="btn sm alt" disabled={act.isPending} onClick={() => act.mutate({ name: 'admin_review_batch', args: { p_batch: b.id, p_approve: false }, done: 'Removed. Its label is cancelled.' })}>
                Remove
              </button>
            </div>
          </div>
        )
      })}
      {!list.length && <p className="sub">No batches waiting for review.</p>}
    </div>
  )
}

function Flags() {
  const flags = useQuery({
    queryKey: ['admin', 'flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('flags').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return data as Flag[]
    },
  })
  const act = useAdminAction([['admin', 'flags']])
  if (flags.isLoading) return <Loading />
  if (flags.error) return <ErrorNote error={flags.error} />
  return (
    <div className="flex flex-col gap-2.5">
      {act.error && <Alert tone="bad">{errorMessage(act.error)}</Alert>}
      {flags.data!.map((f) => (
        <div key={f.id} className="card">
          <div className="flex items-center justify-between gap-2">
            <b>{FLAG_TEXT[f.kind] ?? f.kind}</b>
            <span className="small">{whenText(f.created_at)}</span>
          </div>
          {f.label_code && (
            <Link to={`/l/${f.label_code}`} className="mono link text-[13px]!">
              {f.label_code}
            </Link>
          )}
          {Object.keys(f.details).length > 0 && (
            <div className="small">
              {Object.entries(f.details)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                .join(' · ')}
            </div>
          )}
          <button className="btn sm alt w-fit!" disabled={act.isPending} onClick={() => act.mutate({ name: 'admin_clear_flag', args: { p_flag: f.id }, done: 'Flag cleared' })}>
            Clear
          </button>
        </div>
      ))}
      {!flags.data!.length && <p className="sub">No open flags.</p>}
    </div>
  )
}

function Rolls() {
  const rolls = useQuery({
    queryKey: ['admin', 'rolls'],
    queryFn: async () => {
      const [r, s] = await Promise.all([
        supabase.from('label_rolls').select('*').order('issued_at', { ascending: false }).limit(50),
        supabase.from('sellers').select('id, display_name'),
      ])
      if (r.error) throw r.error
      if (s.error) throw s.error
      return { rolls: r.data as LabelRoll[], names: Object.fromEntries((s.data as Array<{ id: string; display_name: string }>).map((x) => [x.id, x.display_name])) }
    },
  })
  if (rolls.isLoading) return <Loading />
  if (rolls.error) return <ErrorNote error={rolls.error} />
  return (
    <div className="flex flex-col gap-2.5">
      <p className="small m-0">Issue a roll from the Sellers tab. Print the sheet for the demo; for the pilot, send the same sheet to a print shop on waterproof, tamper-evident stock.</p>
      {rolls.data!.rolls.map((r) => (
        <div key={r.id} className="card flex-row! items-center justify-between">
          <div>
            <b>{rolls.data!.names[r.seller_id] ?? 'Seller'}</b>
            <div className="small">
              {r.size} labels · issued {shortDate(r.issued_at)}
              {r.note ? ` · ${r.note}` : ''}
            </div>
          </div>
          <Link to={`/admin/rolls/${r.id}/print`} className="btn sm alt">
            <Printer /> Print sheet
          </Link>
        </div>
      ))}
    </div>
  )
}

function Demo() {
  const toast = useToast()
  const qc = useQueryClient()
  const reset = useMutation({
    mutationFn: () => rpc('reset_demo'),
    onSuccess: () => {
      qc.invalidateQueries()
      toast('Demo data restored')
    },
  })
  const index = useMutation({
    mutationFn: () => rpc('admin_run_price_index'),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['index'] })
      toast(`Price Index rebuilt for ${n} products`)
    },
  })
  const signups = useQuery({
    queryKey: ['admin', 'pilot'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pilot_signups').select('module')
      if (error) throw error
      const m: Record<string, number> = {}
      for (const r of data as Array<{ module: string }>) m[r.module] = (m[r.module] ?? 0) + 1
      return m
    },
  })
  return (
    <div className="flex flex-col gap-2.5">
      <div className="card">
        <h2>Reset demo</h2>
        <p className="small m-0">
          Restores the sample world before a pitch: Marc, Lise and the other sample sellers, live batches, orders, the copied label, 50 blank labels each for Marc
          and Lise (same codes as the printed sheet) and 30 days of prices. Removes every batch, order, label and scan made since. Real sign-ups keep their
          accounts.
        </p>
        {reset.error && <Alert tone="bad">{errorMessage(reset.error)}</Alert>}
        <button
          className="btn bad"
          disabled={reset.isPending}
          onClick={() => window.confirm('Reset all demo data? Everything added since the last reset will be removed.') && reset.mutate()}
        >
          <RotateCcw /> {reset.isPending ? 'Resetting…' : 'Reset demo'}
        </button>
      </div>
      <div className="card">
        <h2>Price Index</h2>
        <p className="small m-0">Runs every night on the server. Run it now after adding sales or price reports.</p>
        {index.error && <Alert tone="bad">{errorMessage(index.error)}</Alert>}
        <button className="btn alt" disabled={index.isPending} onClick={() => index.mutate()}>
          Rebuild today’s index
        </button>
      </div>
      <div className="card">
        <h2>Pilot sign-ups</h2>
        <dl className="kv">
          {Object.entries(signups.data ?? {}).map(([k, n]) => (
            <div key={k} className="contents">
              <dt>{k}</dt>
              <dd>{n}</dd>
            </div>
          ))}
        </dl>
        {!Object.keys(signups.data ?? {}).length && <p className="sub m-0!">None yet.</p>}
      </div>
    </div>
  )
}
