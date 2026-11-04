import { useMemo, useState } from 'react'
import { PriceIndexList, Ticker } from '@/components/PriceIndexList'
import { Chips, ErrorNote, Loading, PageTitle, SampleNote } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { usePriceIndex, useSellerProducts } from '@/lib/queries'
import { FAIR_NOTE } from '@/lib/prices'

/** Full Landed Price Index for sellers: my products or all products. */
export default function SellerPrices() {
  const { seller } = useAuth()
  const { summary, isLoading, error } = usePriceIndex()
  const mine = useSellerProducts(seller?.id)
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const all = useMemo(() => Object.values(summary ?? {}).sort((a, b) => a.product.sort - b.product.sort), [summary])
  const mineSet = new Set((mine.data ?? []).map((x) => x.product_id))
  const items = scope === 'all' ? all : all.filter((s) => mineSet.has(s.product.slug))
  const updated = all[0]?.date

  return (
    <>
      <PageTitle title="Landed Price Index" sub={`Southeast New Brunswick${updated ? ` · updated ${new Date(updated + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : ''}`} />
      {error ? <ErrorNote error={error} /> : null}
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Ticker items={all} />
          <Chips
            label="Which products"
            value={scope}
            onChange={setScope}
            options={[
              ['mine', 'My products'],
              ['all', 'All products'],
            ]}
          />
          <PriceIndexList items={items} base="/sell/prices" />
          {!items.length && <p className="sub">No prices for your products yet.</p>}
        </>
      )}
      <div className="card">
        <h3>How the index works</h3>
        <p className="small m-0">
          Each range is the middle 80% of real sales on Landed plus price reports from local buyers and sellers over the last 14 days (30 days when there are fewer
          than 6), worked out every night. Products with only a few points are marked “Limited data”. {FAIR_NOTE}
        </p>
      </div>
      <SampleNote>Sample prices until the pilot</SampleNote>
    </>
  )
}
