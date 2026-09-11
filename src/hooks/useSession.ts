import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function useSession() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function refresh(userId: string | undefined) {
      if (!userId) {
        if (active) {
          setProfile(null)
          setLoading(false)
        }
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (active) {
        setProfile((data as Profile) ?? null)
        setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => refresh(data.session?.user.id))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      refresh(session?.user.id)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { profile, loading, signOut }
}
