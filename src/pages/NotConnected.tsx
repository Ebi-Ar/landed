import { Logo } from '@/components/Logo'

/** Shown when the Supabase URL and key aren't set (local setup or a misconfigured deploy). */
export default function NotConnected() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col gap-4 px-4 py-10">
      <Logo />
      <h1>Landed isn’t connected to its database yet</h1>
      <p className="sub">
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> (or in Vercel’s environment variables), then reload. See the
        README for the full setup.
      </p>
    </div>
  )
}
