-- Acceptance checks for row-level security and the server functions, run
-- against the seeded sample world by supabase/tests/run-local.sh.
-- Each block switches to a person (anon, buyer, Marc, Lise, admin, server)
-- and asserts what they can and cannot see or do.

\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- expect_error('sql', 'pattern'): the statement must fail with a matching message.
create function pg_temp.expect_error(p_sql text, p_pattern text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED ERROR matching "%" but it succeeded: %', p_pattern, p_sql;
exception when others then
  if sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if sqlerrm not ilike p_pattern then
    raise exception 'Expected error like "%", got "%" for: %', p_pattern, sqlerrm, p_sql;
  end if;
end $$;

create function pg_temp.login(p_uid text) returns void language sql as $$
  select set_config('request.jwt.claims',
    case when p_uid is null then '{"role":"anon"}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, false);
$$;

-- Codes the test needs but signed-in users can't compute themselves.
create temp table t_codes (name text primary key, code text);
insert into t_codes values
  ('lise1', private.sample_code('landed-demo-roll-lise-1')),
  ('lise5', private.sample_code('landed-demo-roll-lise-5'));
grant select on t_codes to authenticated, service_role;

-- ================================================================ public (signed out)
select pg_temp.login(null);
set role anon;
do $$
declare v int;
begin
  select count(*) into v from public.seller_directory;           assert v = 6, 'anon sees 6 approved sellers, got ' || v;
  select count(*) into v from public.batches where status = 'live'; assert v = 10, 'anon sees 10 live batches, got ' || v;
  select count(*) into v from public.price_index_daily;          assert v > 250, 'anon reads the price index';
  select count(*) into v from public.markets;                    assert v = 2;
  -- Denise has "Show my phone number" off.
  assert (select phone from public.seller_directory where display_name = 'Denise Cormier') is null, 'hidden phone must be null';
  assert (select phone from public.seller_directory where display_name = 'Marc Leblanc') = '(506) 555-0142', 'shown phone';
  perform pg_temp.expect_error('select * from public.profiles', '%permission denied%');
  perform pg_temp.expect_error('select * from public.labels', '%permission denied%');
  perform pg_temp.expect_error('select * from public.orders', '%permission denied%');
  perform pg_temp.expect_error('select * from public.seller_credentials', '%permission denied%');
  perform pg_temp.expect_error('select * from private.saved_pins', '%permission denied%');
  perform pg_temp.expect_error($q$select public.lookup_label('LD-8F3K2Q')$q$, '%permission denied%');
  perform pg_temp.expect_error($q$select public.place_order('30000000-0000-4000-8000-000000000001', 1)$q$, '%permission denied%');
  perform public.join_pilot('someone@example.org', 'sensors');
end $$;
reset role;

-- ================================================================ buyer
select pg_temp.login('10000000-0000-4000-8000-000000000001');
set role authenticated;
do $$
declare v int; o jsonb;
begin
  select count(*) into v from public.orders;                 assert v = 0, 'buyer starts with no orders, sees ' || v;
  select count(*) into v from public.profiles;               assert v = 1, 'buyer sees only own profile';
  select count(*) into v from public.seller_credentials;     assert v = 0, 'buyer sees no credentials';
  select count(*) into v from public.labels;                 assert v = 0, 'buyer sees no labels';
  select count(*) into v from public.scans;                  assert v = 0, 'buyer sees no scans';
  -- Order 5 lb of Marc's lobster for pickup at the wharf; the server sets the price.
  o := public.place_order('30000000-0000-4000-8000-000000000001', 5, 'pin');
  assert (o ->> 'total')::numeric = 43.75, 'total computed on the server: ' || (o ->> 'total');
  assert o ->> 'status' = 'ordered';
  assert o ->> 'buyer_name' = 'Sam G.', 'buyer name shortened: ' || (o ->> 'buyer_name');
  assert (o ->> 'id')::int = 1050, 'order numbers continue from 1050';
  select count(*) into v from public.orders;                 assert v = 1, 'buyer now sees one order';
  perform pg_temp.expect_error($q$select public.place_order('30000000-0000-4000-8000-000000000001', 500)$q$, 'Only % left%');
  perform pg_temp.expect_error($q$select public.set_order_status(1050, 'confirmed')$q$, '%Only the seller%');
  perform pg_temp.expect_error($q$insert into public.labels (code, roll_id, seller_id) select 'LD-AAAAAA', roll_id, seller_id from public.labels limit 1$q$, '%permission denied%');
  perform pg_temp.expect_error($q$update public.batches set price = 1$q$, '%permission denied%');
  perform pg_temp.expect_error($q$update public.profiles set is_admin = true$q$, '%permission denied%');
  perform pg_temp.expect_error($q$select public.reset_demo()$q$, '%Only the Landed team%');
end $$;
do $$
begin
  assert (public.check_blank_label('LD-8F3K2Q') ->> 'error') = 'not_approved', 'a buyer cannot set up labels';
end $$;
reset role;

-- ================================================================ Marc (fisher)
select pg_temp.login('10000000-0000-4000-8000-000000000002');
set role authenticated;
do $$
declare
  v int; r jsonb; o jsonb;
  marc_blank text; lise_blank text;
begin
  select count(*) into v from public.orders;                 assert v = 4, 'Marc sees his 4 orders (incl. the new one), sees ' || v;
  select count(*) into v from public.orders where id = 1044; assert v = 0, 'Marc cannot see Lise''s order';
  select count(*) into v from public.seller_credentials;     assert v = 2, 'Marc sees only his own credentials';
  select count(*) into v from public.labels;                 assert v = 53, 'Marc sees his 53 labels, got ' || v;
  select count(*) into v from public.labels where status = 'blank'; assert v = 50, 'Marc has 50 blank labels';

  select code into marc_blank from public.labels where status = 'blank' order by code limit 1;
  -- One of Lise's blank codes (Marc can't read her labels; the test knows it).
  select code into lise_blank from t_codes where name = 'lise1';

  assert public.check_blank_label(marc_blank) ->> 'ok' = 'true', 'own blank label is ok';
  assert public.check_blank_label(lise_blank) ->> 'error' = 'other_seller', 'someone else''s label';
  assert public.check_blank_label('LD-8F3K2Q') ->> 'error' = 'in_use', 'used label';
  assert public.check_blank_label('LD-QQ7Z2W') ->> 'error' = 'not_found', 'fake label';

  -- Photo taken in the app at the wharf, uploaded to his own folder.
  insert into storage.objects (bucket_id, name, owner) values ('batch-photos', '20000000-0000-4000-8000-000000000001/t1.jpg', auth.uid());
  perform pg_temp.expect_error($q$insert into storage.objects (bucket_id, name, owner) values ('batch-photos', '20000000-0000-4000-8000-000000000002/x.jpg', auth.uid())$q$, '%row-level security%');

  r := public.create_batch(marc_blank, 'lobster', 80, 8.50, 'pin', '20000000-0000-4000-8000-000000000001/t1.jpg',
                           now() - interval '2 minutes', 46.2420, -64.5230);
  assert r ->> 'status' = 'live', 'all checks pass -> live: ' || r::text;
  assert jsonb_array_length(r -> 'checks') = 7, 'seven checks';
  assert (select status from public.labels where code = marc_blank) = 'active', 'label activated';
  perform pg_temp.expect_error(format($q$select public.create_batch(%L, 'lobster', 10, 8, 'pin', null, now(), null, null)$q$, marc_blank), '%already in use%');
  perform pg_temp.expect_error(format($q$select public.create_batch(%L, 'potatoes', 10, 8, 'pin', null, now(), null, null)$q$, lise_blank), '%belongs to another seller%');

  -- Another label joins the same batch.
  select code into marc_blank from public.labels where status = 'blank' order by code limit 1;
  assert (public.add_label_to_batch(marc_blank, (r ->> 'batch_id')::uuid) ->> 'labels_on_batch')::int = 2, 'second label on batch';

  -- A batch that fails a check is held: 5000 lb is too much for one boat, and no photo.
  select code into marc_blank from public.labels where status = 'blank' order by code limit 1;
  r := public.create_batch(marc_blank, 'lobster', 5000, 8.50, 'pin', null, null, null, null);
  assert r ->> 'status' = 'held', 'failed checks -> held';
  assert (select status from public.labels where code = marc_blank) = 'blank', 'held batch does not activate its label';

  -- Orders: confirm reduces qty_left, ready, picked up records a sale price.
  o := public.set_order_status(1050, 'confirmed');
  assert (select qty_left from public.batches where id = '30000000-0000-4000-8000-000000000001') = 115, 'qty_left 120 - 5';
  perform pg_temp.expect_error($q$select public.set_order_status(1050, 'picked_up')$q$, '%already confirmed%');
  perform public.set_order_status(1050, 'ready');
  perform public.set_order_status(1050, 'picked_up');
  perform pg_temp.expect_error($q$select public.set_order_status(1044, 'confirmed')$q$, '%Only the seller%');

  -- Available now and phone switches; can't touch Lise's pin.
  update public.seller_locations set available_now = false, available_since = null where seller_id = private.my_seller_id();
  update public.seller_locations set show_phone = false where seller_id = private.my_seller_id();
  update public.seller_locations set available_now = false where seller_id = '20000000-0000-4000-8000-000000000002';
  get diagnostics v = row_count;
  assert v = 0, 'cannot change another seller''s pin';
  perform pg_temp.expect_error($q$update public.seller_locations set seller_id = '20000000-0000-4000-8000-000000000002'$q$, '%permission denied%');

  -- Switch to the saved pickup spot, then back.
  r := public.use_pin('pickup');
  assert r -> 'active' ->> 'place_name' = 'Shediac waterfront parking lot', 'switched to pickup spot';
  r := public.use_pin('exact');
  assert r -> 'active' ->> 'place_name' = 'Pointe-du-Chêne wharf', 'back to the wharf';
end $$;
reset role;

-- The held batch is invisible to the public; the switches show for everyone.
select pg_temp.login(null);
set role anon;
do $$
declare v int;
begin
  select count(*) into v from public.batches where status = 'held'; assert v = 0, 'held batches are not public';
  select count(*) into v from public.batches where status = 'live'; assert v = 11, 'new live batch is public, got ' || v;
  assert (select available_now from public.seller_directory where display_name = 'Marc Leblanc') = false, 'pin outlined for everyone';
  assert (select phone from public.seller_directory where display_name = 'Marc Leblanc') is null, 'phone hidden when switched off';
end $$;
reset role;

-- ================================================================ label page (server function, service role)
set role service_role;
do $$
declare r jsonb;
begin
  r := public.lookup_label('LD-0X4K8L', 'dev-a', 'Moncton', 'NB', 'CA', 46.09, -64.78, 'net-a');
  assert r ->> 'status' = 'active';
  assert (r -> 'warnings' ->> 'copied')::boolean, 'copied sample shows the copy warning';
  assert r -> 'sold' ->> 'to' = 'Le Coquillage (restaurant), Moncton', 'sold-to shown';
  assert r -> 'warnings' -> 'far_cities' ? 'Halifax', 'far cities listed';

  r := public.lookup_label('ld-8f3k2q', 'dev-a', 'Moncton', 'NB', 'CA', 46.09, -64.78, 'net-a');
  assert r ->> 'status' = 'active' and not (r -> 'warnings' ->> 'copied')::boolean, 'real label, no warning';
  assert (r -> 'batch' ->> 'checks_passed')::boolean, 'passed the automatic checks';
  assert r -> 'seller' ->> 'phone' is null, 'Marc turned his phone off above';

  r := public.lookup_label('LD-QQ7Z2W', 'dev-a', null, null, null, null, null, 'net-a');
  assert r ->> 'status' = 'not_found', 'fake label';

  r := public.lookup_label((select code from t_codes where name = 'lise5'), 'dev-a', null, null, null, null, null, 'net-a');
  assert r ->> 'status' = 'blank', 'blank label';
  assert exists (select 1 from public.flags where kind = 'blank_scanned'), 'blank scan flags the roll';
  assert (select count(*) from public.scans where label_code = 'LD-QQ7Z2W') = 1, 'every view adds a scan';
end $$;
reset role;

-- ================================================================ new seller onboarding + admin
insert into auth.users (id, email, raw_user_meta_data) values ('10000000-0000-4000-8000-0000000000ff', 'new@example.org', '{"full_name":"Nora Gallant","phone":"(506) 555-0199"}');
select pg_temp.login('10000000-0000-4000-8000-0000000000ff');
set role authenticated;
do $$
declare r jsonb;
begin
  assert (select full_name from public.profiles) = 'Nora Gallant', 'profile created on sign-up';
  r := public.submit_seller_application('{
    "kind":"farmer","display_name":"Nora Gallant","business_name":"Gallant Gardens","story":"Market garden",
    "credentials":[{"type":"farm_registration","number":"F-1"}],"products":["carrots","squash"],
    "season_plan":[{"product":"carrots","size_text":"half an acre","expected_qty":80}],
    "markets":["moncton"],"show_phone":true,
    "pin":{"pin_type":"pickup","place_name":"Dieppe Market parking","area_label":"Dieppe","hours_text":"Sat 8-12","lat":46.097,"lng":-64.726}}'::jsonb);
  assert r ->> 'status' = 'pending';
  assert public.check_blank_label('LD-8F3K2Q') ->> 'error' = 'not_approved', 'pending sellers cannot activate labels';
end $$;
reset role;
select pg_temp.login(null);
set role anon;
do $$ begin
  assert not exists (select 1 from public.seller_directory where display_name = 'Nora Gallant'), 'pending seller not on the map';
end $$;
reset role;

select pg_temp.login('10000000-0000-4000-8000-000000000004');  -- admin
set role authenticated;
do $$
declare v int; sid uuid; r jsonb;
begin
  select count(*) into v from public.seller_credentials;   assert v >= 9, 'admin sees all credentials';
  select count(*) into v from public.flags where status = 'open'; assert v >= 3, 'admin sees flags';
  select id into sid from public.sellers where display_name = 'Nora Gallant';
  perform pg_temp.expect_error(format('select public.admin_issue_roll(%L, 10)', sid), '%Approve the seller%');
  perform public.admin_set_seller_status(sid, 'approved');
  r := public.admin_issue_roll(sid, 20);
  assert (r ->> 'size')::int = 20, 'roll of 20 issued';
  select count(*) into v from public.labels where seller_id = sid and status = 'blank' and code ~ '^LD-[ABCDEFGHJKMNPQRSTWXYZ2-9]{6}$';
  assert v = 20, 'codes use the no-look-alike alphabet';
  perform public.admin_review_batch((select id from public.batches where status = 'held' limit 1), true);
  assert not exists (select 1 from public.batches where status = 'held'), 'held batch approved';
  select count(*) into v from public.products;
  assert public.admin_run_price_index() = v, 'index rebuilt for every product';
end $$;
reset role;
select pg_temp.login(null);
set role anon;
do $$ begin
  assert exists (select 1 from public.seller_directory where display_name = 'Nora Gallant' and phone = '(506) 555-0199'), 'approved seller on the map';
end $$;
reset role;

-- Reset demo restores the seed data (and keeps Nora's account, minus her labels).
select pg_temp.login('10000000-0000-4000-8000-000000000004');
set role authenticated;
select public.reset_demo();
do $$
declare v int;
begin
  select count(*) into v from public.orders;  assert v = 4, 'seed orders restored, got ' || v;
  select count(*) into v from public.batches where status = 'live'; assert v = 10, 'seed batches restored';
  assert (select available_now from public.seller_locations l join public.sellers s on s.id = l.seller_id where s.display_name = 'Marc Leblanc'), 'Marc available again';
  assert (select count(*) from public.labels where seller_id = (select id from public.sellers where display_name = 'Marc Leblanc') and status = 'blank') = 50, 'demo roll back to 50';
  assert exists (select 1 from public.sellers where display_name = 'Nora Gallant'), 'real sign-ups keep their seller account';
end $$;
reset role;

select 'security and flow checks passed' as result;
