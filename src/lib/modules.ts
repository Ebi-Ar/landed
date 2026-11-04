/** Locked modules: shown as previews with a pilot sign-up (/soon/:module). */
export interface LockedModule {
  key: string
  title: string
  description: string
}

export const LOCKED: LockedModule[] = [
  {
    key: 'delivery',
    title: 'Delivery and live tracking',
    description: 'Buyers get food delivered by local drivers and follow the order on a map, like a ride-hailing app.',
  },
  {
    key: 'sensors',
    title: 'Cold-chain temperature sensors',
    description: 'A small sensor in a cooler or truck records the temperature, so the label page can show the food stayed cold the whole trip.',
  },
  {
    key: 'elog',
    title: 'Import from my e-logbook',
    description: 'Fishers already report catches through DFO electronic logbooks. Import a catch to create a listing with no extra typing.',
  },
  {
    key: 'official',
    title: 'Verified catch',
    description: 'Listings are matched against official landing records, the strongest proof that a catch is real.',
  },
  {
    key: 'vessel',
    title: 'Vessel Watch',
    description: 'Flags suspicious boat activity near fishing areas using public vessel-tracking data, so illegal catch can’t pass as local.',
  },
  {
    key: 'standing',
    title: 'Restaurant standing orders',
    description: 'Restaurants and grocers set up a weekly order straight from the same fishers and farms.',
  },
  {
    key: 'french',
    title: 'Version française',
    description: 'The full platform in French as well as English, for New Brunswick’s Acadian communities.',
  },
]

export const lockedByKey = Object.fromEntries(LOCKED.map((m) => [m.key, m])) as Record<string, LockedModule>
