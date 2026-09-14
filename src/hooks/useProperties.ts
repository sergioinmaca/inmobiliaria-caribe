import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ITEMS_PER_PAGE } from '../lib/constants'
import type { Property, PropertyType } from '../types'

export interface PropertyFilters {
  tipo: PropertyType | 'all'
  parroquia: string
  minPrice: number | null
  maxPrice: number | null
}

export const DEFAULT_FILTERS: PropertyFilters = {
  tipo: 'all',
  parroquia: '',
  minPrice: null,
  maxPrice: null,
}

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
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters.tipo !== 'all') query = query.eq('tipo', filters.tipo)
    if (filters.parroquia) query = query.eq('parroquia', filters.parroquia)
    if (filters.minPrice != null) query = query.gte('price_usd', filters.minPrice)
    if (filters.maxPrice != null) query = query.lte('price_usd', filters.maxPrice)

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

  return { properties, total, page, setPage, loading, error, filters, setFilters, refetch: fetchProperties }
}
