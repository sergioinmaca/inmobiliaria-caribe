// Supabase Edge Function: integración con Google Drive vía Google Apps Script.
// Despliegue (dashboard): Edge Functions → New Function "drive" → pegar este código.
// Secrets requeridos: SUPABASE_URL, SUPABASE_ANON_KEY (automáticos), APPS_SCRIPT_URL, APPS_SCRIPT_SECRET.
// Acciones: { action: 'createFolder', name } | { action: 'list', folderId }
//         | { action: 'sync', propertyId, folderId? } | { action: 'setVisibility', propertyId, folderId? }

import { createClient } from 'npm:@supabase/supabase-js@2'

interface ImageRecord {
  id: string
  name: string
  url: string
  order: number
}

interface IncomingFile {
  id: string
  name: string
  url: string
}

function mergeImages(existing: ImageRecord[], incoming: IncomingFile[]): ImageRecord[] {
  const byId = new Map(existing.map((img) => [img.id, img]))
  let nextOrder = existing.reduce((max, img) => Math.max(max, img.order), -1) + 1
  const merged = incoming.map((f) => {
    const prev = byId.get(f.id)
    return prev
      ? { id: f.id, name: f.name, url: f.url, order: prev.order }
      : { id: f.id, name: f.name, url: f.url, order: nextOrder++ }
  })
  return merged.sort((a, b) => a.order - b.order).map((img, i) => ({ ...img, order: i }))
}

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

async function callScript(payload: Record<string, unknown>) {
  const url = Deno.env.get('APPS_SCRIPT_URL')
  const secret = Deno.env.get('APPS_SCRIPT_SECRET')
  if (!url || !secret) return { error: 'faltan secrets de Apps Script' }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, secret }),
  })
  const data = await res.json()
  if (data?.error) return { error: String(data.error) }
  return data
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

  const body = (await req.json()) as {
    action: string
    name?: string
    folderId?: string
    fileId?: string
    propertyId?: string
    mimeType?: string
    data?: string
    isActive?: boolean
  }

  if (body.action === 'createFolder') {
    const result = await callScript({ action: 'createFolder', name: body.name ?? '' })
    if ('error' in result) return json(result, 400)
    return json(result)
  }

  if (body.action === 'upload') {
    const { folderId, name, mimeType, data, isActive } = body
    if (!folderId || !data) return json({ error: 'faltan datos' }, 400)
    const result = await callScript({
      action: 'upload',
      folderId,
      name,
      mimeType,
      data,
      isActive: Boolean(isActive),
    })
    if ('error' in result) return json(result, 400)
    return json(result)
  }

  if (body.action === 'delete') {
    const { folderId, fileId } = body
    if (!folderId || !fileId) return json({ error: 'faltan datos' }, 400)
    const result = await callScript({ action: 'delete', folderId, fileId })
    if ('error' in result) return json(result, 400)
    return json(result)
  }

  if (body.action === 'list') {
    const result = await callScript({ action: 'list', folderId: body.folderId })
    if ('error' in result) return json(result, 400)
    return json(result)
  }

  if (body.action === 'sync' || body.action === 'setVisibility') {
    if (!body.propertyId) return json({ error: 'falta propertyId' }, 400)

    const { data: prop } = await supabase
      .from('propiedades')
      .select('is_active, drive_folder_id, images')
      .eq('id', body.propertyId)
      .single()
    const property = prop as {
      is_active: boolean
      drive_folder_id: string | null
      images: ImageRecord[]
    } | null
    const folderId = body.folderId ?? property?.drive_folder_id ?? ''
    const isActive = property?.is_active ?? false

    if (!folderId) return json({ error: 'sin carpeta de Drive' }, 400)

    const result = await callScript({ action: body.action, folderId, isActive })
    if ('error' in result) return json(result, 400)

    if (body.action === 'sync' && 'files' in result) {
      const existing = property?.images ?? []
      const incoming = (result as { files: IncomingFile[] }).files
      const merged = mergeImages(existing, incoming)
      await supabase.from('propiedades').update({ images: merged }).eq('id', body.propertyId)
    }
    return json(result)
  }

  return json({ error: 'acción desconocida' }, 400)
})
