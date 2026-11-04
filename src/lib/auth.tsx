import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './supabase'
import type { Profile, Seller, SellerLocation } from './types'

interface Me {
  profile: Profile | null
  seller: Seller | null
  location: SellerLocation | null
}

interface AuthState {
  ready: boolean
  session: Session | null
  userId: string | null
  email: string | null
  profile: Profile | null
  seller: Seller | null
  location: SellerLocation | null
  isAdmin: boolean
  isSeller: boolean
  isApprovedSeller: boolean
  meLoading: boolean
  refreshMe: () => Promise<unknown>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ needsConfirm: boolean }>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

async function loadMe(userId: string): Promise<Me> {
  const [p, s] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone, is_seller, is_admin, is_sample').eq('id', userId).maybeSingle(),
    supabase.from('sellers').select('*').eq('profile_id', userId).maybeSingle(),
  ])
  if (p.error) throw p.error
  if (s.error) throw s.error
  let location: SellerLocation | null = null
  if (s.data) {
    const l = await supabase.from('seller_locations').select('*').eq('seller_id', s.data.id).maybeSingle()
    if (l.error) throw l.error
    location = l.data as SellerLocation | null
  }
  return { profile: p.data as Profile | null, seller: s.data as Seller | null, location }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isConfigured)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null
  const me = useQuery({
    queryKey: ['me', userId],
    queryFn: () => loadMe(userId!),
    enabled: Boolean(userId),
    staleTime: 15_000,
  })

  const value = useMemo<AuthState>(() => {
    const profile = me.data?.profile ?? null
    const seller = me.data?.seller ?? null
    return {
      ready,
      session,
      userId,
      email: session?.user.email ?? null,
      profile,
      seller,
      location: me.data?.location ?? null,
      isAdmin: Boolean(profile?.is_admin),
      isSeller: Boolean(seller),
      isApprovedSeller: seller?.status === 'approved',
      meLoading: Boolean(userId) && me.isLoading,
      refreshMe: () => me.refetch(),
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That email and password don’t match.' : error.message)
      },
      async signUp(email, password, fullName, phone) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), phone: phone.trim() }, emailRedirectTo: window.location.origin + '/signin' },
        })
        if (error) throw error
        return { needsConfirm: !data.session }
      },
      async signOut() {
        await supabase.auth.signOut()
        qc.removeQueries({ queryKey: ['me'] })
        qc.removeQueries({ queryKey: ['orders'] })
        qc.removeQueries({ queryKey: ['seller'] })
        qc.removeQueries({ queryKey: ['admin'] })
      },
    }
  }, [ready, session, userId, me, qc])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
