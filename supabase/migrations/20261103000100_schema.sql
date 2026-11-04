-- Landed: tables, row-level security and grants.
--
-- Rules of the road:
--   * Every table has RLS on. Anything not granted below is refused.
--   * The browser never writes to labels, batches, orders, scans, flags or price
--     data directly. Those changes go through the server functions in the next
--     migration (security definer), which check who is asking.
--   * Private things (saved home locations, settings, rate limits, admin log)
--     live in the `private` schema, which the API does not expose.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------- types

create type public.seller_kind as enum ('fisher', 'farmer', 'both');
create type public.seller_status as enum ('pending', 'approved', 'suspended');
create type public.credential_type as enum ('fishing_licence', 'vessel', 'farm_registration', 'aquaculture_lease');
create type public.pin_type as enum ('exact', 'pickup');
create type public.site_kind as enum ('farm', 'wharf');
create type public.product_category as enum ('sea', 'land');
create type public.label_status as enum ('blank', 'active', 'void');
create type public.batch_status as enum ('live', 'held', 'sold_out', 'removed');
create type public.order_status as enum ('ordered', 'confirmed', 'ready', 'picked_up', 'declined');
create type public.price_source as enum ('sale', 'report');
create type public.flag_kind as enum ('fake_code', 'blank_scanned', 'too_many_scans', 'far_scans', 'late_scan', 'failed_check', 'buyer_report');
create type public.flag_status as enum ('open', 'cleared');

-- ---------------------------------------------------------------- people

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  is_seller boolean not null default false,
  is_admin boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  kind public.seller_kind not null,
  display_name text not null,
  business_name text not null,
  story text not null default '',
  status public.seller_status not null default 'pending',
  verified_note text,
  default_origin text,
  default_source text,
  roll_requested_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles (id)
);

create table public.seller_credentials (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  type public.credential_type not null,
  number text not null,
  checked_by uuid references public.profiles (id),
  checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.seller_credentials (seller_id);

-- The pin buyers see. Exactly one per seller. A seller who uses a pickup spot
-- has only the spot here; their farm or wharf, if saved, sits in private.saved_pins.
create table public.seller_locations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.sellers (id) on delete cascade,
  pin_type public.pin_type not null,
  site_kind public.site_kind,
  place_name text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  area_label text not null,
  hours_text text not null default '',
  show_phone boolean not null default true,
  available_now boolean not null default false,
  available_since timestamptz,
  updated_at timestamptz not null default now(),
  check (pin_type = 'pickup' or site_kind is not null)
);

create table private.saved_pins (
  seller_id uuid not null references public.sellers (id) on delete cascade,
  pin_type public.pin_type not null,
  site_kind public.site_kind,
  place_name text not null,
  lat double precision not null,
  lng double precision not null,
  area_label text not null,
  hours_text text not null default '',
  primary key (seller_id, pin_type)
);

-- ---------------------------------------------------------------- catalogue

create table public.products (
  slug text primary key,
  name text not null,
  short_name text not null,
  unit text not null,
  category public.product_category not null,
  icon text not null,
  harvest_verb text not null default 'Harvested',
  season_months smallint[] not null default '{1,2,3,4,5,6,7,8,9,10,11,12}',
  -- How long the food should last after harvest: scans after this get a
  -- "this batch should be sold out" note.
  shelf_days integer not null default 30,
  -- Most a single boat would realistically land in one batch (sea products).
  boat_limit numeric,
  sort smallint not null default 0
);

create table public.seller_products (
  seller_id uuid not null references public.sellers (id) on delete cascade,
  product_id text not null references public.products (slug),
  approved boolean not null default false,
  primary key (seller_id, product_id)
);

create table public.season_plans (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  product_id text not null references public.products (slug),
  size_text text not null default '',
  expected_qty numeric not null check (expected_qty > 0),
  year smallint not null,
  unique (seller_id, product_id, year)
);

create table public.markets (
  id text primary key,
  name text not null,
  place text not null,
  lat double precision not null,
  lng double precision not null,
  days_text text not null
);

create table public.seller_markets (
  seller_id uuid not null references public.sellers (id) on delete cascade,
  market_id text not null references public.markets (id),
  primary key (seller_id, market_id)
);

-- ---------------------------------------------------------------- labels and batches

create table public.label_rolls (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  size integer not null check (size between 1 and 1000),
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles (id),
  note text
);
create index on public.label_rolls (seller_id);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  product_id text not null references public.products (slug),
  qty_total numeric not null check (qty_total > 0),
  qty_left numeric not null check (qty_left >= 0),
  price numeric(10, 2) not null check (price > 0),
  caught_or_harvested_at timestamptz not null default now(),
  when_text text,
  origin_text text not null default '',
  source_text text not null default '',
  pickup_option text not null default 'pin',
  pickup_place text not null default '',
  photo_path text,
  photo_taken_at timestamptz,
  -- Only the result of the photo-place check is kept (distance in km, inside
  -- check_results); the photo's coordinates are never stored.
  check_results jsonb not null default '[]'::jsonb,
  status public.batch_status not null default 'held',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz
);
create index on public.batches (status);
create index on public.batches (seller_id);

create table public.labels (
  code text primary key check (code ~ '^LD-[A-Z0-9]{6}$'),
  roll_id uuid not null references public.label_rolls (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  status public.label_status not null default 'blank',
  batch_id uuid references public.batches (id) on delete set null,
  activated_at timestamptz
);
create index on public.labels (seller_id, status);
create index on public.labels (batch_id);

create sequence public.order_number_seq start with 1050;
create table public.orders (
  id bigint primary key default nextval('public.order_number_seq'),
  batch_id uuid not null references public.batches (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  buyer_name text not null default '',
  qty numeric not null check (qty > 0),
  unit_price numeric(10, 2) not null,
  total numeric(10, 2) not null,
  pickup_option text not null default 'pin',
  pickup_place text not null,
  pickup_when text not null default '',
  status public.order_status not null default 'ordered',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  declined_at timestamptz,
  updated_at timestamptz not null default now()
);
alter sequence public.order_number_seq owned by public.orders.id;
create index on public.orders (buyer_id);
create index on public.orders (seller_id);

-- One row per label-page view. Approximate city and a hashed device id only:
-- no IP address, no coordinates (just the rounded distance from the sale).
create table public.scans (
  id bigint generated always as identity primary key,
  label_code text not null,
  scanned_at timestamptz not null default now(),
  city text,
  region text,
  country text,
  device_hash text,
  km_from_sale integer,
  result text not null
);
create index on public.scans (label_code);

-- ---------------------------------------------------------------- prices

create table public.price_points (
  id bigint generated always as identity primary key,
  product_id text not null references public.products (slug),
  region text not null default 'se-nb',
  price numeric(10, 2) not null check (price > 0),
  source public.price_source not null,
  recorded_at timestamptz not null default now(),
  order_id bigint references public.orders (id) on delete set null,
  reporter_id uuid references public.profiles (id) on delete set null
);
create index on public.price_points (product_id, region, recorded_at);

create table public.price_index_daily (
  product_id text not null references public.products (slug),
  region text not null default 'se-nb',
  date date not null,
  low numeric(10, 2) not null,
  high numeric(10, 2) not null,
  avg numeric(10, 2) not null,
  sales_count integer not null,
  report_count integer not null,
  window_days smallint not null,
  primary key (product_id, region, date)
);

-- ---------------------------------------------------------------- review and sign-ups

create table public.flags (
  id bigint generated always as identity primary key,
  kind public.flag_kind not null,
  label_code text,
  batch_id uuid references public.batches (id) on delete cascade,
  seller_id uuid references public.sellers (id) on delete cascade,
  roll_id uuid references public.label_rolls (id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  status public.flag_status not null default 'open',
  created_at timestamptz not null default now(),
  cleared_by uuid references public.profiles (id),
  cleared_at timestamptz
);
create index on public.flags (status);

create table public.pilot_signups (
  id bigint generated always as identity primary key,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  module text not null check (length(module) <= 40),
  profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (email, module)
);

-- ---------------------------------------------------------------- private tables

create table private.settings (
  key text primary key,
  value jsonb not null,
  note text
);

create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create table private.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers used by policies

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;

create function private.my_seller_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.sellers s where s.profile_id = auth.uid()
$$;

create function private.owns_seller(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sellers s where s.id = sid and s.profile_id = auth.uid())
$$;

create function private.seller_is_approved(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sellers s where s.id = sid and s.status = 'approved')
$$;

revoke all on function private.is_admin(), private.my_seller_id(), private.owns_seller(uuid), private.seller_is_approved(uuid) from public;
grant execute on function private.is_admin(), private.my_seller_id(), private.owns_seller(uuid), private.seller_is_approved(uuid) to anon, authenticated, service_role;

-- New sign-ups get a profile. Name and phone come from the sign-up form.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 40), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.seller_credentials enable row level security;
alter table public.seller_locations enable row level security;
alter table public.products enable row level security;
alter table public.seller_products enable row level security;
alter table public.season_plans enable row level security;
alter table public.markets enable row level security;
alter table public.seller_markets enable row level security;
alter table public.label_rolls enable row level security;
alter table public.labels enable row level security;
alter table public.batches enable row level security;
alter table public.orders enable row level security;
alter table public.scans enable row level security;
alter table public.price_points enable row level security;
alter table public.price_index_daily enable row level security;
alter table public.flags enable row level security;
alter table public.pilot_signups enable row level security;
alter table private.saved_pins enable row level security;
alter table private.settings enable row level security;
alter table private.rate_limits enable row level security;
alter table private.admin_log enable row level security;

-- Start from nothing, then grant exactly what each role needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated, public;

-- profiles: you see and edit your own name and phone; admins see everyone.
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or private.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- sellers: approved sellers are public; you always see your own; admins see all.
-- Status and checks change only through admin functions.
grant select on public.sellers to anon, authenticated;
grant update (display_name, business_name, story, default_origin, default_source) on public.sellers to authenticated;
create policy sellers_select on public.sellers for select to anon, authenticated
  using (status = 'approved' or profile_id = auth.uid() or private.is_admin());
create policy sellers_update on public.sellers for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- credentials: only the seller and admins.
grant select on public.seller_credentials to authenticated;
create policy credentials_select on public.seller_credentials for select to authenticated
  using (private.owns_seller(seller_id) or private.is_admin());

-- pins: public for approved sellers. Sellers edit their own pin details and switches.
grant select on public.seller_locations to anon, authenticated;
grant update (place_name, area_label, hours_text, lat, lng, show_phone, available_now, available_since, updated_at)
  on public.seller_locations to authenticated;
create policy locations_select on public.seller_locations for select to anon, authenticated
  using (private.seller_is_approved(seller_id) or private.owns_seller(seller_id) or private.is_admin());
create policy locations_update on public.seller_locations for update to authenticated
  using (private.owns_seller(seller_id)) with check (private.owns_seller(seller_id));

-- catalogue and markets: public reads.
grant select on public.products, public.markets, public.seller_markets, public.seller_products to anon, authenticated;
create policy products_select on public.products for select to anon, authenticated using (true);
create policy markets_select on public.markets for select to anon, authenticated using (true);
create policy seller_markets_select on public.seller_markets for select to anon, authenticated using (true);
create policy seller_products_select on public.seller_products for select to anon, authenticated using (true);

-- season plans: the seller and admins.
grant select on public.season_plans to authenticated;
create policy season_plans_select on public.season_plans for select to authenticated
  using (private.owns_seller(seller_id) or private.is_admin());

-- label rolls and labels: the seller and admins can read. Nobody writes from the browser.
grant select on public.label_rolls, public.labels to authenticated;
create policy rolls_select on public.label_rolls for select to authenticated
  using (private.owns_seller(seller_id) or private.is_admin());
create policy labels_select on public.labels for select to authenticated
  using (private.owns_seller(seller_id) or private.is_admin());

-- batches: live batches of approved sellers are public. Held or removed ones
-- only for their seller and admins.
grant select on public.batches to anon, authenticated;
create policy batches_select on public.batches for select to anon, authenticated
  using (
    (status in ('live', 'sold_out') and private.seller_is_approved(seller_id))
    or private.owns_seller(seller_id)
    or private.is_admin()
  );

-- orders: the buyer, the seller and admins.
grant select on public.orders to authenticated;
create policy orders_select on public.orders for select to authenticated
  using (buyer_id = auth.uid() or private.owns_seller(seller_id) or private.is_admin());

-- scans and flags: admins only (the label page gets scan counts from the server function).
grant select on public.scans, public.flags to authenticated;
create policy scans_select on public.scans for select to authenticated using (private.is_admin());
create policy flags_select on public.flags for select to authenticated using (private.is_admin());

-- prices: the daily index is public; raw price points are for admins.
grant select on public.price_index_daily to anon, authenticated;
grant select on public.price_points to authenticated;
create policy index_select on public.price_index_daily for select to anon, authenticated using (true);
create policy points_select on public.price_points for select to authenticated using (private.is_admin());

-- pilot sign-ups: written through join_pilot(); admins read them.
grant select on public.pilot_signups to authenticated;
create policy pilot_select on public.pilot_signups for select to authenticated using (private.is_admin());

-- ---------------------------------------------------------------- public seller directory

-- What buyers see about a seller, in one place. Runs with the owner's rights so
-- it can join profiles, but it only exposes approved sellers, and the phone
-- number only when the seller has "Show my phone number" on.
create view public.seller_directory
with (security_invoker = false) as
select
  s.id as seller_id,
  s.kind,
  s.display_name,
  s.business_name,
  s.story,
  s.verified_note,
  l.pin_type,
  l.site_kind,
  l.place_name,
  l.lat,
  l.lng,
  l.area_label,
  l.hours_text,
  l.show_phone,
  case when l.show_phone then p.phone end as phone,
  l.available_now,
  l.available_since,
  coalesce((select array_agg(sm.market_id order by sm.market_id) from public.seller_markets sm where sm.seller_id = s.id), '{}') as market_ids,
  coalesce((select array_agg(sp.product_id order by sp.product_id) from public.seller_products sp where sp.seller_id = s.id and sp.approved), '{}') as product_ids,
  s.is_sample
from public.sellers s
join public.seller_locations l on l.seller_id = s.id
join public.profiles p on p.id = s.profile_id
where s.status = 'approved';

revoke all on public.seller_directory from anon, authenticated;
grant select on public.seller_directory to anon, authenticated;
