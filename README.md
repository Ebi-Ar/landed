# Landed

New Brunswick fishers and farmers list food, buyers find it on a map and order for pickup, and anyone can scan a label to check where it came from. Built by Fundy Five for H2A Canada.

All people, prices and places in the seed data are **sample data** until the pilot.

## Stack

- React 18, Vite, TypeScript, Tailwind 4, React Router, TanStack Query
- Supabase: Auth (email and password), Postgres with row-level security, Storage (batch photos), Realtime (live pins and orders), pg_cron (nightly Price Index)
- MapLibre with OpenFreeMap vector tiles (OpenStreetMap data), Recharts, qrcode.react, html5-qrcode
- Vercel: the web app plus one edge function, `api/label.ts`, which handles label lookups

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and keys
npm run dev
```

Without the Supabase variables, the app shows a "not connected" screen instead of crashing.

## Set up Supabase (once)

1. Create a project at supabase.com (the free plan is fine) and keep the database password.
2. Link this folder to it and push the schema, thresholds and sample world:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push --include-seed
   ```
3. Go to **Authentication → URL configuration** and set the Site URL to your Vercel URL. For the demo you can turn off **Confirm email** under Authentication → Providers → Email, so new accounts can sign in straight away.
4. Give the admin account a password in the **SQL editor**. The repo never contains it:
   ```sql
   update auth.users set encrypted_password = extensions.crypt('<a strong password>', extensions.gen_salt('bf'))
   where email = 'admin@example.com';
   ```
   You can also make any real account an admin: `update public.profiles set is_admin = true where id = '<user id>';`
5. Copy the keys from **Project settings → API** into `.env.local` and into Vercel (see below).

## Deploy (Vercel)

Vercel deploys from GitHub as before. In **Project → Settings → Environment Variables**, set:

| Variable | Where it's used |
| --- | --- |
| `VITE_SUPABASE_URL` | Browser |
| `VITE_SUPABASE_ANON_KEY` | Browser. This public key is limited by row-level security. |
| `VITE_PUBLIC_URL` | The domain printed in QR labels, e.g. `https://landed-nb.vercel.app` |
| `VITE_DEMO_LOGINS` | `true` shows the demo sign-in buttons; set `false` for the pilot |
| `SUPABASE_URL` | Label API, server side |
| `SUPABASE_SERVICE_ROLE_KEY` | Label API, server side only. Never prefix it with `VITE_`. |
| `LABEL_HASH_SALT` | Any long random string, used to hash device ids for scans |

## Demo accounts (sample data)

| Who | Email | Password |
| --- | --- | --- |
| Buyer (Sam Gallant) | `buyer@example.com` | `landed-demo` |
| Marc Leblanc, fisher | `marc@example.com` | `landed-demo` |
| Lise Ouellette, farmer | `lise@example.com` | `landed-demo` |
| Landed team (admin) | `admin@example.com` | set it yourself (step 4 above) |

The sign-in page has one-tap buttons for the first three. Marc and Lise each have a demo roll of 50 blank labels. The codes stay the same after every reset, so a printed sheet keeps working. To print it, go to **Admin → Label rolls → Print sheet**.

**Admin → Demo → Reset demo** restores the sample world before each pitch, with times relative to now, so "Landed 2 h ago" is true again.

## Demo script (about 3 minutes, two phones)

1. **Buyer phone:** open the map. Point out the farm, wharf, pickup and market pins. A filled pin means the seller is there now.
2. **Seller phone (Marc):** switch **At the wharf now** off and on. The pin changes on the buyer phone.
3. Marc checks **Prices**: today's fair range for lobster, then switches to mackerel.
4. Marc taps **Add batch**, scans a blank label from the printed sheet, picks lobster, enters 80 lb at a fair price, takes a photo and watches the checks pass.
5. **Buyer phone:** the new lobster appears on the map and in Fresh. Order 5 lb for pickup at the wharf.
6. Marc confirms, then marks it ready. The buyer phone updates.
7. Hand a judge the labelled box. They scan it with their own phone camera and see the verified journey.
8. Scan the copied label `LD-0X4K8L` and a fake one such as `LD-QQ7Z2W` to show the warnings.
9. Close on the locked modules: sensors, e-logbook import, delivery.

## How labels and trust work

- A label is a random code (`LD-` plus 6 characters, with no look-alike characters) and the QR only links to `/l/<code>`. Admins issue codes in rolls, on the server.
- **Add batch:** the server checks that the label exists, is blank and comes from this seller's roll. It then runs the automatic checks: seller approved, right product, in season, realistic amount, fresh in-app photo, photo place, and label belongs to the seller. If everything passes, the label activates and the batch goes live. Otherwise the batch is **held** off the map until an admin reviews it.
- **Label page:** every view looks the code up on the server and records a scan with only an approximate city and a hashed device id. Copy-detection rules flag codes that were never issued, blank labels, too many phones for the batch size, scans far from the sale, and scans long after the food should be gone.
- To tune any threshold, edit `supabase/thresholds.sql` and run it again in the SQL editor.

## Security and privacy

- Every table has row-level security. Sellers can change only their own pin, batches and orders. Buyers see only their own orders. Credentials are visible only to the seller and admins.
- The browser never writes to labels, batches, orders, scans or flags. Those changes go through server functions (`supabase/migrations/*_functions.sql`) that check who is calling. Label lookups use the service-role key, and only inside `api/label.ts`.
- If a seller uses a pickup spot, their farm or wharf location is stored only in the private schema, never in a public table. Phone numbers come back only when **Show my phone number** is on.
- Photos are taken in the app and re-encoded on the phone, which strips EXIF and GPS data. The photo's coordinates are never stored; only the result of the photo-place check is kept.
- Sign-up, label checks, new batches, orders and label lookups are rate limited. Admin actions are logged in `private.admin_log`. No card data exists anywhere: buyers pay at pickup.

## Order emails (optional)

Buyers get an email when they order and at each status change. This is off until you set it up:

1. Database → Extensions: enable `pg_net`.
2. In the SQL editor: `select vault.create_secret('<resend api key>', 'resend_api_key');`
3. Optional: `insert into private.settings values ('email.from', '"Landed <orders@your-domain>"', null), ('site.url', '"https://landed-nb.vercel.app"', null);`

Sample accounts (`@example.com`) never get email.

## Tests

The database tests run on a plain local Postgres; Docker isn't needed. They apply every migration and the seed to a throwaway database, then check row-level security and the server functions as anon, buyer, Marc, Lise, a new seller and an admin:

```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres npm run db:test
```

`npm run typecheck` and `npm run build` check the app.

## Project layout

```
api/label.ts                 label lookup (Vercel edge function, service-role key)
src/label/                   public label page, loaded on its own so it stays small
src/pages/                   buyer screens; sell/ for sellers; admin/
src/lib/                     Supabase client, auth, queries, prices, formatting
supabase/migrations/         schema + RLS, server functions, sample world, storage/realtime/cron, emails
supabase/thresholds.sql      every tunable number in one place
supabase/seed.sql            loads the sample world (re-runnable)
supabase/tests/              local Postgres test harness and checks
```

## Before the pilot

- The map uses OpenFreeMap (free, no key, no usage cap, but no uptime guarantee). If the pilot needs one, self-host the tiles or move to a paid provider.
- Set `checks.demo_skip_photo_place` to `false` in `supabase/thresholds.sql`.
- Replace the sample product season months with real DFO and provincial seasons.
- Check Canadian privacy rules for seller and buyer data, and add a privacy notice to sign-up.
