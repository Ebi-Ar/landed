-- Batch photos, live updates and the nightly Price Index job.

-- ---------------------------------------------------------------- photos
-- Public bucket: photos show on batch pages. Sellers can only upload into their
-- own folder (<seller id>/...). Photos are taken in the app and re-encoded on
-- the phone before upload, which drops all camera metadata (EXIF, GPS).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('batch-photos', 'batch-photos', true, 3145728, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Sellers upload batch photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'batch-photos'
    and (storage.foldername(name))[1] = private.my_seller_id()::text
    and private.seller_is_approved(private.my_seller_id())
  );

-- ---------------------------------------------------------------- realtime
-- Buyers' maps and order screens update within seconds of a seller's change.
-- Realtime still applies each table's row-level security.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.seller_locations, public.batches, public.orders;
  end if;
end $$;

-- ---------------------------------------------------------------- nightly index
-- 04:15 UTC is a quarter past midnight in Moncton (00:15 ADT / 23:15 AST).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('landed-price-index', '15 4 * * *', 'select private.compute_price_index(null)');
  else
    raise notice 'pg_cron is not available here; schedule private.compute_price_index() another way.';
  end if;
end $$;
