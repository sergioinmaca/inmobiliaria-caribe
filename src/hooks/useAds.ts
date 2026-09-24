import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Ad } from '../types/ads'

export function useAds() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setAds((data as Ad[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { ads, loading, error, refetch: load }
}
