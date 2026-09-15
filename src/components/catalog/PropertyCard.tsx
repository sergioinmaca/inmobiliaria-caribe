import { Link } from 'react-router-dom'
import { formatPrice } from '../../lib/price'
import { coverImage } from '../../lib/images'
import type { Property } from '../../types'

export function PropertyCard({ property }: { property: Property }) {
  const cover = coverImage(property.images)?.url ?? '/brand/placeholder-property.svg'
  return (
    <Link
      to={`/inmueble/${property.id}`}
      className="flex h-44 overflow-hidden rounded-md border border-neutral-300 bg-white transition-shadow hover:shadow-md md:h-auto md:flex-col"
    >
      <img
        src={cover}
        alt={property.titulo}
        className="h-full w-2/5 shrink-0 object-cover md:aspect-[4/3] md:h-auto md:w-full"
      />
      <div className="flex flex-1 flex-col justify-between gap-2 p-3 md:flex-none">
        <div>
          <h3 className="line-clamp-2 text-h3 font-semibold text-neutral-900">{property.titulo}</h3>
          <p className="text-small text-neutral-500">
            {property.parroquia} · {property.tipo}
          </p>
        </div>
        <span className="text-body font-bold text-primary">{formatPrice(property)}</span>
      </div>
    </Link>
  )
}
