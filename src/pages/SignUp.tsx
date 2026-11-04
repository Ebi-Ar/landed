import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, Store } from 'lucide-react'
import { AuthFrame } from './SignIn'
import { Alert } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { errorMessage } from '@/lib/supabase'
import { cn } from '@/lib/cn'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState<'buy' | 'sell'>(params.get('role') === 'seller' ? 'sell' : 'buy')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const { needsConfirm } = await signUp(email, password, name, phone)
      if (needsConfirm) setSent(true)
      else navigate(role === 'sell' ? '/sell/join' : params.get('next') || '/map', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <AuthFrame>
        <h1>Check your email</h1>
        <p className="sub">
          We sent a link to <b>{email}</b>. Open it on this phone to finish signing up{role === 'sell' ? ', then set up your seller account' : ''}.
        </p>
        <Link className="btn alt" to="/signin">
          Back to sign in
        </Link>
      </AuthFrame>
    )

  return (
    <AuthFrame>
      <div>
        <h1>Create your account</h1>
        <p className="sub">One account for buying and selling.</p>
      </div>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="I want to">
          {(
            [
              ['buy', 'Buy local food', ShoppingBag],
              ['sell', 'Sell my catch or harvest', Store],
            ] as const
          ).map(([k, l, Icon]) => (
            <button key={k} type="button" role="radio" aria-checked={role === k} onClick={() => setRole(k)} className={cn('pick')} aria-pressed={role === k}>
              <Icon className="text-tide" />
              {l}
            </button>
          ))}
        </div>
        <label className="field">
          Your name
          <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Phone {role === 'buy' && <span className="font-normal text-muted">(optional)</span>}
          <input type="tel" autoComplete="tel" required={role === 'sell'} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(506) 555-0100" />
        </label>
        <label className="field">
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Password
          <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <Alert tone="bad">{error}</Alert>}
        <button className="btn" disabled={busy}>
          {busy ? 'Creating…' : role === 'sell' ? 'Continue to seller setup' : 'Create account'}
        </button>
        <p className="small m-0">
          Landed stores your name, email and phone to run orders. Sellers’ licence details are seen only by them and the Landed team. Prototype: sample data until the
          pilot.
        </p>
      </form>
      <p className="small text-center">
        Already have an account?{' '}
        <Link className="link text-[12.5px]!" to="/signin">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  )
}
