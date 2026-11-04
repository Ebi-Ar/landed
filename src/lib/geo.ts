export interface LatLng {
  lat: number
  lng: number
}

export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Town picker for buyers who don't share their location. */
export const TOWNS: Array<{ id: string; name: string } & LatLng> = [
  { id: 'moncton', name: 'Moncton', lat: 46.0878, lng: -64.7782 },
  { id: 'dieppe', name: 'Dieppe', lat: 46.0984, lng: -64.7242 },
  { id: 'shediac', name: 'Shediac', lat: 46.2196, lng: -64.544 },
  { id: 'sackville', name: 'Sackville', lat: 45.8961, lng: -64.3683 },
  { id: 'bouctouche', name: 'Bouctouche', lat: 46.4719, lng: -64.7369 },
  { id: 'sussex', name: 'Sussex', lat: 45.7243, lng: -65.5106 },
  { id: 'saint-john', name: 'Saint John', lat: 45.2733, lng: -66.0633 },
  { id: 'fredericton', name: 'Fredericton', lat: 45.9636, lng: -66.6431 },
  { id: 'miramichi', name: 'Miramichi', lat: 47.0287, lng: -65.5019 },
  { id: 'halifax', name: 'Halifax', lat: 44.6488, lng: -63.5752 },
]

export const FAR_KM = 120
