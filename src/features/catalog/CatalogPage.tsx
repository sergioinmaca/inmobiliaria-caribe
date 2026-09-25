import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filters } from '../../components/catalog/Filters'
import { Pagination } from '../../components/catalog/Pagination'
import { PropertyCard } from '../../components/catalog/PropertyCard'
import { useProperties, DEFAULT_FILTERS } from '../../hooks/useProperties'
import { useTiposInmueble } from '../../hooks/useTiposInmueble'
import { useTerritorio } from '../../hooks/useTerritorio'
import { ITEMS_PER_PAGE } from '../../lib/constants'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tipoParam = searchParams.get('tipo') ?? ''
  const { properties, total, page, setPage, loading, error, filters, setFilters, refetch } =
    useProperties(tipoParam)
  const { tipos } = useTiposInmueble()
  const { estados } = useTerritorio()

  useEffect(() => {
    const current = searchParams.get('tipo') ?? ''
    if (filters.tipoId === current) return
    const next = new URLSearchParams(searchParams)
    if (filters.tipoId) next.set('tipo', filters.tipoId)
    else next.delete('tipo')
    setSearchParams(next, { replace: true })
  }, [filters.tipoId, searchParams, setSearchParams])

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <Filters value={filters} onChange={setFilters} tipos={tipos} estados={estados} />

      <div className="flex flex-col gap-6">
        {loading ? (
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            data-testid="catalog-skeleton"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-md bg-surface" />
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}

        <Pagination total={total} page={page} perPage={ITEMS_PER_PAGE} onChange={setPage} />
      </div>
    </div>
  )
}
