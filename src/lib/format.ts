import type { DirectorySeller, FoodGroup, PinKind, Product, SellerKind } from './types'

/** Food groups in browsing order, with their names. */
export const FOOD_GROUPS: Array<[FoodGroup, string]> = [
  ['fish', 'Fish'],
  ['seafood', 'Seafood'],
  ['vegetables', 'Vegetables'],
  ['fruit', 'Fruit'],
  ['pantry', 'Pantry'],
]
export const foodGroupName = (g: FoodGroup) => FOOD_GROUPS.find(([k]) => k === g)?.[1] ?? g

/** Split a list into food groups, in browsing order, skipping empty ones. */
export function byFoodGroup<T>(items: T[], groupOf: (x: T) => FoodGroup) {
  return FOOD_GROUPS.map(([g, name]) => ({ group: g, name, items: items.filter((x) => groupOf(x) === g) })).filter((x) => x.items.length)
}

export const money = (n: number | string) => '$' + Number(n).toFixed(2)

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))))

/** "lb", "dozen", "each" never change; "bag" -> "bags". */
export function unitWord(unit: string, n: number) {
  return n === 1 || ['lb', 'each', 'dozen'].includes(unit) ? unit : unit + 's'
}
export const qtyText = (n: number | string, unit: string) => `${num(Number(n))} ${unitWord(unit, Number(n))}`

/** Words for a quantity input label: lb, items, dozen, bags… */
export function unitPlural(unit: string) {
  return unit === 'lb' ? 'lb' : unit === 'each' ? 'items' : unit === 'dozen' ? 'dozen' : unit + 's'
}

export const kmText = (d: number) => (d < 1 ? 'Under 1 km away' : `${Math.round(d)} km away`)

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? ''))).toUpperCase()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(iso: string) {
  const d = new Date(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export function timeText(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).replace('a.m.', 'am').replace('p.m.', 'pm')
}

/** "Today, 1:40 pm", "Yesterday, 4:10 pm", "Oct 28, 2:05 pm" */
export function whenText(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86400000)
  const t = timeText(iso)
  if (diff === 0) return `Today, ${t}`
  if (diff === 1) return `Yesterday, ${t}`
  return `${shortDate(iso)}, ${t}`
}

/** "Landed 2 h ago", "Dug this week", "Picked Oct 28" */
export function ageText(verb: string, iso: string, whenOverride?: string | null) {
  if (whenOverride) return whenOverride
  const mins = (Date.now() - new Date(iso).getTime()) / 60000
  if (mins < 60) return `${verb} ${Math.max(1, Math.round(mins))} min ago`
  const hrs = mins / 60
  if (hrs < 12) return `${verb} ${Math.round(hrs)} h ago`
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `${verb} today`
  const yest = new Date(now.getTime() - 86400000)
  if (d.toDateString() === yest.toDateString()) return `${verb} yesterday`
  if (hrs < 24 * 7) return `${verb} this week`
  return `${verb} ${shortDate(iso)}`
}

/** Fresh = sea food landed in the last 12 hours, or anything under 6 hours old. */
export function isFresh(p: Pick<Product, 'category'>, iso: string) {
  const hrs = (Date.now() - new Date(iso).getTime()) / 3600000
  return p.category === 'sea' ? hrs < 12 : hrs < 6
}

export function pinKind(s: Pick<DirectorySeller, 'pin_type' | 'site_kind'>): PinKind {
  return s.pin_type === 'pickup' ? 'pickup' : (s.site_kind ?? 'farm')
}
export const pinWord = (k: PinKind) => (k === 'farm' ? 'Farm' : k === 'wharf' ? 'Wharf' : k === 'market' ? 'Market' : 'Pickup spot')
export const hereNowText = (k: PinKind) =>
  k === 'farm' ? 'Farm stand open now' : k === 'wharf' ? 'At the wharf now' : 'At the pickup spot now'
export const visitNote = (k: PinKind) =>
  k === 'pickup'
    ? 'The seller meets buyers here. This isn’t their home.'
    : 'This is the real location. You can drive in, but call first in case nobody is there.'
export const pinColor = (k: PinKind) =>
  k === 'farm' ? 'var(--kelp)' : k === 'wharf' ? 'var(--tide)' : k === 'market' ? 'var(--plum)' : 'var(--buoy)'
export const pinSoft = (k: PinKind) =>
  k === 'farm' ? 'var(--kelp-soft)' : k === 'wharf' ? 'var(--tide-soft)' : k === 'market' ? 'var(--plum-soft)' : 'var(--buoy-soft)'

export const kindWord = (k: SellerKind) => (k === 'fisher' ? 'fisher' : k === 'farmer' ? 'farmer' : 'fisher and farmer')
export const isLandSeller = (k: SellerKind) => k === 'farmer'

export function telHref(phone: string) {
  const d = phone.replace(/\D/g, '')
  return `tel:${d.length === 10 ? '+1' + d : '+' + d}`
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}
