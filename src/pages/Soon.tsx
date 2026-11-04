import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { Alert, BackLink } from '@/components/ui'
import { LOCKED, lockedByKey } from '@/lib/modules'
import { useAuth } from '@/lib/auth'
import { errorMessage, supabase } from '@/lib/supabase'

/** Locked module preview with a pilot sign-up. */
export default function Soon() {
  const { module = '' } = useParams()
  const m = lockedByKey[module]
  const { email: myEmail } = useAuth()
  const [email, setEmail] = useState(myEmail ?? '')
  const join = useMutation({
    mutationFn: async () => {
      if (!/.+@.+\..+/.test(email.trim())) throw new Error('Enter an email address so we can reach you')
      const { error } = await supabase.rpc('join_pilot', { p_email: email.trim(), p_module: module })
      if (error) throw error
    },
  })
  if (!m)
    return (
      <>
        <BackLink />
        <Alert tone="info">That module doesn’t exist.</Alert>
      </>
    )
  return (
    <>
      <BackLink />
      <span className="badge soon">
        <Lock /> In development
      </span>
      <h1>{m.title}</h1>
      <p className="sub text-[14px]! m-0!">{m.description}</p>
      {join.isSuccess ? (
        <div className="hint">
          <b>You’re on the list.</b> We’ll reach out when the pilot opens.
        </div>
      ) : (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            join.mutate()
          }}
        >
          <label className="field" htmlFor="pemail">
            Get early access
            <input id="pemail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </label>
          {join.error && <Alert tone="bad">{errorMessage(join.error)}</Alert>}
          <button className="btn" disabled={join.isPending}>
            Join the pilot
          </button>
          <p className="small m-0">We only use your email to tell you about this pilot.</p>
        </form>
      )}
      <h2>Also coming</h2>
      <div className="flex flex-col gap-2.5">
        {LOCKED.filter((x) => x.key !== m.key).map((x) => (
          <Link key={x.key} to={`/soon/${x.key}`} className="lock">
            <div className="ic">
              <Lock />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="name">{x.title}</span>
              <span className="small">{x.description.split('. ')[0]}.</span>
            </div>
            <span className="badge soon">Soon</span>
          </Link>
        ))}
      </div>
    </>
  )
}
