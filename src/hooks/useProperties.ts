import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ITEMS_PER_PAGE } from '../lib/constants'
import type { Property } from '../types'

export interface PropertyFilters {
  tipoId: string
  estadoId: string
  municipioId: string
  parroquiaId: string
  minPrice: number | null
  maxPrice: number | null
  minHabitaciones: number | null
  minBanos: number | null
}

export const DEFAULT_FILTERS: PropertyFilters = {
  tipoId: '',
  estadoId: '',
  municipioId: '',
  parroquiaId: '',
  minPrice: null,
  maxPrice: null,
  minHabitaciones: null,
  minBanos: null,
}

/** Columnas + relación del tipo para mostrar su nombre en las tarjetas. */
export const PROPERTY_SELECT = '*, tipo:tipos_inmueble(nombre)'

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS)

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setError(null)
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = supabase
      .from('propiedades')
      .select(PROPERTY_SELECT, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters.tipoId) query = query.eq('tipo_id', filters.tipoId)
    if (filters.parroquiaId) query = query.eq('parroquia_id', filters.parroquiaId)
    else if (filters.municipioId) query = query.eq('municipio_id', filters.municipioId)
    else if (filters.estadoId) query = query.eq('estado_id', filters.estadoId)
    if (filters.minPrice != null) query = query.gte('price_usd', filters.minPrice)
    if (filters.maxPrice != null) query = query.lte('price_usd', filters.maxPrice)
    if (filters.minHabitaciones != null) query = query.gte('habitaciones', filters.minHabitaciones)
    if (filters.minBanos != null) query = query.gte('banos', filters.minBanos)

    const { data, count, error: err } = await query

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setProperties((data as Property[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, filters])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  return {
    properties,
    total,
    page,
    setPage,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchProperties,
  }
}
