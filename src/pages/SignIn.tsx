import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Alert } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/supabase'

// Sample demo accounts from supabase/seed (shared password, sample data only).
const DEMO = [
  { label: 'Buyer', email: 'buyer@example.com', next: '/map' },
  { label: 'Marc (fisher)', email: 'marc@example.com', next: '/sell' },
  { label: 'Lise (farmer)', email: 'lise@example.com', next: '/sell' },
]
const DEMO_PASSWORD = 'landed-demo'
const showDemo = (import.meta.env.VITE_DEMO_LOGINS ?? 'true') !== 'false'

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-4 px-4 py-8">
      <Link to="/" className="self-start">
        <Logo />
      </Link>
      {children}
    </div>
  )
}

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/map'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go(e: string, p: string, to = next) {
    setBusy(true)
    setError(null)
    try {
      await signIn(e, p)
      navigate(to.startsWith('/') ? to : '/map', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame>
      <div>
        <h1>Sign in</h1>
        <p className="sub">Order for pickup, track orders, or sell on Landed.</p>
      </div>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          go(email, password)
        }}
      >
        <label className="field">
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <Alert tone="bad">{error}</Alert>}
        <button className="btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="small m-0 text-center">
          New to Landed?{' '}
          <Link className="link text-[12.5px]!" to={`/signup?next=${encodeURIComponent(next)}`}>
            Create an account
          </Link>
        </p>
      </form>
      {showDemo && (
        <div className="card">
          <h3>Demo accounts</h3>
          <p className="small m-0">Sample people for the prototype. Try two phones: a buyer on one, Marc on the other.</p>
          <div className="flex flex-wrap gap-2">
            {DEMO.map((d) => (
              <button key={d.email} type="button" className="btn sm alt" disabled={busy} onClick={() => go(d.email, DEMO_PASSWORD, params.get('next') || d.next)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <Link to="/map" className="link self-center text-[13px]!">
        Just looking? Browse the map without signing in
      </Link>
    </AuthFrame>
  )
}
