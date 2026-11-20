-- Restore the sample world every morning, so anyone who opens the live site on
-- their own, hours after the last manual reset, still sees "Landed 2 h ago"
-- and listings that are still fresh.
--
-- The job runs every hour and acts only at demo.reset_hour in Moncton, so it
-- stays at the same local time through daylight saving changes.
--
-- Turn it off for the pilot (demo.nightly_reset in supabase/thresholds.sql):
-- like the Reset demo button, it removes every batch, order, label and scan,
-- not only the sample ones.

insert into private.settings (key, value, note) values
  ('demo.nightly_reset', 'true', 'Restore the sample world every morning, like Admin → Demo → Reset demo. Set to false for the pilot: a reset removes every batch, order, label and scan.'),
  ('demo.reset_hour',    '6',    'Hour of the morning reset, Moncton time (0–23).')
on conflict (key) do nothing;

-- Returns true when it reset, false when it is off or not the right hour.
create function private.nightly_demo_reset() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not private.cfg_bool('demo.nightly_reset', false)
     or extract(hour from now() at time zone 'America/Moncton') <> private.cfg_num('demo.reset_hour', 6) then
    return false;
  end if;
  perform private.load_sample_world();
  perform private.log_admin('reset_demo', null, '{"automatic": true}'::jsonb);
  return true;
end $$;
revoke all on function private.nightly_demo_reset() from public;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('landed-demo-reset', '0 * * * *', 'select private.nightly_demo_reset()');
  else
    raise notice 'pg_cron is not available here; call private.nightly_demo_reset() every hour another way.';
  end if;
end $$;
