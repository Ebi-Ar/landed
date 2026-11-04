import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { summarize } from './prices'
import type {
  Batch, Credential, DirectorySeller, IndexRow, Market, Order, Product, SeasonPlan, SellerLocation,
} from './types'

const LIVE_REFRESH = 30_000

async function rows<T>(q: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const { data, error } = await q
  if (error) throw error
  return data as T
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => rows<Product[]>(supabase.from('products').select('*').order('sort')),
    staleTime: 10 * 60_000,
  })
}

export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: () => rows<Market[]>(supabase.from('markets').select('*').order('name')),
    staleTime: 10 * 60_000,
  })
}

export function useDirectory() {
  return useQuery({
    queryKey: ['directory'],
    queryFn: () => rows<DirectorySeller[]>(supabase.from('seller_directory').select('*')),
    refetchInterval: LIVE_REFRESH,
  })
}

export function useLiveBatches() {
  return useQuery({
    queryKey: ['batches', 'live'],
    queryFn: () => rows<Batch[]>(supabase.from('batches').select('*').eq('status', 'live').order('created_at', { ascending: false })),
    refetchInterval: LIVE_REFRESH,
  })
}

export function useBatch(id: string | undefined) {
  return useQuery({
    queryKey: ['batch', id],
    queryFn: () => rows<Batch | null>(supabase.from('batches').select('*').eq('id', id!).maybeSingle()),
    enabled: Boolean(id),
  })
}

export function usePriceIndex() {
  const products = useProducts()
  const index = useQuery({
    queryKey: ['index'],
    queryFn: () => {
      const since = new Date(Date.now() - 32 * 86400000).toISOString().slice(0, 10)
      return rows<IndexRow[]>(
        supabase.from('price_index_daily').select('*').eq('region', 'se-nb').gte('date', since).order('date'),
      )
    },
    staleTime: 5 * 60_000,
  })
  const summary = useMemo(
    () => (index.data && products.data ? summarize(index.data, products.data) : undefined),
    [index.data, products.data],
  )
  return { summary, isLoading: index.isLoading || products.isLoading, error: index.error ?? products.error }
}

export type OrderWithProduct = Order & { batches: { product_id: string } | null }

export function useBuyerOrders(userId: string | null) {
  return useQuery({
    queryKey: ['orders', 'buyer', userId],
    queryFn: () =>
      rows<OrderWithProduct[]>(
        supabase.from('orders').select('*, batches(product_id)').eq('buyer_id', userId!).order('created_at', { ascending: false }),
      ),
    enabled: Boolean(userId),
    refetchInterval: LIVE_REFRESH,
  })
}

export function useSellerOrders(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'seller', sellerId],
    queryFn: () =>
      rows<OrderWithProduct[]>(
        supabase.from('orders').select('*, batches(product_id)').eq('seller_id', sellerId!).order('created_at', { ascending: false }),
      ),
    enabled: Boolean(sellerId),
    refetchInterval: LIVE_REFRESH,
  })
}

export function useSellerBatches(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller', 'batches', sellerId],
    queryFn: () =>
      rows<Batch[]>(supabase.from('batches').select('*').eq('seller_id', sellerId!).order('created_at', { ascending: false })),
    enabled: Boolean(sellerId),
  })
}

export function useBlankLabelCount(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller', 'labels', sellerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('labels')
        .select('code', { count: 'exact', head: true })
        .eq('seller_id', sellerId!)
        .eq('status', 'blank')
        .is('batch_id', null)
      if (error) throw error
      return count ?? 0
    },
    enabled: Boolean(sellerId),
  })
}

export function useSellerProducts(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller', 'products', sellerId],
    queryFn: () =>
      rows<Array<{ product_id: string; approved: boolean }>>(
        supabase.from('seller_products').select('product_id, approved').eq('seller_id', sellerId!),
      ),
    enabled: Boolean(sellerId),
  })
}

export function useCredentials(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller', 'credentials', sellerId],
    queryFn: () => rows<Credential[]>(supabase.from('seller_credentials').select('*').eq('seller_id', sellerId!).order('created_at')),
    enabled: Boolean(sellerId),
  })
}

export function useSeasonPlans(sellerId: string | undefined) {
  return useQuery({
    queryKey: ['seller', 'plans', sellerId],
    queryFn: () => rows<SeasonPlan[]>(supabase.from('season_plans').select('*').eq('seller_id', sellerId!).order('year', { ascending: false })),
    enabled: Boolean(sellerId),
  })
}

export interface MyPins {
  active: SellerLocation | null
  saved: Array<Omit<SellerLocation, 'seller_id' | 'show_phone' | 'available_now' | 'available_since'>>
}

export function useMyPins(enabled: boolean) {
  return useQuery({
    queryKey: ['seller', 'pins'],
    queryFn: () => rows<MyPins>(supabase.rpc('my_pins')),
    enabled,
  })
}

/** Products, markets and sellers keyed for quick lookups. */
export function useCatalog() {
  const products = useProducts()
  const markets = useMarkets()
  const directory = useDirectory()
  return useMemo(
    () => ({
      products: products.data ?? [],
      productBySlug: Object.fromEntries((products.data ?? []).map((p) => [p.slug, p])) as Record<string, Product>,
      markets: markets.data ?? [],
      marketById: Object.fromEntries((markets.data ?? []).map((m) => [m.id, m])) as Record<string, Market>,
      sellers: directory.data ?? [],
      sellerById: Object.fromEntries((directory.data ?? []).map((s) => [s.seller_id, s])) as Record<string, DirectorySeller>,
      isLoading: products.isLoading || markets.isLoading || directory.isLoading,
      error: products.error ?? markets.error ?? directory.error,
    }),
    [products.data, markets.data, directory.data, products.isLoading, markets.isLoading, directory.isLoading, products.error, markets.error, directory.error],
  )
}
