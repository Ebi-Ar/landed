import { useState } from 'react'
import { LocateFixed } from 'lucide-react'

export interface PinDraft {
  place_name: string
  area_label: string
  hours_text: string
  lat: number | null
  lng: number | null
}

/** Place name, area, hours and a location from the phone (or typed coordinates). */
export function PinFields({ value, onChange, exact }: { value: PinDraft; onChange: (v: PinDraft) => void; exact: boolean }) {
  const [locating, setLocating] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const set = (patch: Partial<PinDraft>) => onChange({ ...value, ...patch })
  const locate = () => {
    if (!('geolocation' in navigator)) return setMsg('Location isn’t available here. Type the coordinates instead.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        setMsg(null)
        set({ lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 })
      },
      () => {
        setLocating(false)
        setMsg('Location wasn’t shared. Type the coordinates instead.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      <label className="field">
        {exact ? 'Name buyers will see' : 'Pickup spot'}
        <input value={value.place_name} onChange={(e) => set({ place_name: e.target.value })} placeholder={exact ? 'e.g. Pointe-du-Chêne wharf' : 'e.g. Shediac waterfront parking lot'} />
      </label>
      <label className="field">
        Area
        <input value={value.area_label} onChange={(e) => set({ area_label: e.target.value })} placeholder="e.g. Near Shediac" />
      </label>
      <label className="field">
        Hours
        <input value={value.hours_text} onChange={(e) => set({ hours_text: e.target.value })} placeholder="e.g. Most days 1–5 pm, after landing" />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Location on the map</span>
        <button type="button" className="btn alt sm w-fit!" onClick={locate} disabled={locating}>
          <LocateFixed /> {locating ? 'Finding you…' : `Use where I am now${exact ? '' : ' (stand at the spot)'}`}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <label className="field">
            Latitude
            <input inputMode="decimal" value={value.lat ?? ''} onChange={(e) => set({ lat: e.target.value === '' ? null : Number(e.target.value) })} placeholder="46.2416" />
          </label>
          <label className="field">
            Longitude
            <input inputMode="decimal" value={value.lng ?? ''} onChange={(e) => set({ lng: e.target.value === '' ? null : Number(e.target.value) })} placeholder="-64.5228" />
          </label>
        </div>
        {msg && <span className="small text-warn!">{msg}</span>}
        <span className="small">
          {exact
            ? 'Buyers will see this exact spot and can drive in. They’ll be told to call first.'
            : 'Use a public spot (a wharf lot, a village centre). Your home is never shown.'}
        </span>
      </div>
    </div>
  )
}
