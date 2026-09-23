// Supabase Edge Function: gestión de usuarios (solo Master).
// Despliegue: supabase functions deploy admin --use-api
// Secrets requeridos: SUPABASE_URL, SUPABASE_ANON_KEY (automáticos) y SUPABASE_SERVICE_ROLE_KEY.
// Acción: { action: 'createUser', firstName, lastName, phone, email, password, role }

import { serve } from '../_shared/handler.ts'
import { authenticate, requireRole } from '../_shared/auth.ts'
import { ApiError, json } from '../_shared/http.ts'
import { requireFields } from '../_shared/validation.ts'
import { adminClient } from '../_shared/supabaseClients.ts'

const ALLOWED_ROLES = ['gerente', 'supervisor', 'invitado']

interface CreateUserBody {
  action: string
  firstName: string
  lastName: string
  phone?: string | null
  email: string
  password: string
  role: string
}

serve(async (req) => {
  const ctx = await authenticate(req)
  requireRole(ctx, 'master')

  const body = (await req.json()) as CreateUserBody
  if (body.action !== 'createUser') throw new ApiError(400, 'acción desconocida')

  requireFields(body, ['firstName', 'lastName', 'email', 'password'])
  const { firstName, lastName, phone, email, password, role } = body

  if (!ALLOWED_ROLES.includes(role)) throw new ApiError(400, 'rol inválido')
  if (!email.endsWith('@inmaca.com')) throw new ApiError(400, 'correo inválido')
  if (password.length < 6) throw new ApiError(400, 'contraseña muy corta')

  const admin = adminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new ApiError(400, error.message)

  const fullName = `${firstName} ${lastName}`.trim()
  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    role,
    first_name: firstName,
    last_name: lastName,
    phone: phone ?? null,
    full_name: fullName,
    email,
  })
  if (profileError) throw new ApiError(500, profileError.message)

  return json({ ok: true })
})
