// Supabase Edge Function: integración con Google Drive (cuenta de servicio).
// Despliegue: Supabase → Edge Functions → New Function "drive" (o `supabase functions deploy drive`).
// Secrets requeridos: SUPABASE_URL, SUPABASE_ANON_KEY (automáticos) y
// DRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL, DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY (setear en Settings → Edge Functions → Secrets).
// Acciones: { action: 'createFolder', name } | { action: 'list', folderId } | { action: 'sync', folderId, propertyId }

import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignJWT } from 'npm:jose@5'

const ROOT_FOLDER = 'catalogo_inmuebles'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const clean = pem
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const binary = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('DRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL')!
  const privateKey = Deno.env.get('DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY')!
  const now = Math.floor(Date.now() / 1000)

  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/drive' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPrivateKey(privateKey))

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const data = await res.json()
  return data.access_token as string
}

async function getRootFolderId(token: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${ROOT_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  )
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const list = await listRes.json()
  if (list.files?.length) return list.files[0].id as string

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ROOT_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const created = await createRes.json()
  return created.id as string
}

async function listFiles(token: string, folderId: string) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1000`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json()
  return (data.files ?? []) as { id: string; name: string }[]
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
  const role = (profile as { role: string } | null)?.role
  if (role !== 'gerente' && role !== 'master') return json({ error: 'sin permisos' }, 403)

  const body = await req.json()
  const { action } = body as { action: string }
  const token = await getAccessToken()

  if (action === 'createFolder') {
    const name = String((body as { name: string }).name)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    const rootId = await getRootFolderId(token)
    const suffix = crypto.randomUUID().slice(0, 8)
    const folderName = `${name}-${suffix}`
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootId],
      }),
    })
    const created = await res.json()
    return json({ folderId: created.id as string, folderName })
  }

  if (action === 'list') {
    const folderId = String((body as { folderId: string }).folderId)
    const files = await listFiles(token, folderId)
    return json({ files })
  }

  if (action === 'sync') {
    const { folderId, propertyId } = body as { folderId: string; propertyId: string }
    const files = await listFiles(token, folderId)
    const images = files.map((f, i) => ({
      id: f.id,
      url: `https://drive.google.com/uc?export=view&id=${f.id}`,
      name: f.name,
      order: i,
    }))
    const { error } = await supabase
      .from('properties')
      .update({ images })
      .eq('id', propertyId)
    if (error) return json({ error: error.message }, 500)
    return json({ images })
  }

  return json({ error: 'acción desconocida' }, 400)
})
