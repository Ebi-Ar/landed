import { lazy, Suspense, useMemo, useState } from 'react'
import { PriceIndexList, Ticker } from '@/components/PriceIndexList'
import { Chips, ErrorNote, Loading, PageTitle, SampleNote } from '@/components/ui'
import { useLiveBatches, usePriceIndex } from '@/lib/queries'
import { FAIR_NOTE } from '@/lib/prices'

const MarketBoard = lazy(() => import('@/components/MarketBoard'))

type Filter = 'all' | 'sea' | 'land'
const SCOPE: Record<Filter, string> = { all: 'All foods', sea: 'From the sea', land: 'From the land' }

/** Buyer view of the Landed Price Index. */
export default function Prices() {
  const { summary, isLoading, error } = usePriceIndex()
  const batches = useLiveBatches()
  const [filter, setFilter] = useState<Filter>('all')
  const all = useMemo(() => Object.values(summary ?? {}).sort((a, b) => a.product.sort - b.product.sort), [summary])
  const items = useMemo(() => all.filter((s) => filter === 'all' || s.product.category === filter), [all, filter])
  const forSale = useMemo(() => {
    const m: Record<string, number> = {}
    for (const b of batches.data ?? []) m[b.product_id] = (m[b.product_id] ?? 0) + 1
    return m
  }, [batches.data])

  return (
    <>
      <PageTitle title="Today’s local prices" sub="What a fair price looks like in southeast New Brunswick right now, so you know what to expect before you buy." />
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Ticker items={all} />
          <Chips<Filter>
            label="Filter prices"
            value={filter}
            onChange={setFilter}
            options={[
              ['all', 'All'],
              ['sea', 'From the sea'],
              ['land', 'From the land'],
            ]}
          />
          {items.length > 0 && (
            <Suspense fallback={<div className="card h-[420px] animate-pulse" />}>
              <MarketBoard items={items} scope={SCOPE[filter]} />
            </Suspense>
          )}
          <h2 className="mt-2">Fair price ranges</h2>
          <PriceIndexList items={items} forSale={forSale} base="/prices" className="lg:grid lg:grid-cols-2" />
        </>
      )}
      <div className="card">
        <h3>Where these prices come from</h3>
        <p className="small m-0">
          Real sales on Landed plus price reports from local sellers and buyers. Each fair range is the middle 80% of prices from the last two weeks, worked out
          every night. Listings inside the range get a “Fair price” badge. {FAIR_NOTE}
        </p>
      </div>
      <SampleNote>Sample prices until the pilot</SampleNote>
    </>
  )
}
