-- A live striped bass listing, so bass shows on Fresh and on the map and not
-- only on the price pages.
--
-- Marc lands the bass on his boat and sells it at the Pointe-du-Chêne wharf.
-- Striped bass are in New Brunswick coastal waters from May to November, so
-- the sample season now runs through November. All of this is SAMPLE DATA.

-- ---------------------------------------------------------------- catalogue (bass season May to November)
create or replace function private.sample_catalogue() returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.products (slug, name, short_name, unit, category, food_group, icon, harvest_verb, season_months, shelf_days, boat_limit, sort) values
    ('mackerel', 'Atlantic mackerel', 'Mackerel', 'lb', 'sea', 'fish', 'fish', 'Landed', '{5,6,7,8,9,10,11}', 4, 3000, 10),
    ('salmon', 'Atlantic salmon, farmed', 'Salmon', 'lb', 'sea', 'fish', 'fish', 'Harvested', '{1,2,3,4,5,6,7,8,9,10,11,12}', 4, 1500, 11),
    ('bass', 'Striped bass', 'Striped bass', 'lb', 'sea', 'fish', 'fish', 'Landed', '{5,6,7,8,9,10,11}', 3, 300, 12),
    ('halibut', 'Atlantic halibut', 'Halibut', 'lb', 'sea', 'fish', 'fish', 'Landed', '{5,6,7,8,9,10}', 4, 1500, 13),
    ('haddock', 'Haddock fillets', 'Haddock', 'lb', 'sea', 'fish', 'fish', 'Landed', '{1,2,3,4,5,6,7,8,9,10,11,12}', 3, 2000, 14),
    ('herring', 'Atlantic herring', 'Herring', 'lb', 'sea', 'fish', 'fish', 'Landed', '{6,7,8,9,10}', 3, 5000, 15),
    ('smelt', 'Rainbow smelt', 'Smelt', 'lb', 'sea', 'fish', 'fish', 'Landed', '{1,2,10,11,12}', 3, 800, 16),
    ('lobster', 'Live lobster', 'Lobster', 'lb', 'sea', 'seafood', 'lobster', 'Landed', '{1,2,3,4,5,6,8,9,10,11,12}', 7, 2000, 20),
    ('oysters', 'Oysters', 'Oysters', 'dozen', 'sea', 'seafood', 'shell', 'Harvested', '{1,2,3,4,5,6,7,8,9,10,11,12}', 10, 600, 21),
    ('scallops', 'Sea scallops', 'Scallops', 'lb', 'sea', 'seafood', 'shell', 'Landed', '{1,2,3,4,5,6,7,8,9,10,11,12}', 7, 1500, 22),
    ('snowcrab', 'Snow crab', 'Snow crab', 'lb', 'sea', 'seafood', 'crab', 'Landed', '{4,5,6,7}', 5, 4000, 23),
    ('mussels', 'Blue mussels, 2 lb bag', 'Mussels', 'bag', 'sea', 'seafood', 'mussel', 'Harvested', '{1,2,3,4,5,6,7,8,9,10,11,12}', 7, 1000, 24),
    ('clams', 'Soft-shell clams', 'Clams', 'lb', 'sea', 'seafood', 'shell', 'Dug', '{4,5,6,7,8,9,10,11}', 7, 600, 25),
    ('dulse', 'Dulse, 100 g bag', 'Dulse', 'bag', 'sea', 'seafood', 'seaweed', 'Harvested', '{1,2,3,4,5,6,7,8,9,10,11,12}', 365, 300, 26),
    ('potatoes', 'Potatoes, 20 lb bag', 'Potatoes', 'bag', 'land', 'vegetables', 'tuber', 'Dug', '{1,2,3,4,5,6,7,8,9,10,11,12}', 150, null, 30),
    ('carrots', 'Carrots, 5 lb bag', 'Carrots', 'bag', 'land', 'vegetables', 'carrot', 'Pulled', '{1,2,3,7,8,9,10,11,12}', 90, null, 31),
    ('squash', 'Butternut squash', 'Squash', 'each', 'land', 'vegetables', 'squash', 'Harvested', '{1,2,8,9,10,11,12}', 120, null, 32),
    ('fiddleheads', 'Fiddleheads', 'Fiddleheads', 'lb', 'land', 'vegetables', 'sprout', 'Picked', '{5,6}', 10, null, 33),
    ('corn', 'Sweet corn, dozen', 'Corn', 'dozen', 'land', 'vegetables', 'corn', 'Picked', '{8,9}', 5, null, 34),
    ('broccoli', 'Broccoli', 'Broccoli', 'head', 'land', 'vegetables', 'broccoli', 'Harvested', '{7,8,9,10}', 10, null, 35),
    ('cabbage', 'Green cabbage', 'Cabbage', 'head', 'land', 'vegetables', 'cabbage', 'Harvested', '{1,2,3,7,8,9,10,11,12}', 60, null, 36),
    ('beets', 'Beets', 'Beets', 'lb', 'land', 'vegetables', 'beet', 'Pulled', '{1,2,3,7,8,9,10,11,12}', 90, null, 37),
    ('onions', 'Yellow onions, 3 lb bag', 'Onions', 'bag', 'land', 'vegetables', 'onion', 'Pulled', '{1,2,3,4,8,9,10,11,12}', 120, null, 38),
    ('garlic', 'Garlic', 'Garlic', 'bulb', 'land', 'vegetables', 'garlic', 'Pulled', '{1,2,3,8,9,10,11,12}', 150, null, 39),
    ('apples', 'Honeycrisp apples, 3 lb bag', 'Apples', 'bag', 'land', 'fruit', 'apple', 'Picked', '{1,2,3,8,9,10,11,12}', 90, null, 50),
    ('blueberries', 'Wild blueberries, quart', 'Blueberries', 'quart', 'land', 'fruit', 'berries', 'Picked', '{8,9}', 7, null, 51),
    ('strawberries', 'Strawberries, quart', 'Strawberries', 'quart', 'land', 'fruit', 'strawberry', 'Picked', '{6,7}', 4, null, 52),
    ('raspberries', 'Raspberries, pint', 'Raspberries', 'pint', 'land', 'fruit', 'berries', 'Picked', '{7,8,9}', 3, null, 53),
    ('cranberries', 'Cranberries', 'Cranberries', 'lb', 'land', 'fruit', 'berries', 'Harvested', '{10,11,12}', 45, null, 54),
    ('haskap', 'Haskap berries, pint', 'Haskap', 'pint', 'land', 'fruit', 'berries', 'Picked', '{6,7}', 5, null, 55),
    ('maple', 'Maple syrup, 500 ml', 'Maple syrup', 'bottle', 'land', 'pantry', 'drop', 'Made', '{1,2,3,4,5,6,7,8,9,10,11,12}', 730, null, 60),
    ('honey', 'Local honey, 500 g', 'Honey', 'jar', 'land', 'pantry', 'honey', 'Harvested', '{1,2,3,4,5,6,7,8,9,10,11,12}', 730, null, 61),
    ('eggs', 'Farm eggs, dozen', 'Eggs', 'dozen', 'land', 'pantry', 'egg', 'Collected', '{1,2,3,4,5,6,7,8,9,10,11,12}', 28, null, 62)
  on conflict (slug) do update set
    name = excluded.name, short_name = excluded.short_name, unit = excluded.unit, category = excluded.category,
    food_group = excluded.food_group, icon = excluded.icon, harvest_verb = excluded.harvest_verb,
    season_months = excluded.season_months, shelf_days = excluded.shelf_days, boat_limit = excluded.boat_limit, sort = excluded.sort;
end $$;

-- ---------------------------------------------------------------- listings for the newer foods
create function private.sample_new_listings() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := now();
  s_marc constant uuid := '20000000-0000-4000-8000-000000000001';
  b_bass constant uuid := '30000000-0000-4000-8000-00000000000c';
  v_roll uuid;
begin
  -- Only once the sample sellers exist, and only once.
  if not exists (select 1 from public.sellers where id = s_marc and is_sample)
     or exists (select 1 from public.batches where id = b_bass) then
    return;
  end if;

  insert into public.batches (id, seller_id, product_id, qty_total, qty_left, price, caught_or_harvested_at, when_text,
                              origin_text, source_text, pickup_option, pickup_place, check_results, status, is_sample, created_at) values
    (b_bass, s_marc, 'bass', 18, 18, 10.50, v_now - interval '4 hours', null,
     'Shediac Bay', 'Marie-Claire II', 'pin', 'Pointe-du-Chêne wharf', '[
       {"key":"seller","label":"Seller verified","ok":true,"detail":"Licence and boat checked"},
       {"key":"product","label":"Right product","ok":true,"detail":"On the approved list"},
       {"key":"season","label":"In season","ok":true,"detail":"In season this month"},
       {"key":"amount","label":"Realistic amount","ok":true,"detail":"Realistic for one boat"},
       {"key":"photo_time","label":"Photo is fresh","ok":true,"detail":"Photo taken in Landed"},
       {"key":"photo_place","label":"Photo place","ok":true,"detail":"Taken at the wharf"},
       {"key":"label","label":"Label belongs to you","ok":true,"detail":"On the seller''s roll"}]'::jsonb,
     'live', true, v_now - interval '3 hours');

  insert into public.label_rolls (seller_id, size, issued_at, issued_by, note)
  values (s_marc, 1, v_now - interval '30 days', '10000000-0000-4000-8000-000000000004', 'Sample roll')
  returning id into v_roll;
  insert into public.labels (code, roll_id, seller_id, status, batch_id, activated_at)
  values ('LD-3S7B5K', v_roll, s_marc, 'active', b_bass, v_now - interval '3 hours')
  on conflict (code) do nothing;
  insert into public.scans (label_code, scanned_at, city, region, country, device_hash, km_from_sale, result)
  select 'LD-3S7B5K', v_now - interval '40 min', 'Shediac', 'NB', 'CA', md5('sample-device-LD-3S7B5K-1'), 4, 'active'
   where exists (select 1 from public.labels where code = 'LD-3S7B5K' and batch_id = b_bass);
end $$;

revoke all on function private.sample_new_listings() from public;

-- ---------------------------------------------------------------- the sample sellers' extras now include those listings
create or replace function private.sample_seller_extras() returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- The newer foods, spread across the sample sellers that would sell them.
  insert into public.seller_products (seller_id, product_id, approved)
  select s.id, x.product_id, true
    from (values
      ('20000000-0000-4000-8000-000000000001'::uuid, 'snowcrab'), ('20000000-0000-4000-8000-000000000001'::uuid, 'herring'),
      ('20000000-0000-4000-8000-000000000001'::uuid, 'bass'),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'corn'), ('20000000-0000-4000-8000-000000000002'::uuid, 'broccoli'),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'cabbage'), ('20000000-0000-4000-8000-000000000002'::uuid, 'beets'),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'onions'), ('20000000-0000-4000-8000-000000000002'::uuid, 'garlic'),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'eggs'),
      ('20000000-0000-4000-8000-000000000003'::uuid, 'mussels'), ('20000000-0000-4000-8000-000000000003'::uuid, 'clams'),
      ('20000000-0000-4000-8000-000000000004'::uuid, 'halibut'), ('20000000-0000-4000-8000-000000000004'::uuid, 'haddock'),
      ('20000000-0000-4000-8000-000000000004'::uuid, 'salmon'), ('20000000-0000-4000-8000-000000000004'::uuid, 'smelt'),
      ('20000000-0000-4000-8000-000000000004'::uuid, 'dulse'),
      ('20000000-0000-4000-8000-000000000005'::uuid, 'strawberries'), ('20000000-0000-4000-8000-000000000005'::uuid, 'raspberries'),
      ('20000000-0000-4000-8000-000000000005'::uuid, 'blueberries'), ('20000000-0000-4000-8000-000000000005'::uuid, 'cranberries'),
      ('20000000-0000-4000-8000-000000000006'::uuid, 'haskap'), ('20000000-0000-4000-8000-000000000006'::uuid, 'fiddleheads')
    ) as x(seller_id, product_id)
    join public.sellers s on s.id = x.seller_id
  on conflict do nothing;

  -- Farm foods are checked against a season plan, so the sample farms get one.
  insert into public.season_plans (seller_id, product_id, size_text, expected_qty, year)
  select s.id, x.product_id, x.size_text, x.qty, extract(year from now() at time zone 'America/Moncton')::smallint
    from (values
      ('20000000-0000-4000-8000-000000000002'::uuid, 'corn', '2 acres', 900),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'broccoli', '1 acre', 1500),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'cabbage', '1 acre', 1200),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'beets', 'Half an acre', 2000),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'onions', '1 acre', 800),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'garlic', 'Quarter acre', 3000),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'eggs', '150 hens', 2500),
      ('20000000-0000-4000-8000-000000000005'::uuid, 'strawberries', '2 acres', 3000),
      ('20000000-0000-4000-8000-000000000005'::uuid, 'raspberries', '1 acre', 1500),
      ('20000000-0000-4000-8000-000000000005'::uuid, 'blueberries', '5 acres of wild field', 4000),
      ('20000000-0000-4000-8000-000000000005'::uuid, 'cranberries', '1 acre bog', 2000),
      ('20000000-0000-4000-8000-000000000006'::uuid, 'haskap', 'Half an acre', 800),
      ('20000000-0000-4000-8000-000000000006'::uuid, 'fiddleheads', 'River flats', 400)
    ) as x(seller_id, product_id, size_text, qty)
    join public.sellers s on s.id = x.seller_id
  on conflict do nothing;
  perform private.sample_new_listings();
end $$;

-- ---------------------------------------------------------------- bring a running demo up to date
select private.sample_catalogue();
select private.sample_new_listings();
