import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { TOWNS, distanceKm, type LatLng } from './geo'

interface BuyerLocation {
  /** 'gps' when the phone shared its location, otherwise a town id. */
  source: string
  label: string
  point: LatLng
  locating: boolean
  error: string | null
  setTown: (id: string) => void
  useMyLocation: () => void
  distanceTo: (p: LatLng) => number
}

const Ctx = createContext<BuyerLocation | null>(null)
const KEY = 'landed.town'

function savedTown() {
  try {
    return localStorage.getItem(KEY) || 'moncton'
  } catch {
    return 'moncton'
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState(savedTown)
  const [gps, setGps] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setTown = useCallback((id: string) => {
    setSource(id)
    setError(null)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      /* private mode */
    }
  }, [])

  const useMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Location isn’t available on this device. Pick a town instead.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setSource('gps')
        setLocating(false)
        setError(null)
      },
      () => {
        setLocating(false)
        setError('Location wasn’t shared. Pick a town instead.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }, [])

  const value = useMemo<BuyerLocation>(() => {
    const town = TOWNS.find((t) => t.id === source) ?? TOWNS[0]
    const point = source === 'gps' && gps ? gps : town
    return {
      source: source === 'gps' && gps ? 'gps' : town.id,
      label: source === 'gps' && gps ? 'your location' : town.name,
      point,
      locating,
      error,
      setTown,
      useMyLocation,
      distanceTo: (p) => distanceKm(point, p),
    }
  }, [source, gps, locating, error, setTown, useMyLocation])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBuyerLocation() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBuyerLocation outside LocationProvider')
  return v
}
