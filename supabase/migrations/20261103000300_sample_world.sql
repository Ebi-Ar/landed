-- The sample world for the demo: Marc the fisher and Lise the farmer around
-- Moncton and Shediac, four more sellers, two markets, ten products, live
-- batches, a copied label, demo label rolls and 30 days of price points.
--
-- Everything here is SAMPLE DATA: people, phone numbers (fictional 555 range),
-- licence numbers, prices and scans. Times are relative to "now", so a reset
-- just before a pitch makes "Landed 2 h ago" true again.
--
-- private.load_sample_world() is re-runnable. It is called by supabase/seed.sql
-- and by the admin-only reset_demo() function.

create function private.sample_user(p_id uuid, p_email text, p_password text, p_name text, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          case when p_password is null then '' else extensions.crypt(p_password, extensions.gen_salt('bf')) end,
          now(), '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', p_name, 'phone', p_phone), now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (p_id::text, p_id, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now())
  on conflict (provider_id, provider) do nothing;

  insert into public.profiles (id, full_name, phone, is_sample)
  values (p_id, p_name, p_phone, true)
  on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone, is_sample = true;
end $$;

-- Deterministic blank codes for the printed demo sheet, so the sheet keeps
-- working after every reset.
create function private.sample_code(p_seed text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTWXYZ23456789';
  h bytea := decode(md5(p_seed), 'hex');
  s text := 'LD-';
begin
  for i in 0..5 loop
    s := s || substr(alphabet, (get_byte(h, i) % length(alphabet)) + 1, 1);
  end loop;
  return s;
end $$;

-- A number in [0, 1) from a string, for repeatable "random" sample prices.
create function private.sample_rand(p_seed text) returns double precision
language sql immutable set search_path = '' as $$
  select (('x' || lpad(substr(md5(p_seed), 1, 8), 16, '0'))::bit(64)::bigint)::double precision / 4294967296.0
$$;

create function private.load_sample_world() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tz constant text := 'America/Moncton';
  v_now timestamptz := now();
  v_year smallint := extract(year from now() at time zone 'America/Moncton')::smallint;
  v_today date := (now() at time zone 'America/Moncton')::date;
  v_noon timestamptz := ((now() at time zone 'America/Moncton')::date + time '12:00') at time zone 'America/Moncton';

  -- people (fixed ids so the demo accounts survive resets)
  u_buyer constant uuid := '10000000-0000-4000-8000-000000000001';
  u_marc constant uuid := '10000000-0000-4000-8000-000000000002';
  u_lise constant uuid := '10000000-0000-4000-8000-000000000003';
  u_admin constant uuid := '10000000-0000-4000-8000-000000000004';
  u_bay constant uuid := '10000000-0000-4000-8000-000000000005';
  u_denise constant uuid := '10000000-0000-4000-8000-000000000006';
  u_verger constant uuid := '10000000-0000-4000-8000-000000000007';
  u_kim constant uuid := '10000000-0000-4000-8000-000000000008';
  u_coq constant uuid := '10000000-0000-4000-8000-000000000009';
  u_sophie constant uuid := '10000000-0000-4000-8000-00000000000a';
  u_jean constant uuid := '10000000-0000-4000-8000-00000000000b';

  s_marc constant uuid := '20000000-0000-4000-8000-000000000001';
  s_lise constant uuid := '20000000-0000-4000-8000-000000000002';
  s_bay constant uuid := '20000000-0000-4000-8000-000000000003';
  s_denise constant uuid := '20000000-0000-4000-8000-000000000004';
  s_verger constant uuid := '20000000-0000-4000-8000-000000000005';
  s_kim constant uuid := '20000000-0000-4000-8000-000000000006';

  b_lobster constant uuid := '30000000-0000-4000-8000-000000000001';
  b_mackerel constant uuid := '30000000-0000-4000-8000-000000000002';
  b_potatoes constant uuid := '30000000-0000-4000-8000-000000000003';
  b_carrots constant uuid := '30000000-0000-4000-8000-000000000004';
  b_squash constant uuid := '30000000-0000-4000-8000-000000000005';
  b_oysters constant uuid := '30000000-0000-4000-8000-000000000006';
  b_scallops constant uuid := '30000000-0000-4000-8000-000000000007';
  b_apples constant uuid := '30000000-0000-4000-8000-000000000008';
  b_maple constant uuid := '30000000-0000-4000-8000-000000000009';
  b_honey constant uuid := '30000000-0000-4000-8000-00000000000a';
  b_copied constant uuid := '30000000-0000-4000-8000-00000000000b';

  v_checks_sea jsonb;
  v_checks_land jsonb;
  r record;
  v_roll uuid;
  v_n integer;
  v_i integer;
  v_d integer;
  v_k integer;
  v_center numeric;
  v_span numeric;
  v_city text;
  v_km integer;
begin
  -- ---------------------------------------------------------- wipe the old world
  delete from public.orders;
  delete from public.scans;
  delete from public.flags;
  delete from public.labels;
  delete from public.label_rolls;
  delete from public.batches;
  delete from public.price_index_daily;
  delete from public.price_points;
  delete from public.sellers where is_sample;
  update public.seller_locations set available_now = false, available_since = null;
  update public.profiles p set is_seller = exists (select 1 from public.sellers s where s.profile_id = p.id);

  -- ---------------------------------------------------------- catalogue
  insert into public.products (slug, name, short_name, unit, category, icon, harvest_verb, season_months, shelf_days, boat_limit, sort) values
    ('lobster',  'Live lobster',               'Lobster',     'lb',     'sea',  'lobster', 'Landed',    '{1,2,3,4,5,6,8,9,10,11,12}', 7,   2000, 1),
    ('oysters',  'Oysters',                    'Oysters',     'dozen',  'sea',  'shell',   'Harvested', '{1,2,3,4,5,6,7,8,9,10,11,12}', 10, 600, 2),
    ('mackerel', 'Atlantic mackerel',          'Mackerel',    'lb',     'sea',  'fish',    'Landed',    '{5,6,7,8,9,10,11}', 4,    3000, 3),
    ('scallops', 'Sea scallops',               'Scallops',    'lb',     'sea',  'shell',   'Landed',    '{1,2,3,4,5,6,7,8,9,10,11,12}', 7, 1500, 4),
    ('potatoes', 'Potatoes, 20 lb bag',        'Potatoes',    'bag',    'land', 'tuber',   'Dug',       '{1,2,3,4,5,6,7,8,9,10,11,12}', 150, null, 5),
    ('carrots',  'Carrots, 5 lb bag',          'Carrots',     'bag',    'land', 'carrot',  'Pulled',    '{1,2,3,7,8,9,10,11,12}', 90, null, 6),
    ('squash',   'Butternut squash',           'Squash',      'each',   'land', 'squash',  'Harvested', '{1,2,8,9,10,11,12}', 120, null, 7),
    ('apples',   'Honeycrisp apples, 3 lb bag', 'Apples',     'bag',    'land', 'apple',   'Picked',    '{1,2,3,8,9,10,11,12}', 90, null, 8),
    ('maple',    'Maple syrup, 500 ml',        'Maple syrup', 'bottle', 'land', 'drop',    'Made',      '{1,2,3,4,5,6,7,8,9,10,11,12}', 730, null, 9),
    ('honey',    'Local honey, 500 g',         'Honey',       'jar',    'land', 'honey',   'Harvested', '{1,2,3,4,5,6,7,8,9,10,11,12}', 730, null, 10)
  on conflict (slug) do update set
    name = excluded.name, short_name = excluded.short_name, unit = excluded.unit, category = excluded.category,
    icon = excluded.icon, harvest_verb = excluded.harvest_verb, season_months = excluded.season_months,
    shelf_days = excluded.shelf_days, boat_limit = excluded.boat_limit, sort = excluded.sort;

  insert into public.markets (id, name, place, lat, lng, days_text) values
    ('moncton', 'Moncton Market', 'Downtown Moncton, Westmorland Street', 46.0886, -64.7786, 'Saturday mornings, 7 am–1 pm (sample hours)'),
    ('dieppe',  'Dieppe Market',  'Dieppe, Acadie Avenue',               46.0968, -64.7262, 'Saturday mornings, 7 am–1 pm (sample hours)')
  on conflict (id) do update set name = excluded.name, place = excluded.place, lat = excluded.lat, lng = excluded.lng, days_text = excluded.days_text;

  -- ---------------------------------------------------------- people
  -- Demo logins (sample data): buyer, Marc and Lise share the password "landed-demo".
  -- The admin account has no password here; set one in the Supabase SQL editor (see README).
  perform private.sample_user(u_buyer,  'buyer@example.com', 'landed-demo', 'Sam Gallant', '(506) 555-0101');
  perform private.sample_user(u_marc,   'marc@example.com',  'landed-demo', 'Marc Leblanc', '(506) 555-0142');
  perform private.sample_user(u_lise,   'lise@example.com',  'landed-demo', 'Lise Ouellette', '(506) 555-0187');
  perform private.sample_user(u_admin,  'admin@example.com', null, 'Landed team', null);
  perform private.sample_user(u_bay,    'bayshore@example.com', null, 'Paul Cormier', '(506) 555-0119');
  perform private.sample_user(u_denise, 'denise@example.com', null, 'Denise Cormier', '(506) 555-0163');
  perform private.sample_user(u_verger, 'verger@example.com', null, 'Rémi Richard', '(506) 555-0128');
  perform private.sample_user(u_kim,    'kim@example.com', null, 'Kim MacLean', '(506) 555-0174');
  perform private.sample_user(u_coq,    'coquillage@example.com', null, 'Le Coquillage (restaurant)', null);
  perform private.sample_user(u_sophie, 'sophie@example.com', null, 'Sophie Tremblay', null);
  perform private.sample_user(u_jean,   'jean@example.com', null, 'Jean Belliveau', null);
  update public.profiles set is_admin = true where id = u_admin;
  update public.profiles set is_seller = true where id in (u_marc, u_lise, u_bay, u_denise, u_verger, u_kim);

  insert into public.sellers (id, profile_id, kind, display_name, business_name, story, status, verified_note,
                              default_origin, default_source, is_sample, approved_at, approved_by) values
    (s_marc,   u_marc,   'fisher', 'Marc Leblanc',      'Boat: Marie-Claire II',      'Fishing out of Shediac for 22 years',
     'approved', 'Fishing licence and registered boat checked', 'Lobster Fishing Area 25, Northumberland Strait', 'Marie-Claire II', true, v_now - interval '200 days', u_admin),
    (s_lise,   u_lise,   'farmer', 'Lise Ouellette',    'Ouellette Family Farm',      'Third-generation family farm',
     'approved', 'Farm registration checked', 'Ouellette Family Farm, Memramcook', 'Ouellette Family Farm', true, v_now - interval '200 days', u_admin),
    (s_bay,    u_bay,    'fisher', 'Bay Shore Oysters', 'Paul and Luc Cormier',       'Small oyster lease run by two brothers',
     'approved', 'Aquaculture lease checked', 'Cocagne Bay, lease 112', 'Bay Shore Oysters', true, v_now - interval '150 days', u_admin),
    (s_denise, u_denise, 'fisher', 'Denise Cormier',    'Boat: Lady Denise',          'Scallop and mackerel fisher',
     'approved', 'Fishing licence and registered boat checked', 'Northumberland Strait', 'Lady Denise', true, v_now - interval '150 days', u_admin),
    (s_verger, u_verger, 'farmer', 'Verger Richard',    'Richard family orchard',     'Family orchard with pick-your-own in the fall',
     'approved', 'Farm registration checked', 'Verger Richard, Saint-Antoine', 'Verger Richard', true, v_now - interval '120 days', u_admin),
    (s_kim,    u_kim,    'farmer', 'Kim MacLean',       'Kennebecasis Valley Maple',  'Maple syrup and honey from the valley',
     'approved', 'Farm registration checked', 'Near Sussex', 'Kennebecasis Valley Maple', true, v_now - interval '120 days', u_admin);

  insert into public.seller_credentials (seller_id, type, number, checked_by, checked_at) values
    (s_marc,   'fishing_licence',   'Lobster, LFA 25 (sample no. NB-25-0142)', u_admin, v_now - interval '200 days'),
    (s_marc,   'vessel',            'Marie-Claire II (sample reg. 812345)',    u_admin, v_now - interval '200 days'),
    (s_lise,   'farm_registration', 'NB farm registration (sample no. F-20871)', u_admin, v_now - interval '200 days'),
    (s_bay,    'aquaculture_lease', 'Cocagne Bay lease 112 (sample)',          u_admin, v_now - interval '150 days'),
    (s_denise, 'fishing_licence',   'Scallop and mackerel (sample no. NB-SF-0163)', u_admin, v_now - interval '150 days'),
    (s_denise, 'vessel',            'Lady Denise (sample reg. 806611)',        u_admin, v_now - interval '150 days'),
    (s_verger, 'farm_registration', 'NB farm registration (sample no. F-18342)', u_admin, v_now - interval '120 days'),
    (s_kim,    'farm_registration', 'NB farm registration (sample no. F-19907)', u_admin, v_now - interval '120 days');

  -- Pins at real public places (wharves, a farm stand, village centres). Sample sellers.
  insert into public.seller_locations (seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text, show_phone, available_now, available_since) values
    (s_marc,   'exact',  'wharf', 'Pointe-du-Chêne wharf',        46.2416, -64.5228, 'Near Shediac',       'Most days 1–5 pm, after landing',   true,  true,  v_now - interval '40 min'),
    (s_lise,   'exact',  'farm',  'Ouellette Family Farm stand',  46.0152, -64.5703, 'Near Memramcook',    'Farm stand Thu–Sun, 10 am–6 pm',    true,  true,  v_now - interval '3 hours'),
    (s_bay,    'pickup', null,    'Cocagne wharf parking lot',    46.3368, -64.6061, 'Near Cocagne',       'Pickup Fri and Sat, 9 am–noon',     true,  false, null),
    (s_denise, 'pickup', null,    'Cap-Pelé harbour',             46.2262, -64.2859, 'Near Cap-Pelé',      'Pickup most afternoons',            false, true,  v_now - interval '1 hour'),
    (s_verger, 'exact',  'farm',  'Verger Richard orchard store', 46.3702, -64.7651, 'Near Saint-Antoine', 'Orchard store Sat–Sun, 9 am–5 pm',  true,  false, null),
    (s_kim,    'pickup', null,    'Main Street pickup, Sussex',   45.7246, -65.5103, 'Near Sussex',        'Pickup Wednesdays, 4–6 pm',         true,  false, null);

  insert into private.saved_pins (seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text)
  select seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text from public.seller_locations
   where seller_id in (s_marc, s_lise, s_bay, s_denise, s_verger, s_kim);
  -- Marc and Lise also have a pickup spot saved, for the "Use a pickup spot instead" switch.
  insert into private.saved_pins (seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text) values
    (s_marc, 'pickup', null, 'Shediac waterfront parking lot', 46.2236, -64.5396, 'Near Shediac', 'Most days 2–5 pm'),
    (s_lise, 'pickup', null, 'Memramcook village centre',      46.0004, -64.5509, 'Near Memramcook', 'Thu–Sun, 10 am–6 pm');

  insert into public.seller_products (seller_id, product_id, approved) values
    (s_marc, 'lobster', true), (s_marc, 'mackerel', true),
    (s_lise, 'potatoes', true), (s_lise, 'carrots', true), (s_lise, 'squash', true),
    (s_bay, 'oysters', true),
    (s_denise, 'scallops', true), (s_denise, 'mackerel', true),
    (s_verger, 'apples', true), (s_verger, 'honey', true),
    (s_kim, 'maple', true), (s_kim, 'honey', true);

  insert into public.season_plans (seller_id, product_id, size_text, expected_qty, year) values
    (s_lise, 'potatoes', '4 acres', 400, v_year),
    (s_lise, 'carrots', '1 acre', 200, v_year),
    (s_lise, 'squash', '1.5 acres', 600, v_year),
    (s_verger, 'apples', 'Block B, 6 acres', 800, v_year),
    (s_verger, 'honey', '20 hives', 300, v_year),
    (s_kim, 'maple', '1,200 taps', 500, v_year),
    (s_kim, 'honey', '12 hives', 200, v_year);

  insert into public.seller_markets (seller_id, market_id) values
    (s_marc, 'dieppe'), (s_lise, 'moncton'), (s_bay, 'moncton'), (s_denise, 'dieppe'), (s_verger, 'moncton');

  -- ---------------------------------------------------------- batches (each with its label)
  v_checks_sea := '[
    {"key":"seller","label":"Seller verified","ok":true,"detail":"Licence and boat checked"},
    {"key":"product","label":"Right product","ok":true,"detail":"On the approved list"},
    {"key":"season","label":"In season","ok":true,"detail":"In season this month"},
    {"key":"amount","label":"Realistic amount","ok":true,"detail":"Realistic for one boat"},
    {"key":"photo_time","label":"Photo is fresh","ok":true,"detail":"Photo taken in Landed"},
    {"key":"photo_place","label":"Photo place","ok":true,"detail":"Taken at the wharf"},
    {"key":"label","label":"Label belongs to you","ok":true,"detail":"On the seller''s roll"}]';
  v_checks_land := '[
    {"key":"seller","label":"Seller verified","ok":true,"detail":"Farm registration checked"},
    {"key":"product","label":"Right product","ok":true,"detail":"Matches the season plan"},
    {"key":"season","label":"In season","ok":true,"detail":"In season this month"},
    {"key":"amount","label":"Realistic amount","ok":true,"detail":"Fits the expected harvest"},
    {"key":"photo_time","label":"Photo is fresh","ok":true,"detail":"Photo taken in Landed"},
    {"key":"photo_place","label":"Photo place","ok":true,"detail":"Taken at the farm"},
    {"key":"label","label":"Label belongs to you","ok":true,"detail":"On the seller''s roll"}]';

  insert into public.batches (id, seller_id, product_id, qty_total, qty_left, price, caught_or_harvested_at, when_text,
                              origin_text, source_text, pickup_option, pickup_place, check_results, status, is_sample, created_at) values
    (b_lobster,  s_marc,   'lobster',  124, 120, 8.75,  v_now - interval '2 hours',  null,
     'Lobster Fishing Area 25, Northumberland Strait', 'Marie-Claire II', 'pin', 'Pointe-du-Chêne wharf', v_checks_sea, 'live', true, v_now - interval '110 min'),
    (b_mackerel, s_marc,   'mackerel', 40,  40,  3.25,  v_now - interval '6 hours',  null,
     'Shediac Bay', 'Marie-Claire II', 'pin', 'Pointe-du-Chêne wharf', v_checks_sea, 'live', true, v_now - interval '5 hours'),
    (b_potatoes, s_lise,   'potatoes', 35,  35,  14.00, v_now - interval '3 days',   null,
     'Field 2, Ouellette Family Farm', 'Ouellette Family Farm', 'pin', 'Ouellette Family Farm stand', v_checks_land, 'live', true, v_now - interval '2 days'),
    (b_carrots,  s_lise,   'carrots',  20,  20,  6.00,  v_now - interval '4 days',   null,
     'Field 4, Ouellette Family Farm', 'Ouellette Family Farm', 'pin', 'Ouellette Family Farm stand', v_checks_land, 'live', true, v_now - interval '3 days'),
    (b_squash,   s_lise,   'squash',   60,  60,  3.00,  v_now - interval '12 days',  null,
     'Field 1, Ouellette Family Farm', 'Ouellette Family Farm', 'pin', 'Ouellette Family Farm stand', v_checks_land, 'live', true, v_now - interval '10 days'),
    (b_oysters,  s_bay,    'oysters',  30,  30,  17.00, v_now - interval '5 hours',  null,
     'Cocagne Bay, lease 112', 'Bay Shore Oysters', 'pin', 'Cocagne wharf parking lot', v_checks_sea, 'live', true, v_now - interval '4 hours'),
    (b_scallops, s_denise, 'scallops', 25,  25,  16.50, v_now - interval '25 hours', null,
     'Northumberland Strait', 'Lady Denise', 'pin', 'Cap-Pelé harbour', v_checks_sea, 'live', true, v_now - interval '24 hours'),
    (b_apples,   s_verger, 'apples',   50,  50,  6.50,  v_now - interval '3 days',   null,
     'Block B, Verger Richard', 'Verger Richard', 'pin', 'Verger Richard orchard store', v_checks_land, 'live', true, v_now - interval '2 days'),
    (b_maple,    s_kim,    'maple',    40,  40,  15.00, v_now - interval '200 days',
     (case when extract(month from v_now - interval '200 days') between 3 and 5 then 'Spring '
           when extract(month from v_now - interval '200 days') between 6 and 8 then 'Summer '
           when extract(month from v_now - interval '200 days') between 9 and 11 then 'Fall ' else 'Winter ' end)
       || extract(year from v_now - interval '200 days')::text || ' batch',
     'Sugar bush near Sussex', 'Kennebecasis Valley Maple', 'pin', 'Main Street pickup, Sussex', v_checks_land, 'live', true, v_now - interval '20 days'),
    (b_honey,    s_kim,    'honey',    25,  25,  13.50, v_now - interval '40 days',  null,
     'Hives near Sussex', 'Kennebecasis Valley Maple', 'pin', 'Main Street pickup, Sussex', v_checks_land, 'live', true, v_now - interval '15 days'),
    -- The copied-label example: sold to a Moncton restaurant, then scanned far away.
    (b_copied,   s_marc,   'lobster',  30,  0,   8.40,  v_now - interval '6 days',   null,
     'Lobster Fishing Area 25, Northumberland Strait', 'Marie-Claire II', 'pin', 'Pointe-du-Chêne wharf', v_checks_sea, 'sold_out', true, v_now - interval '6 days');

  -- Earlier rolls holding the labels already on those batches.
  for r in
    select * from (values
      (s_marc,   array['LD-8F3K2Q', 'LD-4R7T1M', 'LD-0X4K8L'], array[b_lobster, b_mackerel, b_copied]),
      (s_lise,   array['LD-9W2E6H', 'LD-3J8N5C', 'LD-6P1Q8V'], array[b_potatoes, b_carrots, b_squash]),
      (s_bay,    array['LD-2K9D4S'], array[b_oysters]),
      (s_denise, array['LD-5H3X7B'], array[b_scallops]),
      (s_verger, array['LD-7M4A2Z'], array[b_apples]),
      (s_kim,    array['LD-1C6F9R', 'LD-8B5Y3N'], array[b_maple, b_honey])
    ) as t(seller, codes, batch_ids)
  loop
    insert into public.label_rolls (seller_id, size, issued_at, issued_by, note)
    values (r.seller, array_length(r.codes, 1), v_now - interval '60 days', u_admin, 'Sample roll')
    returning id into v_roll;
    for v_i in 1..array_length(r.codes, 1) loop
      insert into public.labels (code, roll_id, seller_id, status, batch_id, activated_at)
      select r.codes[v_i], v_roll, r.seller, 'active', r.batch_ids[v_i], b.created_at
        from public.batches b where b.id = r.batch_ids[v_i];
    end loop;
  end loop;

  -- Demo rolls: 50 blank labels each for Marc and Lise, the same codes every reset.
  for r in select * from (values (s_marc, 'marc'), (s_lise, 'lise')) as t(seller, seed) loop
    insert into public.label_rolls (seller_id, size, issued_at, issued_by, note)
    values (r.seller, 50, v_now - interval '7 days', u_admin, 'Demo roll (printed sheet)')
    returning id into v_roll;
    v_n := 0;
    v_i := 0;
    while v_n < 50 loop
      v_i := v_i + 1;
      insert into public.labels (code, roll_id, seller_id)
      values (private.sample_code('landed-demo-roll-' || r.seed || '-' || v_i), v_roll, r.seller)
      on conflict (code) do nothing;
      if found then
        v_n := v_n + 1;
      end if;
    end loop;
  end loop;

  -- ---------------------------------------------------------- orders
  insert into public.orders (id, batch_id, buyer_id, seller_id, buyer_name, qty, unit_price, total, pickup_option, pickup_place,
                             pickup_when, status, created_at, confirmed_at, ready_at, picked_up_at, updated_at) values
    (1031, b_copied,   u_coq,    s_marc, 'Le Coquillage (restaurant), Moncton', 30, 8.40, 252.00, 'pin', 'Pointe-du-Chêne wharf',
     'Picked up', 'picked_up', v_now - interval '6 days', v_now - interval '6 days' + interval '20 min',
     v_now - interval '6 days' + interval '1 hour', v_now - interval '6 days' + interval '2 hours', v_now - interval '6 days' + interval '2 hours'),
    (1039, b_lobster,  u_sophie, s_marc, 'Sophie T., Dieppe', 4, 8.75, 35.00, 'pin', 'Pointe-du-Chêne wharf',
     'Today, 5:30 pm', 'confirmed', v_now - interval '90 min', v_now - interval '80 min', null, null, v_now - interval '80 min'),
    (1042, b_lobster,  u_coq,    s_marc, 'Le Coquillage (restaurant), Moncton', 30, 8.75, 262.50, 'pin', 'Pointe-du-Chêne wharf',
     'Today, 4:00 pm', 'ordered', v_now - interval '50 min', null, null, null, v_now - interval '50 min'),
    (1044, b_potatoes, u_jean,   s_lise, 'Jean B., Moncton', 2, 14.00, 28.00, 'pin', 'Ouellette Family Farm stand',
     'Saturday', 'ordered', v_now - interval '3 hours', null, null, null, v_now - interval '3 hours');
  perform setval('public.order_number_seq', 1050, false);

  -- ---------------------------------------------------------- scans
  for r in
    select * from (values
      ('LD-8F3K2Q', array['Moncton', 'Shediac', 'Moncton']),
      ('LD-4R7T1M', array['Shediac']),
      ('LD-9W2E6H', array['Moncton', 'Dieppe', 'Moncton', 'Moncton', 'Dieppe', 'Moncton']),
      ('LD-3J8N5C', array['Moncton', 'Moncton']),
      ('LD-2K9D4S', array['Moncton', 'Cocagne', 'Moncton', 'Cocagne']),
      ('LD-5H3X7B', array['Cap-Pelé', 'Cap-Pelé']),
      ('LD-7M4A2Z', array['Moncton', 'Bouctouche', 'Moncton', 'Bouctouche', 'Moncton']),
      ('LD-1C6F9R', array['Sussex', 'Sussex', 'Sussex']),
      ('LD-8B5Y3N', array['Sussex'])
    ) as t(code, cities)
  loop
    for v_i in 1..array_length(r.cities, 1) loop
      insert into public.scans (label_code, scanned_at, city, region, country, device_hash, km_from_sale, result)
      values (r.code, v_now - make_interval(mins => 15 + v_i * 37), r.cities[v_i], 'NB', 'CA',
              md5('sample-device-' || r.code || '-' || v_i), 20 + v_i * 3, 'active');
    end loop;
  end loop;

  -- LD-0X4K8L: 47 scans, nearly all far from the wharf it was sold at.
  for v_i in 1..47 loop
    if v_i <= 2 then
      v_city := 'Moncton'; v_km := 25;
    elsif v_i <= 19 then
      v_city := 'Halifax'; v_km := 205;
    elsif v_i <= 34 then
      v_city := 'Toronto'; v_km := 1290;
    else
      v_city := 'Montréal'; v_km := 880;
    end if;
    insert into public.scans (label_code, scanned_at, city, region, country, device_hash, km_from_sale, result)
    values ('LD-0X4K8L', v_now - interval '6 days' + make_interval(hours => 3 + v_i * 2), v_city,
            case v_city when 'Halifax' then 'NS' when 'Toronto' then 'ON' when 'Montréal' then 'QC' else 'NB' end, 'CA',
            md5('sample-device-copied-' || v_i), v_km, 'active');
  end loop;

  insert into public.flags (kind, label_code, batch_id, seller_id, details, created_at) values
    ('too_many_scans', 'LD-0X4K8L', b_copied, s_marc, '{"devices": 47, "limit": 30}', v_now - interval '3 days'),
    ('far_scans', 'LD-0X4K8L', b_copied, s_marc, '{"devices": 45, "cities": ["Halifax", "Toronto", "Montréal"]}', v_now - interval '4 days');

  -- ---------------------------------------------------------- 30 days of price points
  -- Weekly sales and price reports per product, matching the clickable mockup.
  for r in
    select * from (values
      ('lobster',  7.80, 9.20, 8.45,  0.30, 14, 6),
      ('oysters',  15.00, 19.00, 17.25, 0.00, 9, 3),
      ('mackerel', 2.75, 3.75, 3.20,  0.05, 4, 2),
      ('scallops', 14.00, 17.50, 15.80, -0.40, 6, 2),
      ('potatoes', 12.00, 16.00, 13.90, 0.25, 22, 5),
      ('carrots',  5.00, 7.00, 6.10,  0.00, 11, 2),
      ('squash',   2.50, 4.00, 3.10,  -0.20, 8, 1),
      ('apples',   5.50, 7.50, 6.40,  0.10, 17, 4),
      ('maple',    13.00, 17.00, 15.20, 0.00, 3, 1),
      ('honey',    9.00, 13.00, 11.00, 0.50, 5, 1)
    ) as t(slug, low, high, avg, chg, sales, reports)
  loop
    -- Prices drift by `chg` per week and are spread evenly across the range
    -- (golden-ratio steps), so the 10th–90th percentile of the last 14 days
    -- lands close to the mockup's low–high and the 14-day average on `avg`.
    v_span := r.high - r.low;
    v_i := 0;
    for v_d in 0..29 loop
      v_center := r.avg + r.chg * (6.5 - v_d) / 7;
      -- sales
      v_n := floor((v_d + 1) * r.sales / 7.0) - floor(v_d * r.sales / 7.0);
      for v_k in 1..v_n loop
        v_i := v_i + 1;
        insert into public.price_points (product_id, price, source, recorded_at)
        values (r.slug,
                greatest(0.5, round(v_center + (mod(v_i * 0.6180339887 + private.sample_rand(r.slug)::numeric, 1) - 0.5) * v_span * 1.25, 2)),
                'sale', least(v_noon - make_interval(days => v_d) + make_interval(mins => v_k * 23), v_now - make_interval(mins => 5 + v_k)));
      end loop;
      -- price reports
      v_n := floor((v_d + 1) * r.reports / 7.0) - floor(v_d * r.reports / 7.0);
      for v_k in 1..v_n loop
        v_i := v_i + 1;
        insert into public.price_points (product_id, price, source, recorded_at)
        values (r.slug,
                greatest(0.5, round(v_center + (mod(v_i * 0.6180339887 + private.sample_rand(r.slug)::numeric, 1) - 0.5) * v_span * 1.25, 2)),
                'report', least(v_noon - make_interval(days => v_d) - make_interval(mins => 30 + v_k * 17), v_now - make_interval(mins => 8 + v_k)));
      end loop;
    end loop;
  end loop;

  -- Build the index for each of the last 30 days, so charts have history.
  for v_d in reverse 29..0 loop
    perform private.compute_price_index(v_today - v_d);
  end loop;
end $$;

revoke all on function private.sample_user(uuid, text, text, text, text), private.sample_code(text),
  private.sample_rand(text), private.load_sample_world() from public;

-- Admin-only "Reset demo" button.
create function public.reset_demo() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  perform private.load_sample_world();
  perform private.log_admin('reset_demo', null);
end $$;
revoke all on function public.reset_demo() from public, anon, authenticated;
grant execute on function public.reset_demo() to authenticated;
