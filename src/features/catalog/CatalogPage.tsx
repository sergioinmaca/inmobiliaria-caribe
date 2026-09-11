import { Filters } from '../../components/catalog/Filters'
import { Pagination } from '../../components/catalog/Pagination'
import { PropertyCard } from '../../components/catalog/PropertyCard'
import { useProperties, DEFAULT_FILTERS } from '../../hooks/useProperties'
import { ITEMS_PER_PAGE } from '../../lib/constants'

export function CatalogPage() {
  const { properties, total, page, setPage, loading, error, filters, setFilters, refetch } =
    useProperties()

  return (
    <div className="flex flex-col gap-6">
      <Filters value={filters} onChange={setFilters} />

      {loading ? (
        <div className="flex flex-col gap-3" data-testid="catalog-skeleton">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-body text-neutral-500">No se pudo cargar el catálogo.</p>
          <button
            type="button"
            onClick={refetch}
            className="rounded-sm bg-primary px-4 py-2 text-body font-medium text-white"
          >
            Reintentar
          </button>
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-body text-neutral-500">Sin resultados</p>
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="rounded-sm border border-neutral-300 px-4 py-2 text-body font-medium text-neutral-900"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}

      <Pagination total={total} page={page} perPage={ITEMS_PER_PAGE} onChange={setPage} />
    </div>
  )
}
