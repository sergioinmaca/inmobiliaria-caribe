/// <reference lib="deno.ns" />
// Supabase Edge Function: integración con Google Drive vía Google Apps Script.
// Despliegue: supabase functions deploy drive --use-api
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY (automáticos), APPS_SCRIPT_URL, APPS_SCRIPT_SECRET.
// Acciones: { action: 'createFolder', name, folderKey? } | { action: 'list', folderId }
//         | { action: 'sync', propertyId, folderId? } | { action: 'setVisibility', propertyId, folderId? }
//         | { action: 'setFileVisibility', fileId, isActive }
//         | { action: 'setFilesVisibility', fileIds, isActive }
//         | { action: 'upload', folderId, name, mimeType, data, uploadKey?, isActive }
//         | { action: 'delete', folderId, fileId } | { action: 'deleteFolder', folderId }
//         | { action: 'deletePropertyFiles', fileIds, folderId? }

import { serve } from '../_shared/handler.ts'
import { authenticate, requireRole } from '../_shared/auth.ts'
import { ApiError, json } from '../_shared/http.ts'
import { requireFields } from '../_shared/validation.ts'
import type { AuthContext } from '../_shared/auth.ts'
import { callAppsScript } from './appsScript.ts'
import { mergeImages, type ImageRecord, type IncomingFile } from './mergeImages.ts'

interface DriveBody {
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

interface PropertyRow {
  is_active: boolean
  drive_folder_id: string | null
  images: ImageRecord[]
}

async function readProperty(ctx: AuthContext, propertyId: string): Promise<PropertyRow> {
  const { data } = await ctx.client
    .from('propiedades')
    .select('is_active, drive_folder_id, images')
    .eq('id', propertyId)
    .single()
  if (!data) throw new ApiError(404, 'inmueble no encontrado')
  return data as PropertyRow
}

async function syncProperty(ctx: AuthContext, body: DriveBody): Promise<Record<string, unknown>> {
  if (!body.propertyId) throw new ApiError(400, 'falta propertyId')

  const property = await readProperty(ctx, body.propertyId)
  const folderId = body.folderId ?? property.drive_folder_id ?? ''
  const isActive = property.is_active

  if (!folderId) {
    const images = property.images ?? []
    if (images.length === 0) throw new ApiError(400, 'sin carpeta de Drive')
    return callAppsScript({
      action: 'setFilesVisibility',
      fileIds: images.map((img) => img.id),
      isActive,
    })
  }

  const result = await callAppsScript({ action: 'sync', folderId, isActive })
  const files = (result.files ?? []) as IncomingFile[]
  const merged = mergeImages(property.images ?? [], files)
  await ctx.client.from('propiedades').update({ images: merged }).eq('id', body.propertyId)
  return result
}

async function setVisibility(ctx: AuthContext, body: DriveBody): Promise<Record<string, unknown>> {
  if (!body.propertyId) throw new ApiError(400, 'falta propertyId')

  const property = await readProperty(ctx, body.propertyId)
  const folderId = body.folderId ?? property.drive_folder_id ?? ''

  if (!folderId) {
    const images = property.images ?? []
    if (images.length === 0) throw new ApiError(400, 'sin carpeta de Drive')
    return callAppsScript({
      action: 'setFilesVisibility',
      fileIds: images.map((img) => img.id),
      isActive: property.is_active,
    })
  }

  return callAppsScript({
    action: 'setVisibility',
    folderId,
    isActive: property.is_active,
  })
}

async function deletePropertyFiles(body: DriveBody): Promise<Record<string, unknown>> {
  for (const fileId of body.fileIds ?? []) {
    try {
      await callAppsScript({ action: 'deleteFileById', fileId })
    } catch (err) {
      console.error('[deletePropertyFiles] archivo no eliminado', fileId, err)
    }
  }
  if (body.folderId) {
    try {
      await callAppsScript({ action: 'deleteFolder', folderId: body.folderId })
    } catch (err) {
      console.error('[deletePropertyFiles] carpeta no eliminada', body.folderId, err)
    }
  }
  return { ok: true }
}

serve(async (req) => {
  const ctx = await authenticate(req)
  requireRole(ctx, 'gerente', 'master')

  const body = (await req.json()) as DriveBody

  switch (body.action) {
    case 'createFolder':
      return json(
        await callAppsScript({
          action: 'createFolder',
          name: body.name ?? '',
          folderKey: body.folderKey,
        }),
      )

    case 'upload':
      requireFields(body, ['folderId', 'data'])
      return json(
        await callAppsScript({
          action: 'upload',
          folderId: body.folderId,
          name: body.name,
          mimeType: body.mimeType,
          data: body.data,
          uploadKey: body.uploadKey,
          isActive: Boolean(body.isActive),
        }),
      )

    case 'delete':
      requireFields(body, ['folderId', 'fileId'])
      return json(
        await callAppsScript({ action: 'delete', folderId: body.folderId, fileId: body.fileId }),
      )

    case 'list':
      requireFields(body, ['folderId'])
      return json(await callAppsScript({ action: 'list', folderId: body.folderId }))

    case 'deleteFolder':
      requireFields(body, ['folderId'])
      return json(await callAppsScript({ action: 'deleteFolder', folderId: body.folderId }))

    case 'deletePropertyFiles':
      return json(await deletePropertyFiles(body))

    case 'setFileVisibility':
      requireFields(body, ['fileId'])
      return json(
        await callAppsScript({
          action: 'setFileVisibility',
          fileId: body.fileId,
          isActive: Boolean(body.isActive),
        }),
      )

    case 'setFilesVisibility':
      requireFields(body, ['fileIds'])
      return json(
        await callAppsScript({
          action: 'setFilesVisibility',
          fileIds: body.fileIds,
          isActive: Boolean(body.isActive),
        }),
      )

    case 'sync':
      return json(await syncProperty(ctx, body))

    case 'setVisibility':
      return json(await setVisibility(ctx, body))

    default:
      throw new ApiError(400, 'acción desconocida')
  }
})
