import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './auth'
import { supabase } from './supabase'
import type { SellerLocation } from './types'

type PinPatch = Partial<Pick<SellerLocation, 'available_now' | 'show_phone' | 'hours_text' | 'place_name' | 'area_label'>>

/** Seller switches (Available now, Show my phone number). RLS limits this to the seller's own pin. */
export function useUpdatePin() {
  const { seller, refreshMe } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: PinPatch) => {
      const body: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
      if (patch.available_now !== undefined) body.available_since = patch.available_now ? new Date().toISOString() : null
      const { error } = await supabase.from('seller_locations').update(body).eq('seller_id', seller!.id)
      if (error) throw error
    },
    onSettled: () => {
      refreshMe()
      qc.invalidateQueries({ queryKey: ['directory'] })
      qc.invalidateQueries({ queryKey: ['seller', 'pins'] })
    },
  })
}
