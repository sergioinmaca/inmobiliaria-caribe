/// <reference lib="deno.ns" />
// Supabase Edge Function: integración con Google Drive vía Google Apps Script.
// Despliegue (dashboard): Edge Functions → New Function "drive" → pegar este código.
// Secrets requeridos: SUPABASE_URL, SUPABASE_ANON_KEY (automáticos), APPS_SCRIPT_URL, APPS_SCRIPT_SECRET.
// Acciones: { action: 'createFolder', name } | { action: 'list', folderId }
//         | { action: 'sync', propertyId, folderId? } | { action: 'setVisibility', propertyId, folderId? }
//         | { action: 'setFileVisibility', fileId, isActive }
//         | { action: 'deleteFolder', folderId }
//         | { action: 'deletePropertyFiles', fileIds, folderId? }

import { createClient } from '@supabase/supabase-js'

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

async function callScript(payload: Record<string, unknown>, options?: { retries?: number }) {
  const url = Deno.env.get('APPS_SCRIPT_URL')
  const secret = Deno.env.get('APPS_SCRIPT_SECRET')
  if (!url || !secret) return { error: 'faltan secrets de Apps Script' }

  const maxAttempts = options?.retries ?? 3
  let lastError: string | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, secret }),
        redirect: 'manual',
      })

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (loc) {
          res = await fetch(loc, {
            method: 'GET',
            headers: { Accept: 'application/json,text/plain,*/*' },
          })
        }
      }

      const text = await res.text()
      let data: unknown
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Apps Script no devolvió JSON (HTTP ${res.status})`)
      }
      if ((data as { error?: string })?.error) return { error: String((data as { error: string }).error) }
      return data
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      console.error(`[callScript] intento ${attempt + 1}/${maxAttempts} falló: ${lastError}`)
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
      }
    }
  }

  console.error('[callScript] reintentos agotados', lastError)
  return { error: 'Apps Script no respondió correctamente' }
}

Deno.serve(async (req: Request) => {
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
    folderKey?: string
    folderId?: string
    fileId?: string
    propertyId?: string
    fileIds?: string[]
    mimeType?: string
    data?: string
    uploadKey?: string
    isActive?: boolean
  }

  if (body.action === 'createFolder') {
    const result = await callScript({
      action: 'createFolder',
      name: body.name ?? '',
      folderKey: body.folderKey,
    })
    if ('error' in result) return json(result, 400)
    return json(result)
  }

  if (body.action === 'upload') {
    const { folderId, name, mimeType, data, uploadKey, isActive } = body
    if (!folderId || !data) return json({ error: 'faltan datos' }, 400)
    const result = await callScript({
      action: 'upload',
      folderId,
      name,
      mimeType,
      data,
      uploadKey,
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

  if (body.action === 'deleteFolder') {
    if (!body.folderId) return json({ error: 'falta folderId' }, 400)
    const result = await callScript({ action: 'deleteFolder', folderId: body.folderId })
    if ('error' in result) return json(result, 400)
    return json(result)
  }

  if (body.action === 'deletePropertyFiles') {
    const fileIds = (body.fileIds ?? []) as string[]
    for (const fileId of fileIds) {
      const res = await callScript({ action: 'deleteFileById', fileId })
      if ('error' in res) console.error('[deletePropertyFiles] archivo no eliminado', fileId, res.error)
    }
    if (body.folderId) {
      const res = await callScript({ action: 'deleteFolder', folderId: body.folderId })
      if ('error' in res) console.error('[deletePropertyFiles] carpeta no eliminada', body.folderId, res.error)
    }
    return json({ ok: true })
  }

  if (body.action === 'setFileVisibility') {
    if (!body.fileId) return json({ error: 'falta fileId' }, 400)
    const result = await callScript({
      action: 'setFileVisibility',
      fileId: body.fileId,
      isActive: Boolean(body.isActive),
    })
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

    if (!folderId) {
      const images = property?.images ?? []
      if (images.length === 0) return json({ error: 'sin carpeta de Drive' }, 400)
      for (const img of images) {
        const res = await callScript({
          action: 'setFileVisibility',
          fileId: img.id,
          isActive,
        })
        if ('error' in res) return json(res, 400)
      }
      return json({ ok: true })
    }

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
