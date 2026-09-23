import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TipoInmueble } from '../types'

export function useTiposInmueble(includeInactive = false) {
  const [tipos, setTipos] = useState<TipoInmueble[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    let query = supabase
      .from('tipos_inmueble')
      .select('*')
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
    if (!includeInactive) query = query.eq('is_active', true)

    const { data } = await query
    setTipos((data as TipoInmueble[]) ?? [])
    setLoading(false)
  }, [includeInactive])

  useEffect(() => {
    void load()
  }, [load])

  return { tipos, loading, refetch: load }
}
