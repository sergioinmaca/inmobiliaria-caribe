// Autenticación y autorización por rol.

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { ApiError } from './http.ts'
import { userClient } from './supabaseClients.ts'
import type { Role } from './types.ts'

export interface AuthContext {
  user: User
  role: Role
  /** Cliente con el JWT del usuario: respeta RLS. */
  client: SupabaseClient
}

/**
 * Valida el JWT y resuelve el rol real desde `profiles` (fuente de verdad).
 * Lanza ApiError(401) si no hay sesión válida y ApiError(403) si no hay perfil.
 */
export async function authenticate(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) throw new ApiError(401, 'no autorizado')

  const client = userClient(authHeader)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new ApiError(401, 'no autorizado')

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role: Role } | null)?.role
  if (!role) throw new ApiError(403, 'sin permisos')

  return { user, role, client }
}

/** Exige que el rol esté dentro de los permitidos. */
export function requireRole(ctx: AuthContext, ...allowed: Role[]): void {
  if (!allowed.includes(ctx.role)) throw new ApiError(403, 'sin permisos')
}
