-- Landed server functions.
--
-- These run inside the database with the owner's rights ("security definer"),
-- so the browser can ask for an action but can never fake one: each function
-- checks who is calling (auth.uid()), validates the input and writes the rows
-- itself. Tunable numbers come from private.settings (see supabase/thresholds.sql).

-- ---------------------------------------------------------------- small helpers

create function private.cfg_num(k text, fallback numeric) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select (s.value #>> '{}')::numeric from private.settings s where s.key = k), fallback)
$$;

create function private.cfg_bool(k text, fallback boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (s.value #>> '{}')::boolean from private.settings s where s.key = k), fallback)
$$;

-- Great-circle distance in km.
create function private.km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- Fixed-window rate limit. Returns false once `max_hits` is passed in the window.
create function private.hit_rate(k text, max_hits integer, win interval) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  secs double precision := extract(epoch from win);
  ws timestamptz := to_timestamp(floor(extract(epoch from now()) / secs) * secs);
  n integer;
begin
  insert into private.rate_limits as r (key, window_start, hits) values (k, ws, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into n;
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;
  return n <= max_hits;
end $$;

-- LD- plus 6 random characters, no look-alikes (no 0/O, 1/I/L, U/V).
create function private.new_label_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTWXYZ23456789';
  b bytea := extensions.gen_random_bytes(6);
  s text := 'LD-';
begin
  for i in 0..5 loop
    s := s || substr(alphabet, (get_byte(b, i) % length(alphabet)) + 1, 1);
  end loop;
  return s;
end $$;

create function private.normalize_code(p text) returns text
language sql immutable set search_path = '' as $$
  select left(upper(regexp_replace(coalesce(p, ''), '\s+', '', 'g')), 20)
$$;

create function private.log_admin(p_action text, p_target text, p_details jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into private.admin_log (admin_id, action, target, details) values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;

create function private.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Only the Landed team can do this' using errcode = '42501';
  end if;
end $$;

-- "Fishing licence and registered boat checked", "Farm registration checked", …
create function private.verified_note_for(p_seller uuid) returns text
language sql stable security definer set search_path = '' as $$
  select nullif(concat_ws(' · ',
    case when exists (select 1 from public.seller_credentials c where c.seller_id = p_seller and c.type = 'fishing_licence')
          and exists (select 1 from public.seller_credentials c where c.seller_id = p_seller and c.type = 'vessel')
         then 'Fishing licence and registered boat checked'
         when exists (select 1 from public.seller_credentials c where c.seller_id = p_seller and c.type = 'fishing_licence')
         then 'Fishing licence checked' end,
    case when exists (select 1 from public.seller_credentials c where c.seller_id = p_seller and c.type = 'aquaculture_lease')
         then 'Aquaculture lease checked' end,
    case when exists (select 1 from public.seller_credentials c where c.seller_id = p_seller and c.type = 'farm_registration')
         then 'Farm registration checked' end
  ), '')
$$;

-- ---------------------------------------------------------------- label page (scan lookup)

-- Called only by the label API (server side, service-role key), which passes the
-- approximate city from the request and a hashed device id. Records the scan,
-- runs the copy-detection rules and returns what the public label page shows.
create function public.lookup_label(
  p_code text,
  p_device_hash text default null,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_client_hash text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := private.normalize_code(p_code);
  v_city text := nullif(left(trim(coalesce(p_city, '')), 80), '');
  v_region text := nullif(left(trim(coalesce(p_region, '')), 80), '');
  v_country text := nullif(left(trim(coalesce(p_country, '')), 8), '');
  v_device text := nullif(left(coalesce(p_device_hash, ''), 128), '');
  l public.labels%rowtype;
  b public.batches%rowtype;
  pr public.products%rowtype;
  s public.sellers%rowtype;
  loc public.seller_locations%rowtype;
  v_phone text;
  sale_lat double precision;
  sale_lng double precision;
  v_km integer;
  v_scans integer;
  v_devices integer;
  v_far integer;
  v_cities text[];
  v_far_cities text[];
  v_far_km numeric := private.cfg_num('copy.far_km', 150);
  v_limit numeric;
  v_too_many boolean;
  v_far_hit boolean;
  v_late boolean;
  v_shelf numeric;
  v_sold_to text;
  v_sold_at timestamptz;
  v_checks_ok boolean;
begin
  if not private.hit_rate('scan:' || coalesce(p_client_hash, v_device, 'anon'),
                          private.cfg_num('rate.scans_per_10min', 60)::integer, interval '10 minutes') then
    return jsonb_build_object('status', 'rate_limited', 'code', v_code);
  end if;

  select * into l from public.labels where code = v_code;

  if not found then
    insert into public.scans (label_code, city, region, country, device_hash, result)
    values (v_code, v_city, v_region, v_country, v_device, 'unknown');
    return jsonb_build_object('status', 'not_found', 'code', v_code);
  end if;

  if l.status = 'blank' then
    insert into public.scans (label_code, city, region, country, device_hash, result)
    values (v_code, v_city, v_region, v_country, v_device, 'blank');
    if not exists (select 1 from public.flags f where f.label_code = v_code and f.kind = 'blank_scanned' and f.status = 'open') then
      insert into public.flags (kind, label_code, seller_id, roll_id, details)
      values ('blank_scanned', v_code, l.seller_id, l.roll_id, jsonb_build_object('city', v_city));
    end if;
    return jsonb_build_object('status', 'blank', 'code', v_code);
  end if;

  if l.status = 'void' or l.batch_id is null then
    insert into public.scans (label_code, city, region, country, device_hash, result)
    values (v_code, v_city, v_region, v_country, v_device, 'void');
    return jsonb_build_object('status', 'void', 'code', v_code);
  end if;

  select * into b from public.batches where id = l.batch_id;
  select * into pr from public.products where slug = b.product_id;
  select * into s from public.sellers where id = b.seller_id;
  select * into loc from public.seller_locations where seller_id = s.id;
  select p.phone into v_phone from public.profiles p where p.id = s.profile_id;

  -- Where the food was handed over: the market, or the seller's pin.
  if b.pickup_option like 'market:%' then
    select m.lat, m.lng into sale_lat, sale_lng from public.markets m where m.id = substr(b.pickup_option, 8);
  end if;
  if sale_lat is null and loc.seller_id is not null then
    sale_lat := loc.lat;
    sale_lng := loc.lng;
  end if;
  if p_lat is not null and p_lng is not null and sale_lat is not null then
    v_km := round(private.km(p_lat, p_lng, sale_lat, sale_lng));
  end if;

  insert into public.scans (label_code, city, region, country, device_hash, km_from_sale, result)
  values (v_code, v_city, v_region, v_country, v_device, v_km, 'active');

  select count(*),
         count(distinct device_hash),
         count(distinct device_hash) filter (where km_from_sale > v_far_km)
    into v_scans, v_devices, v_far
    from public.scans
   where label_code = v_code and result = 'active';

  select coalesce(array_agg(c.city order by c.n desc, c.city), '{}') into v_cities
    from (select sc.city, count(*) n from public.scans sc
           where sc.label_code = v_code and sc.result = 'active' and sc.city is not null
           group by sc.city order by n desc limit 6) c;

  select coalesce(array_agg(c.city order by c.n desc, c.city), '{}') into v_far_cities
    from (select sc.city, count(*) n from public.scans sc
           where sc.label_code = v_code and sc.result = 'active' and sc.city is not null and sc.km_from_sale > v_far_km
           group by sc.city order by n desc limit 6) c;

  -- Rule: too many phones for the size of the batch.
  v_limit := greatest(private.cfg_num('copy.min_devices', 25), b.qty_total * private.cfg_num('copy.devices_per_unit', 1));
  v_too_many := v_devices > v_limit;
  -- Rule: several phones scanning far from where it was sold.
  v_far_hit := v_far >= private.cfg_num('copy.far_min_devices', 3);
  -- Rule: scanned long after the food should be gone.
  v_shelf := pr.shelf_days;
  v_late := now() - b.caught_or_harvested_at > make_interval(days => v_shelf::integer);

  if v_too_many and not exists (select 1 from public.flags f where f.label_code = v_code and f.kind = 'too_many_scans' and f.status = 'open') then
    insert into public.flags (kind, label_code, batch_id, seller_id, details)
    values ('too_many_scans', v_code, b.id, s.id, jsonb_build_object('devices', v_devices, 'limit', v_limit));
  end if;
  if v_far_hit and not exists (select 1 from public.flags f where f.label_code = v_code and f.kind = 'far_scans' and f.status = 'open') then
    insert into public.flags (kind, label_code, batch_id, seller_id, details)
    values ('far_scans', v_code, b.id, s.id, jsonb_build_object('devices', v_far, 'cities', to_jsonb(v_far_cities)));
  end if;
  if v_late and not exists (select 1 from public.flags f where f.label_code = v_code and f.kind = 'late_scan' and f.status = 'open') then
    insert into public.flags (kind, label_code, batch_id, seller_id, details)
    values ('late_scan', v_code, b.id, s.id, jsonb_build_object('days', extract(day from now() - b.caught_or_harvested_at)));
  end if;

  if b.status = 'sold_out' then
    select o.buyer_name, o.picked_up_at into v_sold_to, v_sold_at
      from public.orders o where o.batch_id = b.id and o.status = 'picked_up'
     order by o.picked_up_at desc nulls last limit 1;
  end if;

  v_checks_ok := jsonb_array_length(b.check_results) > 0
    and not exists (select 1 from jsonb_array_elements(b.check_results) e where coalesce((e ->> 'ok')::boolean, false) = false);

  return jsonb_build_object(
    'status', 'active',
    'code', v_code,
    'product', jsonb_build_object('slug', pr.slug, 'name', pr.name, 'short_name', pr.short_name, 'unit', pr.unit,
                                  'category', pr.category, 'icon', pr.icon, 'harvest_verb', pr.harvest_verb),
    'batch', jsonb_build_object('id', b.id, 'qty_total', b.qty_total, 'status', b.status,
                                'caught_at', b.caught_or_harvested_at, 'when_text', b.when_text,
                                'listed_at', coalesce(l.activated_at, b.created_at),
                                'origin', b.origin_text, 'source', b.source_text, 'pickup_place', b.pickup_place,
                                'checks_passed', v_checks_ok),
    'seller', jsonb_build_object('display_name', s.display_name, 'business_name', s.business_name, 'kind', s.kind,
                                 'verified_note', s.verified_note,
                                 'phone', case when loc.show_phone then v_phone end,
                                 'place_name', loc.place_name, 'area_label', loc.area_label,
                                 'pin_type', loc.pin_type, 'site_kind', loc.site_kind),
    'scans', jsonb_build_object('count', v_scans, 'devices', v_devices, 'cities', to_jsonb(v_cities)),
    'warnings', jsonb_build_object('copied', v_too_many or v_far_hit, 'too_many', v_too_many, 'far', v_far_hit,
                                   'far_cities', to_jsonb(v_far_cities), 'late', v_late),
    'sold', case when v_sold_to is not null then jsonb_build_object('to', v_sold_to, 'at', v_sold_at) end
  );
end $$;

-- ---------------------------------------------------------------- blank labels and batches

-- Step 2 of Add batch: is this a blank label from my own roll?
create function public.check_blank_label(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := private.normalize_code(p_code);
  v_seller uuid := private.my_seller_id();
  l public.labels%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if v_seller is null or not private.seller_is_approved(v_seller) then
    return jsonb_build_object('ok', false, 'error', 'not_approved',
      'message', 'Your seller account is waiting for approval. Only approved sellers can set up labels.');
  end if;
  if not private.hit_rate('label:' || v_seller, private.cfg_num('rate.label_checks_per_hour', 120)::integer, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited', 'message', 'Too many label checks in a short time. Try again in a few minutes.');
  end if;
  select * into l from public.labels where code = v_code;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'This label was never issued by Landed. Check the code and try again.');
  end if;
  if l.seller_id <> v_seller then
    return jsonb_build_object('ok', false, 'error', 'other_seller', 'message', 'This label belongs to another seller.');
  end if;
  if l.status <> 'blank' or l.batch_id is not null then
    return jsonb_build_object('ok', false, 'error', 'in_use', 'message', 'This label is already in use.');
  end if;
  return jsonb_build_object('ok', true, 'code', v_code);
end $$;

-- Steps 3–9 of Add batch: run the automatic checks, then either put the batch
-- live and activate the label, or hold it for admin review.
create function public.create_batch(
  p_code text,
  p_product text,
  p_qty numeric,
  p_price numeric,
  p_pickup text,
  p_photo_path text,
  p_photo_taken_at timestamptz,
  p_photo_lat double precision,
  p_photo_lng double precision,
  p_origin text default null,
  p_source text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_tz constant text := 'America/Moncton';
  v_now_local timestamp := now() at time zone 'America/Moncton';
  v_month integer := extract(month from v_now_local)::integer;
  v_year integer := extract(year from v_now_local)::integer;
  v_seller public.sellers%rowtype;
  v_code text := private.normalize_code(p_code);
  l public.labels%rowtype;
  pr public.products%rowtype;
  loc public.seller_locations%rowtype;
  v_plan public.season_plans%rowtype;
  v_has_plan boolean := false;
  v_sea boolean;
  v_checks jsonb := '[]'::jsonb;
  v_ok boolean;
  v_detail text;
  v_limit numeric;
  v_listed numeric;
  v_max_age interval;
  v_km double precision;
  v_radius numeric := private.cfg_num('checks.photo_radius_km', 5);
  v_pickup text := coalesce(nullif(trim(p_pickup), ''), 'pin');
  v_pickup_place text;
  v_all boolean;
  v_status public.batch_status;
  v_batch uuid;
  v_unit text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  select * into v_seller from public.sellers where profile_id = auth.uid();
  if not found then
    raise exception 'Only sellers can add batches' using errcode = '42501';
  end if;
  if v_seller.status <> 'approved' then
    raise exception 'Your seller account is waiting for approval' using errcode = '42501';
  end if;
  if not private.hit_rate('batch:' || v_seller.id, private.cfg_num('rate.batches_per_hour', 30)::integer, interval '1 hour') then
    raise exception 'Too many batches in a short time. Try again later.' using errcode = 'P0001';
  end if;

  -- The label: exists, mine, blank, unused. Lock it so it can't be used twice at once.
  select * into l from public.labels where code = v_code for update;
  if not found then
    raise exception 'This label was never issued by Landed' using errcode = 'P0001';
  elsif l.seller_id <> v_seller.id then
    raise exception 'This label belongs to another seller' using errcode = 'P0001';
  elsif l.status <> 'blank' or l.batch_id is not null then
    raise exception 'This label is already in use' using errcode = 'P0001';
  end if;

  select * into pr from public.products where slug = p_product;
  if not found then
    raise exception 'Pick a product' using errcode = 'P0001';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000 then
    raise exception 'Add how much you have' using errcode = 'P0001';
  end if;
  if p_price is null or p_price <= 0 or p_price > 10000 then
    raise exception 'Add your price' using errcode = 'P0001';
  end if;

  select * into loc from public.seller_locations where seller_id = v_seller.id;
  if v_pickup = 'pin' then
    if loc.seller_id is null then
      raise exception 'Set up your pin in Profile first' using errcode = 'P0001';
    end if;
    v_pickup_place := loc.place_name;
  elsif v_pickup like 'market:%' then
    select m.name into v_pickup_place
      from public.markets m
      join public.seller_markets sm on sm.market_id = m.id and sm.seller_id = v_seller.id
     where m.id = substr(v_pickup, 8);
    if v_pickup_place is null then
      raise exception 'Pick a market you attend' using errcode = 'P0001';
    end if;
  else
    raise exception 'Pick where buyers collect' using errcode = 'P0001';
  end if;

  v_sea := pr.category = 'sea';
  v_unit := case when pr.unit in ('lb', 'each', 'dozen') or p_qty = 1 then pr.unit else pr.unit || 's' end;

  -- 1. Seller approved, with the right credentials checked.
  if v_sea then
    v_ok := (exists (select 1 from public.seller_credentials c where c.seller_id = v_seller.id and c.type = 'fishing_licence' and c.checked_at is not null)
         and exists (select 1 from public.seller_credentials c where c.seller_id = v_seller.id and c.type = 'vessel' and c.checked_at is not null))
         or exists (select 1 from public.seller_credentials c where c.seller_id = v_seller.id and c.type = 'aquaculture_lease' and c.checked_at is not null);
    v_detail := case when v_ok then coalesce(v_seller.verified_note, 'Licence and boat checked') else 'Your licence and boat haven’t been checked yet' end;
  else
    v_ok := exists (select 1 from public.seller_credentials c where c.seller_id = v_seller.id and c.type = 'farm_registration' and c.checked_at is not null);
    v_detail := case when v_ok then coalesce(v_seller.verified_note, 'Farm registration checked') else 'Your farm registration hasn’t been checked yet' end;
  end if;
  v_checks := v_checks || jsonb_build_object('key', 'seller', 'label', 'Seller verified', 'ok', v_ok, 'detail', v_detail);

  -- 2. Right product.
  select * into v_plan from public.season_plans sp where sp.seller_id = v_seller.id and sp.product_id = pr.slug and sp.year = v_year;
  v_has_plan := found;
  if v_sea then
    v_ok := exists (select 1 from public.seller_products sp where sp.seller_id = v_seller.id and sp.product_id = pr.slug and sp.approved);
    v_detail := case when v_ok then pr.short_name || ' is on your approved list' else pr.short_name || ' isn’t on your approved list yet' end;
  else
    v_ok := v_has_plan;
    v_detail := case when v_ok then 'Matches your season plan (' || pr.short_name || coalesce(', ' || nullif(v_plan.size_text, ''), '') || ')'
                     else pr.short_name || ' isn’t in your ' || v_year || ' season plan' end;
  end if;
  v_checks := v_checks || jsonb_build_object('key', 'product', 'label', 'Right product', 'ok', v_ok, 'detail', v_detail);

  -- 3. In season this month.
  v_ok := v_month = any (pr.season_months);
  v_detail := case when v_ok then pr.short_name || ' is in season this month'
                   else pr.short_name || ' isn’t in season in ' || trim(to_char(v_now_local, 'Month')) end;
  v_checks := v_checks || jsonb_build_object('key', 'season', 'label', 'In season', 'ok', v_ok, 'detail', v_detail);

  -- 4. Realistic amount.
  if v_sea then
    v_limit := coalesce(pr.boat_limit, private.cfg_num('limits.boat_qty_default', 2000));
    v_ok := p_qty <= v_limit;
    v_detail := case when v_ok then trim_scale(p_qty)::text || ' ' || v_unit || ' is realistic for one boat'
                     else trim_scale(p_qty)::text || ' ' || v_unit || ' is more than one boat usually lands (limit ' || trim_scale(v_limit)::text || ')' end;
  elsif v_has_plan then
    select coalesce(sum(b.qty_total), 0) into v_listed
      from public.batches b
     where b.seller_id = v_seller.id and b.product_id = pr.slug and b.status <> 'removed'
       and extract(year from b.created_at at time zone v_tz) = v_year;
    v_ok := v_listed + p_qty <= v_plan.expected_qty;
    v_detail := case when v_ok then trim_scale(p_qty)::text || ' ' || v_unit || ' fits your expected harvest (' || trim_scale(v_listed + p_qty)::text || ' of ' || trim_scale(v_plan.expected_qty)::text || ' this year)'
                     else 'More than your expected harvest (' || trim_scale(v_listed + p_qty)::text || ' of ' || trim_scale(v_plan.expected_qty)::text || ' this year)' end;
  else
    v_ok := false;
    v_detail := 'No season plan to compare the amount with';
  end if;
  v_checks := v_checks || jsonb_build_object('key', 'amount', 'label', 'Realistic amount', 'ok', v_ok, 'detail', v_detail);

  -- 5. Photo is fresh and was taken in the app (uploaded to this seller's folder).
  v_max_age := case when v_sea then make_interval(hours => private.cfg_num('checks.photo_max_hours_sea', 12)::integer)
                    else make_interval(days => private.cfg_num('checks.photo_max_days_land', 7)::integer) end;
  v_ok := p_photo_path is not null
      and p_photo_taken_at is not null
      and p_photo_path like v_seller.id::text || '/%'
      and p_photo_taken_at <= now() + interval '5 minutes'
      and now() - p_photo_taken_at <= v_max_age
      and exists (select 1 from storage.objects o where o.bucket_id = 'batch-photos' and o.name = p_photo_path);
  v_detail := case when v_ok then 'Photo taken in Landed ' || greatest(0, round(extract(epoch from now() - p_photo_taken_at) / 60))::text || ' min ago'
                   when p_photo_path is null then 'No photo yet. Take one in Landed.'
                   else 'Take the photo in Landed within ' || case when v_sea then private.cfg_num('checks.photo_max_hours_sea', 12)::text || ' hours' else private.cfg_num('checks.photo_max_days_land', 7)::text || ' days' end || ' of listing' end;
  v_checks := v_checks || jsonb_build_object('key', 'photo_time', 'label', 'Photo is fresh', 'ok', v_ok, 'detail', v_detail);

  -- 6. Photo place: within about 5 km of the seller's farm, wharf or pickup spot.
  if p_photo_lat is not null and p_photo_lng is not null then
    select min(private.km(p_photo_lat, p_photo_lng, x.lat, x.lng)) into v_km
      from (select sl.lat, sl.lng from public.seller_locations sl where sl.seller_id = v_seller.id
            union all
            select sp.lat, sp.lng from private.saved_pins sp where sp.seller_id = v_seller.id) x;
  end if;
  if v_seller.is_sample and private.cfg_bool('checks.demo_skip_photo_place', true) then
    v_ok := true;
    v_detail := 'Skipped for the demo account' || coalesce(' (' || round(v_km::numeric, 1)::text || ' km away)', '');
  else
    v_ok := v_km is not null and v_km <= v_radius;
    v_detail := case when v_km is null then 'No location on the photo. Allow location for Landed and retake it.'
                     when v_ok then 'Taken ' || round(v_km::numeric, 1)::text || ' km from your ' || case when v_sea then 'wharf or pickup spot' else 'farm or pickup spot' end
                     else 'Taken ' || round(v_km::numeric)::text || ' km from your ' || case when v_sea then 'wharf or pickup spot' else 'farm or pickup spot' end end;
  end if;
  v_checks := v_checks || jsonb_build_object('key', 'photo_place', 'label', 'Photo place', 'ok', v_ok, 'detail', v_detail,
                                             'km', case when v_km is null then null else round(v_km::numeric, 1) end);

  -- 7. Label belongs to the seller (checked above, or we wouldn't be here).
  v_checks := v_checks || jsonb_build_object('key', 'label', 'label', 'Label belongs to you', 'ok', true,
                                             'detail', 'Label ' || v_code || ' is on your roll and still blank');

  v_all := not exists (select 1 from jsonb_array_elements(v_checks) e where (e ->> 'ok')::boolean is not true);
  v_status := case when v_all then 'live' else 'held' end;

  insert into public.batches (seller_id, product_id, qty_total, qty_left, price, caught_or_harvested_at,
                              origin_text, source_text, pickup_option, pickup_place, photo_path, photo_taken_at,
                              check_results, status)
  values (v_seller.id, pr.slug, p_qty, p_qty, round(p_price, 2), coalesce(least(p_photo_taken_at, now()), now()),
          left(coalesce(nullif(trim(p_origin), ''), v_seller.default_origin, ''), 200),
          left(coalesce(nullif(trim(p_source), ''), v_seller.default_source, v_seller.business_name), 200),
          v_pickup, v_pickup_place, p_photo_path, p_photo_taken_at, v_checks, v_status)
  returning id into v_batch;

  update public.labels
     set batch_id = v_batch,
         status = case when v_all then 'active'::public.label_status else status end,
         activated_at = case when v_all then now() end
   where code = v_code;

  if not v_all then
    insert into public.flags (kind, label_code, batch_id, seller_id, details)
    values ('failed_check', v_code, v_batch, v_seller.id,
            jsonb_build_object('failed', (select jsonb_agg(e ->> 'key') from jsonb_array_elements(v_checks) e where (e ->> 'ok')::boolean is not true)));
  end if;

  return jsonb_build_object('batch_id', v_batch, 'status', v_status, 'code', v_code, 'checks', v_checks);
end $$;

-- "Add another label to this batch": scan the next blank label; it joins the same batch.
create function public.add_label_to_batch(p_code text, p_batch uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid := private.my_seller_id();
  v_code text := private.normalize_code(p_code);
  l public.labels%rowtype;
  b public.batches%rowtype;
  n integer;
begin
  if v_seller is null or not private.seller_is_approved(v_seller) then
    raise exception 'Only approved sellers can set up labels' using errcode = '42501';
  end if;
  if not private.hit_rate('label:' || v_seller, private.cfg_num('rate.label_checks_per_hour', 120)::integer, interval '1 hour') then
    raise exception 'Too many label checks in a short time. Try again in a few minutes.' using errcode = 'P0001';
  end if;
  select * into b from public.batches where id = p_batch and seller_id = v_seller;
  if not found or b.status <> 'live' then
    raise exception 'Labels can only be added to your live batches' using errcode = 'P0001';
  end if;
  select * into l from public.labels where code = v_code for update;
  if not found then
    raise exception 'This label was never issued by Landed' using errcode = 'P0001';
  elsif l.seller_id <> v_seller then
    raise exception 'This label belongs to another seller' using errcode = 'P0001';
  elsif l.status <> 'blank' or l.batch_id is not null then
    raise exception 'This label is already in use' using errcode = 'P0001';
  end if;
  update public.labels set batch_id = b.id, status = 'active', activated_at = now() where code = v_code;
  select count(*) into n from public.labels where batch_id = b.id;
  return jsonb_build_object('ok', true, 'code', v_code, 'labels_on_batch', n);
end $$;

-- ---------------------------------------------------------------- pins

-- Both of the seller's places (the one on the map and any saved alternative).
create function public.my_pins() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'active', (select to_jsonb(sl) - 'id' from public.seller_locations sl where sl.seller_id = private.my_seller_id()),
    'saved', coalesce((select jsonb_agg(to_jsonb(sp) - 'seller_id' order by sp.pin_type) from private.saved_pins sp where sp.seller_id = private.my_seller_id()), '[]'::jsonb)
  )
$$;

-- Save the farm/wharf or the pickup spot. If it's the kind currently on the map, the map updates too.
create function public.save_pin(
  p_pin_type public.pin_type,
  p_place text,
  p_area text,
  p_hours text,
  p_lat double precision,
  p_lng double precision,
  p_site_kind public.site_kind default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_seller public.sellers%rowtype;
  v_site public.site_kind;
begin
  select * into v_seller from public.sellers where profile_id = auth.uid();
  if not found then
    raise exception 'Only sellers have a pin' using errcode = '42501';
  end if;
  if coalesce(trim(p_place), '') = '' or coalesce(trim(p_area), '') = '' then
    raise exception 'Add the place name and area' using errcode = 'P0001';
  end if;
  if p_lat is null or p_lng is null or p_lat not between 40 and 52 or p_lng not between -72 and -56 then
    raise exception 'Pick a location in the Maritimes' using errcode = 'P0001';
  end if;
  v_site := case when p_pin_type = 'exact'
                 then coalesce(p_site_kind, case when v_seller.kind = 'farmer' then 'farm'::public.site_kind else 'wharf'::public.site_kind end) end;

  insert into private.saved_pins (seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text)
  values (v_seller.id, p_pin_type, v_site, left(trim(p_place), 120), p_lat, p_lng, left(trim(p_area), 80), left(coalesce(trim(p_hours), ''), 120))
  on conflict (seller_id, pin_type) do update
    set site_kind = excluded.site_kind, place_name = excluded.place_name, lat = excluded.lat, lng = excluded.lng,
        area_label = excluded.area_label, hours_text = excluded.hours_text;

  update public.seller_locations
     set site_kind = v_site, place_name = left(trim(p_place), 120), lat = p_lat, lng = p_lng,
         area_label = left(trim(p_area), 80), hours_text = left(coalesce(trim(p_hours), ''), 120), updated_at = now()
   where seller_id = v_seller.id and pin_type = p_pin_type;

  if not found and not exists (select 1 from public.seller_locations where seller_id = v_seller.id) then
    insert into public.seller_locations (seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text)
    values (v_seller.id, p_pin_type, v_site, left(trim(p_place), 120), p_lat, p_lng, left(trim(p_area), 80), left(coalesce(trim(p_hours), ''), 120));
  end if;
  return public.my_pins();
end $$;

-- Switch the map between "Show my exact farm / wharf" and "Use a pickup spot instead".
create function public.use_pin(p_pin_type public.pin_type) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid := private.my_seller_id();
  sp private.saved_pins%rowtype;
begin
  if v_seller is null then
    raise exception 'Only sellers have a pin' using errcode = '42501';
  end if;
  select * into sp from private.saved_pins where seller_id = v_seller and pin_type = p_pin_type;
  if not found then
    raise exception 'Add that location first' using errcode = 'P0001';
  end if;
  update public.seller_locations
     set pin_type = sp.pin_type, site_kind = sp.site_kind, place_name = sp.place_name, lat = sp.lat, lng = sp.lng,
         area_label = sp.area_label, hours_text = sp.hours_text, updated_at = now()
   where seller_id = v_seller;
  return public.my_pins();
end $$;

create function public.request_label_roll() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.sellers set roll_requested_at = now() where profile_id = auth.uid() and status = 'approved';
  if not found then
    raise exception 'Only approved sellers can order label rolls' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------- orders

create function public.place_order(p_batch uuid, p_qty numeric, p_pickup text default 'pin') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  b public.batches%rowtype;
  loc public.seller_locations%rowtype;
  v_name text;
  v_place text;
  v_pickup text := coalesce(nullif(trim(p_pickup), ''), 'pin');
  o public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in to order' using errcode = '28000';
  end if;
  if not private.hit_rate('order:' || v_uid, private.cfg_num('rate.orders_per_hour', 20)::integer, interval '1 hour') then
    raise exception 'Too many orders in a short time. Try again later.' using errcode = 'P0001';
  end if;
  select * into b from public.batches where id = p_batch;
  if not found or b.status <> 'live' or not private.seller_is_approved(b.seller_id) then
    raise exception 'This batch is no longer available' using errcode = 'P0001';
  end if;
  if private.owns_seller(b.seller_id) then
    raise exception 'You can’t order from your own batch' using errcode = 'P0001';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception 'Choose how much you want' using errcode = 'P0001';
  end if;
  if p_qty > b.qty_left then
    raise exception 'Only % left in this batch', trim_scale(b.qty_left) using errcode = 'P0001';
  end if;

  select * into loc from public.seller_locations where seller_id = b.seller_id;
  if v_pickup = 'pin' then
    v_place := loc.place_name;
  elsif v_pickup like 'market:%' then
    select m.name into v_place from public.markets m
      join public.seller_markets sm on sm.market_id = m.id and sm.seller_id = b.seller_id
     where m.id = substr(v_pickup, 8);
  end if;
  if v_place is null then
    raise exception 'Pick a pickup place' using errcode = 'P0001';
  end if;

  -- "Sophie Tremblay" -> "Sophie T." so sellers see who's coming without a full name.
  select trim(coalesce(p.full_name, '')) into v_name from public.profiles p where p.id = v_uid;
  v_name := case when v_name = '' then 'Landed buyer'
                 when position(' ' in v_name) = 0 then v_name
                 else split_part(v_name, ' ', 1) || ' ' || left(split_part(v_name, ' ', array_length(string_to_array(v_name, ' '), 1)), 1) || '.' end;

  insert into public.orders (batch_id, buyer_id, seller_id, buyer_name, qty, unit_price, total, pickup_option, pickup_place, pickup_when)
  values (b.id, v_uid, b.seller_id, v_name, p_qty, b.price, round(b.price * p_qty, 2), v_pickup, v_place,
          case when loc.available_now then 'Today' else 'Time to be confirmed' end)
  returning * into o;
  return to_jsonb(o);
end $$;

-- Seller buttons: Confirm, Can't do it, Mark ready for pickup, Mark picked up.
create function public.set_order_status(p_order bigint, p_status public.order_status) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders%rowtype;
  b public.batches%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0001';
  end if;
  if not (private.owns_seller(o.seller_id) or private.is_admin()) then
    raise exception 'Only the seller can update this order' using errcode = '42501';
  end if;
  if not ((o.status = 'ordered' and p_status in ('confirmed', 'declined'))
       or (o.status = 'confirmed' and p_status = 'ready')
       or (o.status = 'ready' and p_status = 'picked_up')) then
    raise exception 'This order is already %', replace(o.status::text, '_', ' ') using errcode = 'P0001';
  end if;

  if p_status = 'confirmed' then
    select * into b from public.batches where id = o.batch_id for update;
    if b.qty_left < o.qty then
      raise exception 'Only % left in this batch', trim_scale(b.qty_left) using errcode = 'P0001';
    end if;
    update public.batches
       set qty_left = qty_left - o.qty,
           status = case when qty_left - o.qty <= 0 and status = 'live' then 'sold_out'::public.batch_status else status end
     where id = b.id;
  elsif p_status = 'picked_up' then
    insert into public.price_points (product_id, price, source, recorded_at, order_id)
    select b2.product_id, o.unit_price, 'sale', now(), o.id from public.batches b2 where b2.id = o.batch_id;
  end if;

  update public.orders
     set status = p_status,
         confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
         ready_at = case when p_status = 'ready' then now() else ready_at end,
         picked_up_at = case when p_status = 'picked_up' then now() else picked_up_at end,
         declined_at = case when p_status = 'declined' then now() else declined_at end,
         updated_at = now()
   where id = o.id
  returning * into o;
  return to_jsonb(o);
end $$;

-- ---------------------------------------------------------------- seller onboarding

create function public.submit_seller_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_seller public.sellers%rowtype;
  v_kind public.seller_kind;
  v_pin jsonb := p -> 'pin';
  v_year integer := extract(year from now() at time zone 'America/Moncton')::integer;
  v_id uuid;
  v_pin_type public.pin_type;
  v_site public.site_kind;
  v_lat double precision;
  v_lng double precision;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if not private.hit_rate('apply:' || v_uid, 20, interval '1 hour') then
    raise exception 'Too many tries. Try again later.' using errcode = 'P0001';
  end if;
  select * into v_seller from public.sellers where profile_id = v_uid;
  if found and v_seller.status <> 'pending' then
    raise exception 'Your seller account is already set up. Change details in Profile.' using errcode = 'P0001';
  end if;

  begin
    v_kind := (p ->> 'kind')::public.seller_kind;
    v_pin_type := (v_pin ->> 'pin_type')::public.pin_type;
    v_lat := (v_pin ->> 'lat')::double precision;
    v_lng := (v_pin ->> 'lng')::double precision;
  exception when others then
    raise exception 'Some details are missing' using errcode = 'P0001';
  end;
  if v_kind is null or coalesce(trim(p ->> 'display_name'), '') = '' or coalesce(trim(p ->> 'business_name'), '') = '' then
    raise exception 'Add your name and business name' using errcode = 'P0001';
  end if;
  if v_pin_type is null or coalesce(trim(v_pin ->> 'place_name'), '') = '' or coalesce(trim(v_pin ->> 'area_label'), '') = ''
     or v_lat is null or v_lng is null or v_lat not between 40 and 52 or v_lng not between -72 and -56 then
    raise exception 'Add your pin: a place name, area and location in the Maritimes' using errcode = 'P0001';
  end if;
  if jsonb_array_length(coalesce(p -> 'credentials', '[]'::jsonb)) = 0 then
    raise exception 'Add at least one licence or registration' using errcode = 'P0001';
  end if;
  if jsonb_array_length(coalesce(p -> 'products', '[]'::jsonb)) = 0 then
    raise exception 'Pick what you sell' using errcode = 'P0001';
  end if;

  if v_seller.id is null then
    insert into public.sellers (profile_id, kind, display_name, business_name, story, default_origin, default_source)
    values (v_uid, v_kind, left(trim(p ->> 'display_name'), 120), left(trim(p ->> 'business_name'), 120),
            left(coalesce(trim(p ->> 'story'), ''), 400), nullif(left(trim(coalesce(p ->> 'origin', '')), 200), ''),
            left(trim(p ->> 'business_name'), 120))
    returning id into v_id;
  else
    v_id := v_seller.id;
    update public.sellers
       set kind = v_kind, display_name = left(trim(p ->> 'display_name'), 120), business_name = left(trim(p ->> 'business_name'), 120),
           story = left(coalesce(trim(p ->> 'story'), ''), 400), default_origin = nullif(left(trim(coalesce(p ->> 'origin', '')), 200), ''),
           default_source = left(trim(p ->> 'business_name'), 120)
     where id = v_id;
  end if;

  delete from public.seller_credentials where seller_id = v_id;
  insert into public.seller_credentials (seller_id, type, number)
  select v_id, (c ->> 'type')::public.credential_type, left(trim(c ->> 'number'), 80)
    from jsonb_array_elements(p -> 'credentials') with ordinality as t(c, i)
   where i <= 6 and coalesce(trim(c ->> 'number'), '') <> '';

  delete from public.seller_products where seller_id = v_id;
  insert into public.seller_products (seller_id, product_id)
  select v_id, pr.slug from public.products pr where pr.slug in (select jsonb_array_elements_text(p -> 'products'));

  delete from public.season_plans where seller_id = v_id and year = v_year;
  insert into public.season_plans (seller_id, product_id, size_text, expected_qty, year)
  select v_id, x ->> 'product', left(coalesce(x ->> 'size_text', ''), 60), (x ->> 'expected_qty')::numeric, v_year
    from jsonb_array_elements(coalesce(p -> 'season_plan', '[]'::jsonb)) x
   where x ->> 'product' in (select slug from public.products) and coalesce((x ->> 'expected_qty')::numeric, 0) > 0;

  delete from public.seller_markets where seller_id = v_id;
  insert into public.seller_markets (seller_id, market_id)
  select v_id, m.id from public.markets m where m.id in (select jsonb_array_elements_text(coalesce(p -> 'markets', '[]'::jsonb)));

  v_site := case when v_pin_type = 'exact'
                 then coalesce((v_pin ->> 'site_kind')::public.site_kind, case when v_kind = 'farmer' then 'farm'::public.site_kind else 'wharf'::public.site_kind end) end;
  insert into public.seller_locations (seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text, show_phone)
  values (v_id, v_pin_type, v_site, left(trim(v_pin ->> 'place_name'), 120), v_lat, v_lng, left(trim(v_pin ->> 'area_label'), 80),
          left(coalesce(trim(v_pin ->> 'hours_text'), ''), 120), coalesce((p ->> 'show_phone')::boolean, true))
  on conflict (seller_id) do update
    set pin_type = excluded.pin_type, site_kind = excluded.site_kind, place_name = excluded.place_name, lat = excluded.lat,
        lng = excluded.lng, area_label = excluded.area_label, hours_text = excluded.hours_text, show_phone = excluded.show_phone, updated_at = now();
  insert into private.saved_pins (seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text)
  select seller_id, pin_type, site_kind, place_name, lat, lng, area_label, hours_text from public.seller_locations where seller_id = v_id
  on conflict (seller_id, pin_type) do update
    set site_kind = excluded.site_kind, place_name = excluded.place_name, lat = excluded.lat, lng = excluded.lng,
        area_label = excluded.area_label, hours_text = excluded.hours_text;

  update public.profiles
     set is_seller = true,
         phone = coalesce(nullif(left(trim(coalesce(p ->> 'phone', '')), 40), ''), phone),
         full_name = case when full_name = '' then left(trim(p ->> 'display_name'), 120) else full_name end
   where id = v_uid;

  return jsonb_build_object('seller_id', v_id, 'status', 'pending');
end $$;

-- ---------------------------------------------------------------- pilot sign-ups

create function public.join_pilot(p_email text, p_module text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.hit_rate('pilot:' || lower(coalesce(p_email, '')), 10, interval '1 hour') then
    raise exception 'Too many tries. Try again later.' using errcode = 'P0001';
  end if;
  insert into public.pilot_signups (email, module, profile_id)
  values (lower(trim(p_email)), left(p_module, 40), auth.uid())
  on conflict (email, module) do nothing;
exception when check_violation then
  raise exception 'Enter an email address so we can reach you' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------- price index

-- Fair range per product and region for one day: the 10th to 90th percentile
-- of the last 14 days of price points, or the last 30 days when there are
-- fewer than 6 points. Runs nightly (pg_cron) and after a demo reset.
create function private.compute_price_index(p_day date default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_tz constant text := 'America/Moncton';
  d date := coalesce(p_day, (now() at time zone 'America/Moncton')::date);
  v_short integer := private.cfg_num('index.window_days', 14)::integer;
  v_long integer := private.cfg_num('index.fallback_days', 30)::integer;
  v_min integer := private.cfg_num('index.min_points', 6)::integer;
  r record;
  v_count integer;
  v_days integer;
  n integer := 0;
begin
  for r in select distinct pp.product_id, pp.region from public.price_points pp loop
    select count(*) into v_count from public.price_points pp
     where pp.product_id = r.product_id and pp.region = r.region
       and (pp.recorded_at at time zone v_tz)::date between d - (v_short - 1) and d;
    v_days := case when v_count >= v_min then v_short else v_long end;

    insert into public.price_index_daily (product_id, region, date, low, high, avg, sales_count, report_count, window_days)
    select r.product_id, r.region, d,
           round(percentile_cont(0.1) within group (order by pp.price)::numeric, 2),
           round(percentile_cont(0.9) within group (order by pp.price)::numeric, 2),
           round(avg(pp.price), 2),
           count(*) filter (where pp.source = 'sale' and (pp.recorded_at at time zone v_tz)::date > d - 7),
           count(*) filter (where pp.source = 'report' and (pp.recorded_at at time zone v_tz)::date > d - 7),
           v_days
      from public.price_points pp
     where pp.product_id = r.product_id and pp.region = r.region
       and (pp.recorded_at at time zone v_tz)::date between d - (v_days - 1) and d
    having count(*) > 0
    on conflict (product_id, region, date) do update
      set low = excluded.low, high = excluded.high, avg = excluded.avg, sales_count = excluded.sales_count,
          report_count = excluded.report_count, window_days = excluded.window_days;
    if found then
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------- admin

create function public.admin_set_seller_status(p_seller uuid, p_status public.seller_status) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.sellers
     set status = p_status,
         approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
         approved_by = case when p_status = 'approved' then auth.uid() else approved_by end
   where id = p_seller;
  if not found then
    raise exception 'Seller not found' using errcode = 'P0001';
  end if;
  if p_status = 'approved' then
    update public.seller_credentials set checked_by = auth.uid(), checked_at = now() where seller_id = p_seller and checked_at is null;
    update public.seller_products set approved = true where seller_id = p_seller;
    update public.sellers set verified_note = coalesce(private.verified_note_for(p_seller), verified_note) where id = p_seller;
  end if;
  perform private.log_admin('seller_' || p_status::text, p_seller::text);
end $$;

-- Issue a roll of blank labels to an approved seller. Codes are made here, on the server.
create function public.admin_issue_roll(p_seller uuid, p_size integer default 200) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_roll uuid;
  v_made integer := 0;
  v_tries integer := 0;
begin
  perform private.require_admin();
  if not private.seller_is_approved(p_seller) then
    raise exception 'Approve the seller before issuing labels' using errcode = 'P0001';
  end if;
  if p_size is null or p_size < 1 or p_size > 1000 then
    raise exception 'A roll has 1 to 1000 labels' using errcode = 'P0001';
  end if;
  insert into public.label_rolls (seller_id, size, issued_by) values (p_seller, p_size, auth.uid()) returning id into v_roll;
  while v_made < p_size and v_tries < p_size * 5 loop
    v_tries := v_tries + 1;
    insert into public.labels (code, roll_id, seller_id) values (private.new_label_code(), v_roll, p_seller)
    on conflict (code) do nothing;
    if found then
      v_made := v_made + 1;
    end if;
  end loop;
  update public.sellers set roll_requested_at = null where id = p_seller;
  perform private.log_admin('issue_roll', v_roll::text, jsonb_build_object('seller', p_seller, 'size', v_made));
  return jsonb_build_object('roll_id', v_roll, 'size', v_made);
end $$;

create function public.admin_clear_flag(p_flag bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.flags set status = 'cleared', cleared_by = auth.uid(), cleared_at = now() where id = p_flag and status = 'open';
  perform private.log_admin('clear_flag', p_flag::text);
end $$;

-- Held batches: approve (goes live, its label activates) or remove (label is voided).
create function public.admin_review_batch(p_batch uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.batches
     set status = case when p_approve then 'live'::public.batch_status else 'removed'::public.batch_status end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_batch and status = 'held';
  if not found then
    raise exception 'Only held batches can be reviewed' using errcode = 'P0001';
  end if;
  update public.labels
     set status = case when p_approve then 'active'::public.label_status else 'void'::public.label_status end,
         activated_at = case when p_approve then now() else activated_at end
   where batch_id = p_batch and status = 'blank';
  update public.flags set status = 'cleared', cleared_by = auth.uid(), cleared_at = now()
   where batch_id = p_batch and kind = 'failed_check' and status = 'open';
  perform private.log_admin(case when p_approve then 'approve_batch' else 'remove_batch' end, p_batch::text);
end $$;

create function public.admin_run_price_index() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  perform private.require_admin();
  n := private.compute_price_index(null);
  perform private.log_admin('run_price_index', null, jsonb_build_object('rows', n));
  return n;
end $$;

-- ---------------------------------------------------------------- who can call what

revoke all on function
  private.cfg_num(text, numeric), private.cfg_bool(text, boolean), private.km(double precision, double precision, double precision, double precision),
  private.hit_rate(text, integer, interval), private.new_label_code(), private.normalize_code(text),
  private.log_admin(text, text, jsonb), private.require_admin(), private.verified_note_for(uuid),
  private.compute_price_index(date)
from public;

revoke all on function
  public.lookup_label(text, text, text, text, text, double precision, double precision, text),
  public.check_blank_label(text),
  public.create_batch(text, text, numeric, numeric, text, text, timestamptz, double precision, double precision, text, text),
  public.add_label_to_batch(text, uuid),
  public.my_pins(),
  public.save_pin(public.pin_type, text, text, text, double precision, double precision, public.site_kind),
  public.use_pin(public.pin_type),
  public.request_label_roll(),
  public.place_order(uuid, numeric, text),
  public.set_order_status(bigint, public.order_status),
  public.submit_seller_application(jsonb),
  public.join_pilot(text, text),
  public.admin_set_seller_status(uuid, public.seller_status),
  public.admin_issue_roll(uuid, integer),
  public.admin_clear_flag(bigint),
  public.admin_review_batch(uuid, boolean),
  public.admin_run_price_index()
from public, anon, authenticated;

-- Label lookups: only the label API on the server (service-role key).
grant execute on function public.lookup_label(text, text, text, text, text, double precision, double precision, text) to service_role;

-- Anyone, signed in or not.
grant execute on function public.join_pilot(text, text) to anon, authenticated;

-- Signed-in people. Each function checks what the caller is allowed to do.
grant execute on function
  public.check_blank_label(text),
  public.create_batch(text, text, numeric, numeric, text, text, timestamptz, double precision, double precision, text, text),
  public.add_label_to_batch(text, uuid),
  public.my_pins(),
  public.save_pin(public.pin_type, text, text, text, double precision, double precision, public.site_kind),
  public.use_pin(public.pin_type),
  public.request_label_roll(),
  public.place_order(uuid, numeric, text),
  public.set_order_status(bigint, public.order_status),
  public.submit_seller_application(jsonb),
  public.admin_set_seller_status(uuid, public.seller_status),
  public.admin_issue_roll(uuid, integer),
  public.admin_clear_flag(bigint),
  public.admin_review_batch(uuid, boolean),
  public.admin_run_price_index()
to authenticated;
