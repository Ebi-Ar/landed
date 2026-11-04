import { Navigation } from 'lucide-react'
import { useBuyerLocation } from '@/lib/location'
import { TOWNS } from '@/lib/geo'

/** "Distances from [Moncton ▾]" with a "My location" option that asks the phone. */
export function LocationPicker() {
  const loc = useBuyerLocation()
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-[12.5px] text-muted" htmlFor="loc">
        <Navigation className="size-3.5" />
        Distances from
        <select
          id="loc"
          value={loc.source}
          onChange={(e) => (e.target.value === 'gps' ? loc.useMyLocation() : loc.setTown(e.target.value))}
          className="rounded-lg border border-line bg-surface px-1.5 py-1 text-[12.5px] font-semibold text-ink"
        >
          <option value="gps">{loc.locating ? 'Finding you…' : 'My location'}</option>
          {TOWNS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {loc.error && <span className="small text-warn!">{loc.error}</span>}
    </div>
  )
}
