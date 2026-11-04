export type SellerKind = 'fisher' | 'farmer' | 'both'
export type SellerStatus = 'pending' | 'approved' | 'suspended'
export type PinType = 'exact' | 'pickup'
export type SiteKind = 'farm' | 'wharf'
export type Category = 'sea' | 'land'
/** What buyers browse by. Category (sea or land) still decides who may sell it. */
export type FoodGroup = 'fish' | 'seafood' | 'vegetables' | 'fruit' | 'pantry'
export type BatchStatus = 'live' | 'held' | 'sold_out' | 'removed'
export type OrderStatus = 'ordered' | 'confirmed' | 'ready' | 'picked_up' | 'declined'
export type CredentialType = 'fishing_licence' | 'vessel' | 'farm_registration' | 'aquaculture_lease'

/** Map pin kinds: farm and wharf are exact locations; pickup is a meeting spot. */
export type PinKind = 'farm' | 'wharf' | 'pickup' | 'market'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  is_seller: boolean
  is_admin: boolean
  is_sample: boolean
}

export interface Seller {
  id: string
  profile_id: string
  kind: SellerKind
  display_name: string
  business_name: string
  story: string
  status: SellerStatus
  verified_note: string | null
  default_origin: string | null
  default_source: string | null
  roll_requested_at: string | null
  is_sample: boolean
  created_at: string
}

export interface SellerLocation {
  seller_id: string
  pin_type: PinType
  site_kind: SiteKind | null
  place_name: string
  lat: number
  lng: number
  area_label: string
  hours_text: string
  show_phone: boolean
  available_now: boolean
  available_since: string | null
}

/** Row of the public seller_directory view. */
export interface DirectorySeller {
  seller_id: string
  kind: SellerKind
  display_name: string
  business_name: string
  story: string
  verified_note: string | null
  pin_type: PinType
  site_kind: SiteKind | null
  place_name: string
  lat: number
  lng: number
  area_label: string
  hours_text: string
  show_phone: boolean
  phone: string | null
  available_now: boolean
  available_since: string | null
  market_ids: string[]
  product_ids: string[]
  is_sample: boolean
}

export interface Product {
  slug: string
  name: string
  short_name: string
  unit: string
  category: Category
  food_group: FoodGroup
  icon: string
  harvest_verb: string
  season_months: number[]
  shelf_days: number
  boat_limit: number | null
  sort: number
}

export interface Market {
  id: string
  name: string
  place: string
  lat: number
  lng: number
  days_text: string
}

export interface CheckResult {
  key: string
  label: string
  ok: boolean
  detail: string
  km?: number | null
}

export interface Batch {
  id: string
  seller_id: string
  product_id: string
  qty_total: number
  qty_left: number
  price: number
  caught_or_harvested_at: string
  when_text: string | null
  origin_text: string
  source_text: string
  pickup_option: string
  pickup_place: string
  photo_path: string | null
  photo_taken_at: string | null
  check_results: CheckResult[]
  status: BatchStatus
  is_sample: boolean
  created_at: string
}

export interface Order {
  id: number
  batch_id: string
  buyer_id: string
  seller_id: string
  buyer_name: string
  qty: number
  unit_price: number
  total: number
  pickup_option: string
  pickup_place: string
  pickup_when: string
  status: OrderStatus
  created_at: string
  confirmed_at: string | null
  ready_at: string | null
  picked_up_at: string | null
  declined_at: string | null
  updated_at: string
}

export interface IndexRow {
  product_id: string
  region: string
  date: string
  low: number
  high: number
  avg: number
  sales_count: number
  report_count: number
  window_days: number
}

export interface Credential {
  id: string
  seller_id: string
  type: CredentialType
  number: string
  checked_at: string | null
}

export interface SeasonPlan {
  id: string
  seller_id: string
  product_id: string
  size_text: string
  expected_qty: number
  year: number
}

export interface Flag {
  id: number
  kind: string
  label_code: string | null
  batch_id: string | null
  seller_id: string | null
  roll_id: string | null
  details: Record<string, unknown>
  status: 'open' | 'cleared'
  created_at: string
}

export interface LabelRoll {
  id: string
  seller_id: string
  size: number
  issued_at: string
  note: string | null
}

/** What the public label page gets back from the label API. */
export interface LabelLookup {
  status: 'active' | 'not_found' | 'blank' | 'void' | 'rate_limited' | 'error'
  code: string
  message?: string
  product?: { slug: string; name: string; short_name: string; unit: string; category: Category; icon: string; harvest_verb: string }
  batch?: {
    id: string
    qty_total: number
    status: BatchStatus
    caught_at: string
    when_text: string | null
    listed_at: string
    origin: string
    source: string
    pickup_place: string
    checks_passed: boolean
  }
  seller?: {
    display_name: string
    business_name: string
    kind: SellerKind
    verified_note: string | null
    phone: string | null
    place_name: string
    area_label: string
    pin_type: PinType
    site_kind: SiteKind | null
  }
  scans?: { count: number; devices: number; cities: string[] }
  warnings?: { copied: boolean; too_many: boolean; far: boolean; far_cities: string[]; late: boolean }
  sold?: { to: string; at: string | null } | null
}
