import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LayoutDashboard, LogOut, Store } from 'lucide-react'
import { Alert, PageTitle } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { errorMessage, supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'

export default function Account() {
  const auth = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  useEffect(() => {
    setName(auth.profile?.full_name ?? '')
    setPhone(auth.profile?.phone ?? '')
  }, [auth.profile])
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: phone.trim() || null }).eq('id', auth.userId!)
      if (error) throw error
    },
    onSuccess: () => {
      auth.refreshMe()
      toast('Saved')
    },
  })
  return (
    <>
      <PageTitle title="Your account" sub={auth.email ?? ''} />
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <label className="field">
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="field">
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="(506) 555-0100" />
        </label>
        <p className="small m-0">Sellers see your first name and last initial on orders. Your phone is shown to buyers only if you sell and turn “Show my phone number” on.</p>
        {save.error && <Alert tone="bad">{errorMessage(save.error)}</Alert>}
        <button className="btn" disabled={save.isPending}>
          Save
        </button>
      </form>
      {auth.isSeller ? (
        <Link className="btn alt" to="/sell">
          <Store /> Go to Selling
        </Link>
      ) : (
        <Link className="btn alt" to="/sell/join">
          <Store /> Sell on Landed
        </Link>
      )}
      {auth.isAdmin && (
        <Link className="btn alt" to="/admin">
          <LayoutDashboard /> Admin
        </Link>
      )}
      <button
        className="btn alt"
        onClick={async () => {
          await auth.signOut()
          navigate('/')
        }}
      >
        <LogOut /> Sign out
      </button>
    </>
  )
}
