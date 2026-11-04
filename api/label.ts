/**
 * Label lookup API: GET /api/label?code=LD-XXXXXX&d=<device id>
 *
 * Runs on the server (Vercel edge). It is the only caller of the
 * lookup_label database function, using the service-role key, which never
 * reaches the browser. It passes the approximate city Vercel derives from the
 * request, a salted hash of the device id, and a salted, daily-rotating hash of
 * the network address for rate limiting. Raw IP addresses and coordinates are
 * never stored: the database keeps the city name and a rounded distance only.
 */
export const config = { runtime: 'edge' }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

function header(h: Headers, name: string) {
  const v = h.get(name)
  if (!v) return null
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const code = (url.searchParams.get('code') ?? '').trim().slice(0, 24)
  const device = (url.searchParams.get('d') ?? '').trim().slice(0, 64)

  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  const salt = process.env.LABEL_HASH_SALT || 'landed-dev-salt'
  if (!base || !key) return json({ status: 'error', code, message: 'The label service isn’t set up yet.' }, 503)
  if (!code) return json({ status: 'not_found', code: '' })

  const h = req.headers
  const lat = Number.parseFloat(h.get('x-vercel-ip-latitude') ?? '')
  const lng = Number.parseFloat(h.get('x-vercel-ip-longitude') ?? '')
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || ''
  const day = new Date().toISOString().slice(0, 10)

  const body = {
    p_code: code,
    p_device_hash: device ? await sha256(`${salt}:device:${device}`) : null,
    p_city: header(h, 'x-vercel-ip-city'),
    p_region: header(h, 'x-vercel-ip-country-region'),
    p_country: header(h, 'x-vercel-ip-country'),
    p_lat: Number.isFinite(lat) ? Math.round(lat * 100) / 100 : null,
    p_lng: Number.isFinite(lng) ? Math.round(lng * 100) / 100 : null,
    p_client_hash: ip ? await sha256(`${salt}:net:${day}:${ip}`) : null,
  }

  // New-style secret keys go in `apikey` only; legacy service_role JWTs also as a bearer token.
  const headers: Record<string, string> = { apikey: key, 'content-type': 'application/json' }
  if (!key.startsWith('sb_')) headers.authorization = `Bearer ${key}`

  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/rest/v1/rpc/lookup_label`, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!r.ok) return json({ status: 'error', code, message: 'Couldn’t reach Landed. Try again in a moment.' }, 502)
    return json(await r.json())
  } catch {
    return json({ status: 'error', code, message: 'Couldn’t reach Landed. Try again in a moment.' }, 502)
  }
}
