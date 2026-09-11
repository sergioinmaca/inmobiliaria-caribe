// Supabase Edge Function: gestión de usuarios (solo Master).
// Despliegue: Supabase → Edge Functions → New Function "admin".
// Secrets requeridos: SUPABASE_URL, SUPABASE_ANON_KEY (automáticos) y SUPABASE_SERVICE_ROLE_KEY.
// Acción: { action: 'createUser', firstName, lastName, phone, email, password, role }

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = ['gerente', 'supervisor', 'invitado']

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'no autorizado' }, 401)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if ((profile as { role: string } | null)?.role !== 'master') {
    return json({ error: 'sin permisos' }, 403)
  }

  const body = await req.json()
  const { firstName, lastName, phone, email, password, role } = body as {
    firstName: string
    lastName: string
    phone?: string
    email: string
    password: string
    role: string
  }
  if (!firstName || !lastName || !email || !password) {
    return json({ error: 'faltan campos' }, 400)
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return json({ error: 'rol inválido' }, 400)
  }
  if (!email.endsWith('@inmaca.com')) {
    return json({ error: 'correo inválido' }, 400)
  }
  if (password.length < 6) {
    return json({ error: 'contraseña muy corta' }, 400)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return json({ error: error.message }, 400)

  const fullName = `${firstName} ${lastName}`.trim()
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: data.user.id,
      role,
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? null,
      full_name: fullName,
      email,
    })
  if (profileError) return json({ error: profileError.message }, 500)

  return json({ ok: true })
})
