import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isConfigured, supabase } from './supabase'
import { useAuth } from './auth'

/**
 * Listens for changes to pins, batches and orders and refreshes whatever is on
 * screen, so a seller's "Available now" switch or a new batch shows up on every
 * buyer's phone within seconds. Row-level security still decides who gets what.
 * Queries also refresh every 30 s, in case the live connection drops.
 */
export function RealtimeBridge() {
  const qc = useQueryClient()
  const { userId } = useAuth()

  useEffect(() => {
    if (!isConfigured) return
    const channel = supabase
      .channel('landed-live-' + (userId ?? 'anon'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_locations' }, () => {
        qc.invalidateQueries({ queryKey: ['directory'] })
        qc.invalidateQueries({ queryKey: ['me'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
        qc.invalidateQueries({ queryKey: ['batches'] })
        qc.invalidateQueries({ queryKey: ['batch'] })
        qc.invalidateQueries({ queryKey: ['seller', 'batches'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ['orders'] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc, userId])

  return null
}
