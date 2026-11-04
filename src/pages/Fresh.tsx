import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { BatchCard } from '@/components/BatchCard'
import { LocationPicker } from '@/components/LocationPicker'
import { Chips, ErrorNote, Loading, PageTitle, SampleNote } from '@/components/ui'
import { useBuyerLocation } from '@/lib/location'
import { useCatalog, useLiveBatches, usePriceIndex } from '@/lib/queries'

type Filter = 'all' | 'open' | 'sea' | 'land'

export default function Fresh() {
  const cat = useCatalog()
  const batches = useLiveBatches()
  const { summary } = usePriceIndex()
  const loc = useBuyerLocation()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const q = params.get('q') ?? ''

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (batches.data ?? [])
      .map((b) => {
        const s = cat.sellerById[b.seller_id]
        const p = cat.productBySlug[b.product_id]
        return { b, s, p, d: s ? loc.distanceTo(s) : null }
      })
      .filter(({ s, p }) => {
        if (!p) return false
        if (filter === 'sea' && p.category !== 'sea') return false
        if (filter === 'land' && p.category !== 'land') return false
        if (filter === 'open' && !s?.available_now) return false
        if (!needle) return true
        return [p.name, p.short_name, s?.display_name, s?.place_name, s?.area_label].join(' ').toLowerCase().includes(needle)
      })
      .sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9))
  }, [batches.data, cat.sellerById, cat.productBySlug, filter, q, loc])

  return (
    <>
      <PageTitle title="Fresh near you" sub="Straight from local fishers and farms, closest first." />
      <LocationPicker />
      <label className="search">
        <Search />
        <input
          type="search"
          placeholder="Lobster, potatoes, honey…"
          value={q}
          aria-label="Search"
          onChange={(e) => {
            const next = new URLSearchParams(params)
            if (e.target.value) next.set('q', e.target.value)
            else next.delete('q')
            setParams(next, { replace: true })
          }}
        />
      </label>
      <Chips<Filter>
        label="Filter listings"
        value={filter}
        onChange={setFilter}
        options={[
          ['all', 'All'],
          ['open', 'Here now'],
          ['sea', 'From the sea'],
          ['land', 'From the land'],
        ]}
      />
      {batches.error ? <ErrorNote error={batches.error} /> : null}
      {batches.isLoading || cat.isLoading ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map(({ b, s, p, d }) => (
            <BatchCard key={b.id} batch={b} product={p!} seller={s} distance={d} price={summary?.[b.product_id]} />
          ))}
          {!items.length && <p className="sub">Nothing matches that yet. Try another search.</p>}
        </div>
      )}
      <SampleNote>Sample listings until the pilot</SampleNote>
    </>
  )
}
