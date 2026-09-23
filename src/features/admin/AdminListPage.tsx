import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { setDriveVisibility } from '../../lib/drive'
import { setPropertyActive } from '../../lib/propertiesApi'
import { MIN_IMAGES_TO_ACTIVATE } from '../../lib/constants'
import { coverImage } from '../../lib/images'
import { formatPrice } from '../../lib/price'
import { useSession } from '../../hooks/useSession'
import { DEFAULT_FILTERS, type PropertyFilters } from '../../hooks/useProperties'
import { Filters } from '../../components/catalog/Filters'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Property } from '../../types'

type EstadoFilter = 'all' | 'active' | 'inactive'

export function AdminListPage() {
  const { profile } = useSession()
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS)
  const [estado, setEstado] = useState<EstadoFilter>('all')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [rate, setRate] = useState('')
  const [rateMessage, setRateMessage] = useState<string | null>(null)

  const canEdit = ['master', 'gerente', 'supervisor'].includes(profile?.role ?? '')
  const canCreate = ['master', 'gerente'].includes(profile?.role ?? '')
  const canManageRate = profile?.role === 'master'

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('propiedades')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setProperties((data as Property[]) ?? [])
    setLoading(false)
  }, [])

  const loadRate = useCallback(async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'usd_to_bs_rate')
      .single()
    if (data) setRate((data as { value: string }).value)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (canManageRate) loadRate()
  }, [canManageRate, loadRate])

  const saveRate = async () => {
    setRateMessage(null)
    const { error } = await supabase
      .from('settings')
      .update({ value: rate })
      .eq('key', 'usd_to_bs_rate')
    if (error) {
      setRateMessage('Error al guardar la tasa.')
      return
    }
    setRateMessage('Tasa guardada.')
  }

  const filtered = properties.filter((p) => {
    const term = search.toLowerCase()
    const matchesSearch =
      p.titulo.toLowerCase().includes(term) || p.parroquia.toLowerCase().includes(term)
    const matchesTipo = filters.tipo === 'all' || p.tipo === filters.tipo
    const matchesParroquia = !filters.parroquia || p.parroquia === filters.parroquia
    const matchesMin = filters.minPrice == null || (p.price_usd ?? -Infinity) >= filters.minPrice
    const matchesMax = filters.maxPrice == null || (p.price_usd ?? Infinity) <= filters.maxPrice
    const matchesEstado =
      estado === 'all' || (estado === 'active' ? p.is_active : !p.is_active)
    return matchesSearch && matchesTipo && matchesParroquia && matchesMin && matchesMax && matchesEstado
  })

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setEstado('all')
    setSearch('')
  }

  const toggleActive = async (property: Property) => {
    if (!property.is_active) {
      if (property.images.length < MIN_IMAGES_TO_ACTIVATE) {
        setMessage(
          `No se puede activar: se necesita al menos ${MIN_IMAGES_TO_ACTIVATE} imagen${MIN_IMAGES_TO_ACTIVATE === 1 ? '' : 'es'}.`,
        )
        return
      }
      if (!property.titulo.trim() || !property.parroquia.trim()) {
        setMessage('No se puede activar: faltan campos obligatorios.')
        return
      }
    } else if (!window.confirm('¿Desactivar la publicación de este inmueble?')) {
      return
    }

    const { error } = await setPropertyActive(property.id, !property.is_active)
    if (error) {
      setMessage(error)
      return
    }
    setMessage(null)
    void setDriveVisibility(property.id, property.drive_folder_id, !property.is_active)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 font-bold text-primary">Gestión de Inmuebles</h1>

        {canCreate && (
          <Link
            to="/admin/inmueble"
            className="inline-flex w-full items-center justify-center rounded-sm bg-primary px-4 py-2 text-body font-medium text-white lg:hidden"
          >
            Nuevo inmueble
          </Link>
        )}

        <div className="flex flex-wrap items-end gap-3">
          {canManageRate && (
            <div className="w-40">
              <Input
                id="rate"
                label="Tasa Bs → $"
                type="number"
                inputMode="decimal"
                step="any"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          )}
          {canManageRate && (
            <Button size="sm" onClick={saveRate}>
              Guardar
            </Button>
          )}
          {canCreate && (
            <Link
              to="/admin/inmueble"
              className="hidden items-center justify-center rounded-sm bg-primary px-4 py-2 text-body font-medium text-white lg:inline-flex"
            >
              Nuevo inmueble
            </Link>
          )}
        </div>
      </div>

      {rateMessage && <p className="text-small text-neutral-500">{rateMessage}</p>}

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <Filters value={filters} onChange={setFilters}>
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-estado" className="text-small font-medium text-neutral-900">
              Estado
            </label>
            <select
              id="filter-estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoFilter)}
              className="rounded-sm border border-neutral-300 px-2 py-2 text-body"
            >
              <option value="all">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </Filters>

        <div className="flex flex-col gap-4">
          <input
            type="search"
            placeholder="Buscar por título o parroquia"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md rounded-sm border border-neutral-300 px-3 py-2 text-body"
          />

          {message && <p className="text-small text-danger">{message}</p>}

          {loading ? (
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              data-testid="admin-skeleton"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-md bg-surface" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-body text-neutral-500">Sin resultados</p>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-sm border border-neutral-300 px-4 py-2 text-body font-medium text-neutral-900"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <ul className="relative left-1/2 flex w-screen -translate-x-1/2 flex-col border-t border-neutral-300 md:hidden">
                {filtered.map((p) => (
                  <li key={p.id} className="border-b border-neutral-300 bg-white px-4 pt-2">
                    <div className="flex h-44">
                      <Link
                        to={`/admin/inmueble/${p.id}`}
                        className="relative block h-full w-2/5 shrink-0"
                      >
                        <img
                          src={coverImage(p.images)?.url ?? '/brand/placeholder-property.svg'}
                          alt={p.titulo}
                          className="h-full w-full object-cover"
                        />
                        <Badge
                          variant={p.is_active ? 'success' : 'default'}
                          className="absolute left-2 top-2"
                        >
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </Link>
                      <div className="flex flex-1 flex-col justify-between p-3">
                        <div>
                          <h3 className="text-h3 font-semibold text-neutral-900">{p.titulo}</h3>
                          <p className="text-small text-neutral-500">
                            {p.parroquia} · {p.tipo}
                          </p>
                        </div>
                        <span className="text-body font-bold text-primary">{formatPrice(p)}</span>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="-mx-4 flex items-center justify-center gap-3 bg-accent px-4 py-2">
                        <Link
                          to={`/admin/inmueble/${p.id}`}
                          className="inline-flex items-center justify-center rounded-sm bg-white px-3 py-1 text-body font-medium text-primary"
                        >
                          Editar
                        </Link>
                        <Button
                          variant={p.is_active ? 'danger' : 'success'}
                          size="sm"
                          onClick={() => toggleActive(p)}
                        >
                          {p.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              <ul className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col overflow-hidden rounded-md border border-neutral-300 bg-white"
                  >
                    <Link to={`/admin/inmueble/${p.id}`} className="relative block">
                      <img
                        src={coverImage(p.images)?.url ?? '/brand/placeholder-property.svg'}
                        alt={p.titulo}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <Badge
                        variant={p.is_active ? 'success' : 'default'}
                        className="absolute left-2 top-2"
                      >
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </Link>
                    <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                      <div>
                        <h3 className="line-clamp-2 text-h3 font-semibold text-neutral-900">{p.titulo}</h3>
                        <p className="text-small text-neutral-500">
                          {p.parroquia} · {p.tipo}
                        </p>
                      </div>
                      <span className="text-body font-bold text-primary">{formatPrice(p)}</span>
                    </div>

                    {canEdit && (
                      <div className="flex items-center justify-center gap-3 bg-accent px-3 py-2">
                        <Link
                          to={`/admin/inmueble/${p.id}`}
                          className="inline-flex items-center justify-center rounded-sm bg-white px-3 py-1 text-body font-medium text-primary"
                        >
                          Editar
                        </Link>
                        <Button variant={p.is_active ? 'danger' : 'success'} size="sm" onClick={() => toggleActive(p)}>
                          {p.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
