-- Landed thresholds: the one place to tune label checks and copy detection.
--
-- Edit a value here, then run this file again (Supabase SQL editor, or
-- `npm run db:thresholds`). The server functions read these on every call.
-- If a key is missing, the functions fall back to the defaults shown here.
-- Per-product numbers (shelf life, the most one boat lands) live on the
-- products table instead.

insert into private.settings (key, value, note) values
  -- Copy detection (runs on every label scan)
  ('copy.min_devices',            '25',   'A label is "maybe copied" once more phones than this have scanned it…'),
  ('copy.devices_per_unit',       '1',    '…or more than this many phones per unit in the batch (30 lb batch -> 30 phones), whichever is higher.'),
  ('copy.far_km',                 '150',  'A scan counts as far from the sale beyond this many km from where it was sold.'),
  ('copy.far_min_devices',        '3',    'Warn once this many different phones have scanned it far from the sale.'),

  -- Automatic checks on new batches
  ('checks.photo_radius_km',      '5',    'Photo must be taken within this many km of the seller''s farm, wharf or pickup spot.'),
  ('checks.photo_max_hours_sea',  '12',   'Fish and seafood: the photo must be this fresh (hours).'),
  ('checks.photo_max_days_land',  '7',    'Farm products: the photo must be this fresh (days).'),
  ('checks.demo_skip_photo_place','true', 'Skip the photo-place check for the sample demo sellers, so a pitch away from Shediac still passes. Set to false for the pilot.'),
  ('limits.boat_qty_default',     '2000', 'Most one boat lands in a batch when a product has no boat_limit of its own.'),

  -- Price Index
  ('index.window_days',           '14',   'Fair range uses the last N days of price points…'),
  ('index.fallback_days',         '30',   '…or this many days when there are too few points.'),
  ('index.min_points',            '6',    'Fewer points than this in the main window -> use the fallback window.'),

  -- Rate limits
  ('rate.scans_per_10min',        '60',   'Label-page lookups per device/network in 10 minutes.'),
  ('rate.label_checks_per_hour',  '120',  'Blank-label checks per seller per hour.'),
  ('rate.batches_per_hour',       '30',   'New batches per seller per hour.'),
  ('rate.orders_per_hour',        '20',   'Orders per buyer per hour.')
on conflict (key) do update set value = excluded.value, note = excluded.note;
