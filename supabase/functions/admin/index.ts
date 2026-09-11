// Supabase Edge Function: gestión de usuarios (solo Master).
// Despliegue: Supabase → Edge Functions → New Function "admin".
// Secrets requeridos: SUPABASE_URL, SUPABASE_ANON_KEY (automáticos) y SUPABASE_SERVICE_ROLE_KEY.
// Acción: { action: 'inviteUser', email, fullName, role }

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
  const { email, fullName, role } = body as {
    email: string
    fullName: string
    role: string
  }
  if (!email || !fullName || !ALLOWED_ROLES.includes(role)) {
    return json({ error: 'datos inválidos' }, 400)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  })
  if (error) return json({ error: error.message }, 500)

  const userId = data.user.id
  await admin.from('profiles').update({ role, full_name: fullName }).eq('id', userId)

  return json({ ok: true })
})
