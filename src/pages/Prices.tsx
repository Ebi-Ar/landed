import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PriceIndexList, Ticker } from '@/components/PriceIndexList'
import { Chips, ErrorNote, Loading, PageTitle, SampleNote } from '@/components/ui'
import type { BoardRange } from '@/lib/board'
import { byFoodGroup, FOOD_GROUPS, foodGroupName } from '@/lib/format'
import { useLiveBatches, usePriceIndex } from '@/lib/queries'
import { FAIR_NOTE } from '@/lib/prices'
import type { FoodGroup } from '@/lib/types'

const MarketBoard = lazy(() => import('@/components/MarketBoard'))

type Filter = 'all' | FoodGroup
const isFilter = (v: string | null): v is Filter => v === 'all' || FOOD_GROUPS.some(([g]) => g === v)

/** Buyer view of the Landed Price Index. */
export default function Prices() {
  const { summary, isLoading, error } = usePriceIndex()
  const batches = useLiveBatches()
  // The food group lives in the URL, so coming back from a food keeps it.
  const [params, setParams] = useSearchParams()
  const g = params.get('group')
  const filter: Filter = isFilter(g) ? g : 'all'
  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(params)
    if (f === 'all') next.delete('group')
    else next.set('group', f)
    setParams(next, { replace: true })
  }
  const [range, setRange] = useState<BoardRange>('2w')
  const all = useMemo(() => Object.values(summary ?? {}).sort((a, b) => a.product.sort - b.product.sort), [summary])
  const items = useMemo(() => all.filter((s) => filter === 'all' || s.product.food_group === filter), [all, filter])
  const sections = useMemo(() => byFoodGroup(items, (s) => s.product.food_group), [items])
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
            options={[['all', 'All'], ...FOOD_GROUPS]}
          />
          {items.length > 0 && (
            <Suspense fallback={<div className="card h-[420px] animate-pulse" />}>
              {/* A new group starts with its own biggest movers picked. */}
              <MarketBoard key={filter} items={items} scope={filter === 'all' ? 'All foods' : foodGroupName(filter)} range={range} onRange={setRange} />
            </Suspense>
          )}
          <h2 className="mt-2">Fair price ranges</h2>
          {sections.map((sec) => (
            <section key={sec.group} className="flex flex-col gap-2" aria-label={sec.name}>
              {filter === 'all' && (
                <h3 className="group-head">
                  {sec.name} <span className="small">{sec.items.length}</span>
                </h3>
              )}
              <PriceIndexList items={sec.items} forSale={forSale} base="/prices" className="lg:grid lg:grid-cols-2" />
            </section>
          ))}
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
