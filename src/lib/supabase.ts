import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined

/** True when the Supabase URL and public (anon) key are set. */
export const isConfigured = Boolean(url && key)

/**
 * The one Supabase client. Uses the public key only: everything it can do is
 * limited by row-level security and the server functions.
 */
export const supabase: SupabaseClient = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 5 } },
})

export const PHOTO_BUCKET = 'batch-photos'

export function photoUrl(path: string | null | undefined) {
  if (!path) return null
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Turns a Supabase/Postgres error into the plain message the server wrote. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Try again.') {
  if (!e) return fallback
  if (typeof e === 'string') return e
  const m = (e as { message?: string }).message
  if (!m) return fallback
  if (/failed to fetch|network/i.test(m)) return 'No connection. Check your signal and try again.'
  if (/JWT|not authenticated|Sign in first/i.test(m)) return 'Sign in first.'
  return m
}
