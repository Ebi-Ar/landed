import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Anchor, Sprout, Tractor } from 'lucide-react'
import { PendingNote } from '@/components/PendingNote'
import { PinFields, type PinDraft } from '@/components/PinFields'
import { ProductIcon } from '@/components/ProductIcon'
import { byFoodGroup } from '@/lib/format'
import { Alert, Loading, PageTitle, Switch } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useMarkets, useProducts } from '@/lib/queries'
import { errorMessage, supabase } from '@/lib/supabase'
import type { SellerKind } from '@/lib/types'

/** Seller onboarding: credentials, products, season plan, markets and pin. */
export default function Join() {
  const auth = useAuth()
  const navigate = useNavigate()
  const products = useProducts()
  const markets = useMarkets()
  const [editing, setEditing] = useState(false)

  const [kind, setKind] = useState<SellerKind>('fisher')
  const [displayName, setDisplayName] = useState('')
  const [business, setBusiness] = useState('')
  const [story, setStory] = useState('')
  const [phone, setPhone] = useState('')
  const [showPhone, setShowPhone] = useState(true)
  const [licence, setLicence] = useState('')
  const [vessel, setVessel] = useState('')
  const [lease, setLease] = useState('')
  const [farmReg, setFarmReg] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [plan, setPlan] = useState<Record<string, { size_text: string; expected_qty: string }>>({})
  const [marketIds, setMarketIds] = useState<string[]>([])
  const [pinType, setPinType] = useState<'exact' | 'pickup'>('pickup')
  const [pin, setPin] = useState<PinDraft>({ place_name: '', area_label: '', hours_text: '', lat: null, lng: null })
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setDisplayName((v) => v || auth.profile?.full_name || '')
    setPhone((v) => v || auth.profile?.phone || '')
  }, [auth.profile])

  const sea = kind !== 'farmer'
  const land = kind !== 'fisher'
  const catalogue = useMemo(() => (products.data ?? []).filter((p) => (p.category === 'sea' ? sea : land)), [products.data, sea, land])
  const landChosen = chosen.filter((s) => products.data?.find((p) => p.slug === s)?.category === 'land')

  const submit = useMutation({
    mutationFn: async () => {
      const credentials = [
        sea && licence && { type: 'fishing_licence', number: licence },
        sea && vessel && { type: 'vessel', number: vessel },
        sea && lease && { type: 'aquaculture_lease', number: lease },
        land && farmReg && { type: 'farm_registration', number: farmReg },
      ].filter(Boolean)
      const { error } = await supabase.rpc('submit_seller_application', {
        p: {
          kind,
          display_name: displayName,
          business_name: business,
          story,
          phone,
          show_phone: showPhone,
          origin,
          credentials,
          products: chosen.filter((s) => catalogue.some((p) => p.slug === s)),
          season_plan: landChosen.map((s) => ({ product: s, size_text: plan[s]?.size_text ?? '', expected_qty: Number(plan[s]?.expected_qty || 0) })),
          markets: marketIds,
          pin: { pin_type: pinType, ...pin },
        },
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await auth.refreshMe()
      navigate('/sell', { replace: true })
    },
  })

  if (auth.meLoading || products.isLoading) return <Loading />
  if (auth.seller?.status === 'approved' || auth.seller?.status === 'suspended') return <Navigate to="/sell/profile" replace />
  if (auth.seller && !editing)
    return (
      <>
        <PageTitle title="Thanks for applying" sub={`${auth.seller.display_name} · ${auth.seller.business_name}`} />
        <PendingNote status={auth.seller.status} />
        <button className="btn alt" onClick={() => setEditing(true)}>
          Change my application
        </button>
        <button className="btn" onClick={() => navigate('/sell')}>
          Go to Selling
        </button>
      </>
    )

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  return (
    <>
      <PageTitle title="Sell on Landed" sub="Tell us who you are and what you sell. The Landed team checks your licence or farm registration, then you can list." />
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit.mutate()
        }}
      >
        <div className="card">
          <h2>What do you sell?</h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['fisher', 'Fish and seafood', Anchor],
                ['farmer', 'Farm products', Tractor],
                ['both', 'Both', Sprout],
              ] as const
            ).map(([k, l, Icon]) => (
              <button key={k} type="button" className="pick" aria-pressed={kind === k} onClick={() => setKind(k)}>
                <Icon className={k === 'farmer' ? 'text-kelp' : 'text-tide'} />
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>About you</h2>
          <label className="field">
            Name buyers will see
            <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Marc Leblanc" />
          </label>
          <label className="field">
            {sea && !land ? 'Boat or business name' : 'Farm or business name'}
            <input required value={business} onChange={(e) => setBusiness(e.target.value)} placeholder={sea && !land ? 'e.g. Boat: Marie-Claire II' : 'e.g. Ouellette Family Farm'} />
          </label>
          <label className="field">
            A line about you <span className="font-normal text-muted">(optional)</span>
            <input value={story} onChange={(e) => setStory(e.target.value)} placeholder="e.g. Fishing out of Shediac for 22 years" />
          </label>
          <label className="field">
            Phone
            <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(506) 555-0100" />
          </label>
          <div className="flex items-center justify-between gap-3">
            <div>
              <b>Show my phone number</b>
              <div className="small">You can change this any time</div>
            </div>
            <Switch on={showPhone} onChange={setShowPhone} label="Show my phone number" />
          </div>
        </div>

        <div className="card">
          <h2>Licences and registration</h2>
          <p className="small m-0">Only you and the Landed team see these.</p>
          {sea && (
            <>
              <label className="field">
                Fishing licence number
                <input value={licence} onChange={(e) => setLicence(e.target.value)} placeholder="e.g. Lobster, LFA 25, no. …" />
              </label>
              <label className="field">
                Boat name and registration number
                <input value={vessel} onChange={(e) => setVessel(e.target.value)} placeholder="e.g. Marie-Claire II, reg. …" />
              </label>
              <label className="field">
                Aquaculture lease <span className="font-normal text-muted">(if you farm oysters or mussels)</span>
                <input value={lease} onChange={(e) => setLease(e.target.value)} placeholder="e.g. Cocagne Bay lease 112" />
              </label>
            </>
          )}
          {land && (
            <label className="field">
              Farm registration number
              <input value={farmReg} onChange={(e) => setFarmReg(e.target.value)} placeholder="NB farm registration no." />
            </label>
          )}
        </div>

        <div className="card">
          <h2>Products</h2>
          {byFoodGroup(catalogue, (p) => p.food_group).map((g) => (
            <div key={g.group} className="flex flex-col gap-1.5">
              <span className="small font-semibold">{g.name}</span>
              <div className="grid grid-cols-3 gap-2">
                {g.items.map((p) => (
                  <button key={p.slug} type="button" className={`pick ${p.category}`} aria-pressed={chosen.includes(p.slug)} onClick={() => setChosen((c) => toggle(c, p.slug))}>
                    <ProductIcon icon={p.icon} />
                    {p.short_name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {landChosen.length > 0 && (
          <div className="card">
            <h2>Season plan {new Date().getFullYear()}</h2>
            <p className="small m-0">What you expect to harvest this year. Listings are checked against it.</p>
            {landChosen.map((s) => {
              const p = products.data!.find((x) => x.slug === s)!
              return (
                <div key={s} className="grid grid-cols-2 gap-2">
                  <label className="field">
                    {p.short_name}: area or size
                    <input value={plan[s]?.size_text ?? ''} onChange={(e) => setPlan((x) => ({ ...x, [s]: { size_text: e.target.value, expected_qty: x[s]?.expected_qty ?? '' } }))} placeholder="e.g. 2 acres" />
                  </label>
                  <label className="field">
                    Expected ({p.unit === 'each' ? 'items' : p.unit + 's'})
                    <input inputMode="numeric" value={plan[s]?.expected_qty ?? ''} onChange={(e) => setPlan((x) => ({ ...x, [s]: { size_text: x[s]?.size_text ?? '', expected_qty: e.target.value } }))} placeholder="e.g. 300" />
                  </label>
                </div>
              )
            })}
          </div>
        )}

        <div className="card">
          <h2>Your pin on the map</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Pin type">
            <button type="button" role="radio" aria-checked={pinType === 'exact'} className="opt" onClick={() => setPinType('exact')}>
              <span className="r" />
              <span>
                Show my exact {land && !sea ? 'farm' : sea && !land ? 'wharf' : 'farm or wharf'}
                <small>Buyers can drive in. They’ll be told to call first.</small>
              </span>
            </button>
            <button type="button" role="radio" aria-checked={pinType === 'pickup'} className="opt" onClick={() => setPinType('pickup')}>
              <span className="r" />
              <span>
                Use a pickup spot instead
                <small>Keeps your home private. Buyers see the spot and the area.</small>
              </span>
            </button>
          </div>
          <PinFields value={pin} onChange={setPin} exact={pinType === 'exact'} />
          <label className="field">
            {sea && !land ? 'Where you usually fish' : 'Where you grow'} <span className="font-normal text-muted">(shown on labels)</span>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder={sea && !land ? 'e.g. Lobster Fishing Area 25, Northumberland Strait' : 'e.g. Gallant Gardens, Dieppe'} />
          </label>
        </div>

        {(markets.data ?? []).length > 0 && (
          <div className="card">
            <h2>Farmers’ markets you attend</h2>
            <div className="flex flex-wrap gap-2">
              {(markets.data ?? []).map((m) => (
                <button key={m.id} type="button" className="chip" aria-pressed={marketIds.includes(m.id)} onClick={() => setMarketIds((x) => toggle(x, m.id))}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {submit.error && <Alert tone="bad">{errorMessage(submit.error)}</Alert>}
        <button className="btn buoy" disabled={submit.isPending}>
          {submit.isPending ? 'Sending…' : 'Send for approval'}
        </button>
        <p className="sample">Prototype: approval is a button on the admin screen. In the pilot we check real documents.</p>
      </form>
    </>
  )
}
