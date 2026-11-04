-- Email the buyer when an order is placed and at each status change.
--
-- Sent from the database with pg_net through Resend (free tier is enough for
-- the pilot). Off until both are set up, and it never blocks an order:
--   1. Database → Extensions: enable pg_net.
--   2. Store the key in Vault:
--        select vault.create_secret('re_xxx', 'resend_api_key');
--   3. Optional, in supabase/thresholds.sql or the SQL editor:
--        email.from  e.g. "Landed <orders@your-domain>"
--        site.url    e.g. "https://landed.vercel.app"
-- Sample accounts (@example.com) never get email. Text messages come later.

create function private.order_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_to text;
  v_from text;
  v_site text;
  v_seller text;
  v_phone text;
  v_product text;
  v_unit text;
  v_subject text;
  v_lines text[];
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    return new;
  end if;

  select u.email into v_to from auth.users u where u.id = new.buyer_id;
  if v_to is null or v_to ilike '%@example.com' then
    return new;
  end if;

  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v_key using 'resend_api_key';
  exception when others then
    v_key := null;
  end;
  if v_key is null then
    return new;
  end if;

  v_from := coalesce((select s.value #>> '{}' from private.settings s where s.key = 'email.from'), 'Landed <onboarding@resend.dev>');
  v_site := coalesce((select s.value #>> '{}' from private.settings s where s.key = 'site.url'), '');
  select s.display_name, case when l.show_phone then p.phone end
    into v_seller, v_phone
    from public.sellers s
    join public.profiles p on p.id = s.profile_id
    left join public.seller_locations l on l.seller_id = s.id
   where s.id = new.seller_id;
  select pr.short_name, pr.unit into v_product, v_unit
    from public.batches b join public.products pr on pr.slug = b.product_id where b.id = new.batch_id;

  v_subject := 'Order #' || new.id || ': ' || case new.status
    when 'ordered' then 'sent to ' || v_seller
    when 'confirmed' then 'confirmed by ' || v_seller
    when 'ready' then 'ready for pickup'
    when 'picked_up' then 'picked up. Thanks!'
    when 'declined' then v_seller || ' can’t do this order'
  end;

  v_lines := array[
    case new.status
      when 'ordered' then 'Your order is on its way to ' || v_seller || '. You’ll get an email when they confirm it.'
      when 'confirmed' then v_seller || ' confirmed your order.'
      when 'ready' then 'Your order is packed and ready. Show the order number when you pick it up, and pay the seller then.'
      when 'picked_up' then 'Enjoy your local food. Scan the Landed label any time to see where it came from.'
      when 'declined' then v_seller || ' can’t fill this order. Nothing was charged. Try another seller on the map.'
    end,
    '',
    trim_scale(new.qty)::text || ' ' || coalesce(v_unit, '') || ' ' || lower(coalesce(v_product, '')) || ' · $' || to_char(new.total, 'FM999990.00') || ' · pay at pickup',
    'Pickup: ' || new.pickup_place || coalesce(' · ' || nullif(new.pickup_when, ''), ''),
    coalesce('Call ' || v_seller || ': ' || v_phone, ''),
    '',
    case when v_site <> '' then 'Your orders: ' || v_site || '/orders' else '' end
  ];

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object('from', v_from, 'to', jsonb_build_array(v_to), 'subject', v_subject,
                               'text', array_to_string(array_remove(v_lines, ''), E'\n'))
  );
  return new;
exception when others then
  -- Never let email problems block an order.
  raise warning 'Landed order email not sent: %', sqlerrm;
  return new;
end $$;

revoke all on function private.order_email() from public;

create trigger order_email_on_insert
  after insert on public.orders
  for each row execute function private.order_email();

create trigger order_email_on_status
  after update of status on public.orders
  for each row execute function private.order_email();
