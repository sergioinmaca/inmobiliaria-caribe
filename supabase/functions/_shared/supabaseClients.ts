// Clientes de Supabase con semántica explícita.
//
// - `userClient`: actúa con la identidad del llamador. RLS aplica.
// - `adminClient`: usa service_role y BYPASSA RLS. Usar con mínimo privilegio.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { requireEnv } from './env.ts'

export function userClient(authHeader: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
  })
}

export function adminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
}
