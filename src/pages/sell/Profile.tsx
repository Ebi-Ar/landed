import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Lock, LogOut } from 'lucide-react'
import { PendingNote } from '@/components/PendingNote'
import { PinFields, type PinDraft } from '@/components/PinFields'
import { Sheet } from '@/components/Sheet'
import { Alert, Switch } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { LOCKED } from '@/lib/modules'
import { useBlankLabelCount, useCatalog, useCredentials, useMyPins, useSeasonPlans, useSellerProducts } from '@/lib/queries'
import { useUpdatePin } from '@/lib/seller'
import { errorMessage, supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { initials, shortDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { CredentialType, PinType } from '@/lib/types'

const CRED: Record<CredentialType, string> = {
  fishing_licence: 'Fishing licence',
  vessel: 'Registered boat',
  farm_registration: 'Farm registration',
  aquaculture_lease: 'Aquaculture lease',
}

/** Pin settings, phone switch, credentials, season plan, products and label roll. */
export default function Profile() {
  const auth = useAuth()
  const { seller, location } = auth
  const cat = useCatalog()
  const pins = useMyPins(Boolean(seller))
  const creds = useCredentials(seller?.id)
  const plans = useSeasonPlans(seller?.id)
  const products = useSellerProducts(seller?.id)
  const labels = useBlankLabelCount(seller?.id)
  const pin = useUpdatePin()
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [edit, setEdit] = useState<PinType | null>(null)
  const [draft, setDraft] = useState<PinDraft>({ place_name: '', area_label: '', hours_text: '', lat: null, lng: null })

  const switchPin = useMutation({
    mutationFn: async (t: PinType) => {
      const { error } = await supabase.rpc('use_pin', { p_pin_type: t })
      if (error) throw error
    },
    onSuccess: (_d, t) => {
      toast(t === 'exact' ? 'Your exact location is on the map' : 'Your pickup spot is on the map')
      auth.refreshMe()
      qc.invalidateQueries({ queryKey: ['seller', 'pins'] })
      qc.invalidateQueries({ queryKey: ['directory'] })
    },
  })
  const savePin = useMutation({
    mutationFn: async () => {
      if (!edit) return
      const { error } = await supabase.rpc('save_pin', {
        p_pin_type: edit,
        p_place: draft.place_name,
        p_area: draft.area_label,
        p_hours: draft.hours_text,
        p_lat: draft.lat,
        p_lng: draft.lng,
        p_site_kind: null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setEdit(null)
      toast('Pin saved')
      auth.refreshMe()
      qc.invalidateQueries({ queryKey: ['seller', 'pins'] })
      qc.invalidateQueries({ queryKey: ['directory'] })
    },
  })
  const orderRoll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('request_label_roll')
      if (error) throw error
    },
    onSuccess: () => {
      auth.refreshMe()
      toast('Roll requested. The Landed team will mail it out.')
    },
  })

  if (!seller) return null
  const farmer = seller.kind !== 'fisher'
  const saved = pins.data?.saved ?? []
  const savedOf = (t: PinType) => saved.find((s) => s.pin_type === t)
  const exactWord = seller.kind === 'farmer' ? 'farm' : seller.kind === 'fisher' ? 'wharf' : 'farm or wharf'
  const openEditor = (t: PinType) => {
    const s = savedOf(t) ?? (location?.pin_type === t ? location : undefined)
    setDraft({ place_name: s?.place_name ?? '', area_label: s?.area_label ?? '', hours_text: s?.hours_text ?? location?.hours_text ?? '', lat: s?.lat ?? null, lng: s?.lng ?? null })
    setEdit(t)
  }
  const choose = (t: PinType) => {
    if (location?.pin_type === t) return
    if (savedOf(t)) switchPin.mutate(t)
    else openEditor(t)
  }

  return (
    <>
      <div className="card">
        <div className="flex items-center gap-2.5">
          <div className={cn('avatar', farmer && 'land')}>{initials(seller.display_name)}</div>
          <div className="flex min-w-0 flex-col">
            <span className="name">{seller.display_name}</span>
            <span className="small">{seller.business_name}</span>
          </div>
        </div>
        {seller.status === 'approved' ? (
          <span className="badge">
            <BadgeCheck /> Verified seller{seller.verified_note ? ` · ${seller.verified_note}` : ''}
          </span>
        ) : (
          <PendingNote status={seller.status} />
        )}
      </div>

      {location && (
        <div className="card">
          <h2>My pin on the map</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Pin type">
            <button type="button" role="radio" aria-checked={location.pin_type === 'exact'} className="opt" disabled={switchPin.isPending} onClick={() => choose('exact')}>
              <span className="r" />
              <span>
                Show my exact {exactWord}
                <small>Buyers can drive in. They’ll be told to call first.{!savedOf('exact') && location.pin_type !== 'exact' ? ' Tap to add it.' : ''}</small>
              </span>
            </button>
            <button type="button" role="radio" aria-checked={location.pin_type === 'pickup'} className="opt" disabled={switchPin.isPending} onClick={() => choose('pickup')}>
              <span className="r" />
              <span>
                Use a pickup spot instead
                <small>Keeps your home private. Buyers see the spot and the area.{!savedOf('pickup') && location.pin_type !== 'pickup' ? ' Tap to add one.' : ''}</small>
              </span>
            </button>
          </div>
          {switchPin.error && <Alert tone="bad">{errorMessage(switchPin.error)}</Alert>}
          <dl className="kv">
            <dt>Shown as</dt>
            <dd>{location.place_name}</dd>
            <dt>Area</dt>
            <dd>{location.area_label}</dd>
            <dt>Hours</dt>
            <dd>{location.hours_text || '–'}</dd>
          </dl>
          <button className="link text-[13px]!" onClick={() => openEditor(location.pin_type)}>
            Edit this pin
          </button>
          <div className="flex items-center justify-between gap-3">
            <div>
              <b>Available now</b>
              <div className="small">Fills your pin on every buyer’s map</div>
            </div>
            <Switch on={location.available_now} label="Available now" onChange={(v) => pin.mutate({ available_now: v })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <b>Show my phone number</b>
              <div className="small">Many buyers prefer to just call</div>
            </div>
            <Switch on={location.show_phone} label="Show my phone number" onChange={(v) => pin.mutate({ show_phone: v })} />
          </div>
        </div>
      )}

      <div className="card">
        <h2>Licences and registration</h2>
        <dl className="kv">
          {(creds.data ?? []).map((c) => (
            <div key={c.id} className="contents">
              <dt>{CRED[c.type]}</dt>
              <dd>
                {c.number}
                <div className={cn('text-[12px] font-semibold', c.checked_at ? 'text-kelp' : 'text-warn')}>{c.checked_at ? `Checked ${shortDate(c.checked_at)}` : 'Waiting for a check'}</div>
              </dd>
            </div>
          ))}
        </dl>
        <p className="small m-0">Only you and the Landed team can see these.</p>
      </div>

      <div className="card">
        <h2>Products</h2>
        <div className="flex flex-wrap gap-1.5">
          {(products.data ?? []).map((x) => (
            <span key={x.product_id} className={cn('badge', !x.approved && 'warn')}>
              {cat.productBySlug[x.product_id]?.short_name ?? x.product_id}
              {!x.approved && ' · waiting'}
            </span>
          ))}
        </div>
        {farmer && (plans.data ?? []).length > 0 && (
          <>
            <h3 className="mt-1">Season plan {plans.data![0].year}</h3>
            <p className="small m-0">Registered in spring. Harvest listings have to match it.</p>
            <dl className="kv">
              {(plans.data ?? []).map((pl) => (
                <div key={pl.id} className="contents">
                  <dt>{cat.productBySlug[pl.product_id]?.short_name ?? pl.product_id}</dt>
                  <dd>
                    {pl.size_text}
                    {pl.size_text ? ' · ' : ''}
                    {Number(pl.expected_qty)} {cat.productBySlug[pl.product_id]?.unit ?? ''} expected
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <button className="btn alt sm w-fit!" onClick={() => toast('New products are checked by the Landed team before you can list them. Email us for now.')}>
          Add a product
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2>Label roll</h2>
            <span className="small">{labels.data ?? '–'} blank labels left · linked to your account</span>
          </div>
          <button className="btn sm alt" disabled={Boolean(seller.roll_requested_at) || orderRoll.isPending || seller.status !== 'approved'} onClick={() => orderRoll.mutate()}>
            {seller.roll_requested_at ? `Requested ${shortDate(seller.roll_requested_at)}` : 'Order a roll'}
          </button>
        </div>
        {orderRoll.error && <Alert tone="bad">{errorMessage(orderRoll.error)}</Alert>}
      </div>

      <h2>Coming soon</h2>
      <div className="flex flex-col gap-2.5">
        {LOCKED.map((m) => (
          <Link key={m.key} to={`/soon/${m.key}`} className="lock">
            <div className="ic">
              <Lock />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="name">{m.title}</span>
              <span className="small">{m.description.split('. ')[0]}.</span>
            </div>
            <span className="badge soon">Soon</span>
          </Link>
        ))}
      </div>
      <button
        className="btn alt"
        onClick={async () => {
          await auth.signOut()
          navigate('/')
        }}
      >
        <LogOut /> Sign out
      </button>

      <Sheet open={edit !== null} onClose={() => setEdit(null)} label="Edit pin">
        <h2>{edit === 'exact' ? `Your ${exactWord}` : 'Your pickup spot'}</h2>
        {edit && <PinFields value={draft} onChange={setDraft} exact={edit === 'exact'} />}
        {savePin.error && <Alert tone="bad">{errorMessage(savePin.error)}</Alert>}
        <button className="btn" disabled={savePin.isPending} onClick={() => savePin.mutate()}>
          Save
        </button>
        {edit && location?.pin_type !== edit && <p className="small m-0">Saving keeps your current pin. Switch with the options above when you’re ready.</p>}
      </Sheet>
    </>
  )
}
