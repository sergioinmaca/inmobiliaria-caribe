import { Link } from 'react-router-dom'
import { formatPrice } from '../../lib/price'
import type { Property } from '../../types'

export function PropertyCard({ property }: { property: Property }) {
  const cover = property.images[0]?.url ?? '/brand/placeholder-property.svg'
  return (
    <Link
      to={`/inmueble/${property.id}`}
      className="flex h-44 overflow-hidden rounded-md border border-neutral-300 bg-white"
    >
      <img src={cover} alt={property.title} className="h-full w-2/5 object-cover" />
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <h3 className="text-h3 font-semibold text-neutral-900">{property.title}</h3>
          <p className="text-small text-neutral-500">
            {property.zone} · {property.type}
          </p>
        </div>
        <span className="text-body font-bold text-primary">{formatPrice(property)}</span>
      </div>
    </Link>
  )
}
