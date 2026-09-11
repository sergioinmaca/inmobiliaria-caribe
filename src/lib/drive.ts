import { supabase } from './supabase'

export interface DriveFile {
  id: string
  name: string
}

export async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  const { data, error } = await supabase.functions.invoke('drive', {
    body: { action: 'list', folderId },
  })
  if (error || !data?.files) return []
  return data.files as DriveFile[]
}

export async function syncDriveFolder(folderId: string, propertyId: string): Promise<boolean> {
  const { error } = await supabase.functions.invoke('drive', {
    body: { action: 'sync', folderId, propertyId },
  })
  return !error
}

export async function setDriveVisibility(
  propertyId: string,
  folderId: string,
  isActive: boolean,
): Promise<void> {
  try {
    await supabase.functions.invoke('drive', {
      body: { action: 'setVisibility', propertyId, folderId, isActive },
    })
  } catch {
    // best-effort: si falla, el siguiente sync corrige la visibilidad
  }
}

export interface UploadedDriveFile {
  id: string
  name: string
  url: string
}

export async function createDriveFolder(name: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('drive', {
    body: { action: 'createFolder', name },
  })
  if (error || !data?.folderId) return null
  return data.folderId as string
}

export async function uploadDriveFile(params: {
  folderId: string
  name: string
  mimeType: string
  data: string
  isActive: boolean
}): Promise<UploadedDriveFile | null> {
  const { data, error } = await supabase.functions.invoke('drive', {
    body: { action: 'upload', ...params },
  })
  if (error || !data?.id) return null
  return data as UploadedDriveFile
}

export async function deleteDriveFile(folderId: string, fileId: string): Promise<boolean> {
  const { error } = await supabase.functions.invoke('drive', {
    body: { action: 'delete', folderId, fileId },
  })
  return !error
}
