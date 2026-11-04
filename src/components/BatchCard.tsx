import { Link } from 'react-router-dom'
import { ProductTile } from './ProductIcon'
import { FairBadge } from './FairBadge'
import { ageText, isFresh, kmText, money, pinKind, pinWord } from '@/lib/format'
import { photoUrl } from '@/lib/supabase'
import type { PriceSummary } from '@/lib/prices'
import type { Batch, DirectorySeller, Product } from '@/lib/types'

/** One live batch in a list: product, price, seller, distance, age, fair-price badge, "Here now". */
export function BatchCard({
  batch,
  product,
  seller,
  distance,
  price,
}: {
  batch: Batch
  product: Product
  seller: DirectorySeller | undefined
  distance: number | null
  price: PriceSummary | undefined
}) {
  const age = ageText(product.harvest_verb, batch.caught_or_harvested_at, batch.when_text)
  const fresh = !batch.when_text && isFresh(product, batch.caught_or_harvested_at)
  return (
    <Link to={`/b/${batch.id}`} className="item">
      <ProductTile icon={product.icon} category={product.category} photo={photoUrl(batch.photo_path)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <span className="name">{product.short_name}</span>
          <span className="price">
            {money(batch.price)}
            <small>/{product.unit}</small>
          </span>
        </div>
        <span className="small">
          {seller ? `${seller.display_name} · ${pinWord(pinKind(seller))}` : 'Local seller'}
          {distance != null ? ` · ${kmText(distance)}` : ''}
        </span>
        <div className="mt-1 flex flex-wrap gap-[5px]">
          {fresh ? <span className="badge fresh">{age}</span> : <span className="small">{age}</span>}
          <FairBadge price={Number(batch.price)} summary={price} />
          {seller?.available_now && <span className="badge tide">Here now</span>}
        </div>
      </div>
    </Link>
  )
}
