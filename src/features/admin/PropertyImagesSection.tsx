// src/features/admin/PropertyImagesSection.tsx
import { useEffect, useRef, useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { uploadDriveFile, deleteDriveFile, listDriveFiles, syncDriveFolder } from '../../lib/drive'
import { resizeImage } from '../../lib/imageResize'
import { sortImages, moveImage, removeImage } from '../../lib/images'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { PropertyImage } from '../../types'

interface PropertyImagesSectionProps {
  images: PropertyImage[]
  driveFolderId: string | null
  propertyId?: string
  onChange: (images: PropertyImage[]) => void
  ensureFolder: () => Promise<string | null>
  onSynced?: () => void
}

export function PropertyImagesSection({
  images,
  driveFolderId,
  propertyId,
  onChange,
  ensureFolder,
  onSynced,
}: PropertyImagesSectionProps) {
  const { profile } = useSession()
  const [desynced, setDesynced] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null)
  const [summary, setSummary] = useState<{ text: string; ok: boolean } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const imagesRef = useRef(images)

  const canManage = profile?.role === 'gerente' || profile?.role === 'master'

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    if (!canManage || !driveFolderId || !propertyId) return
    let active = true
    listDriveFiles(driveFolderId).then((files) => {
      if (!active) return
      const storedIds = new Set(images.map((img) => img.id))
      const driveIds = new Set(files.map((f) => f.id))
      const same =
        storedIds.size === driveIds.size && [...driveIds].every((id) => storedIds.has(id))
      setDesynced(!same)
    })
    return () => {
      active = false
    }
  }, [canManage, driveFolderId, propertyId, images])

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    let folderId = driveFolderId
    if (!folderId) {
      folderId = await ensureFolder()
      if (!folderId) {
        setMessage('No se pudo crear la carpeta de Drive.')
        return
      }
    }
    const fileList = Array.from(files)
    let successCount = 0
    let failedCount = 0
    setMessage(null)
    setSummary(null)
    setProgress({ current: 0, total: fileList.length, name: '' })
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      setProgress({ current: i + 1, total: fileList.length, name: file.name })
      try {
        const resized = await resizeImage(file)
        const uploadKey = `${file.name}:${file.size}:${file.lastModified}`
        const uploaded = await uploadDriveFile({
          folderId,
          name: resized.name,
          mimeType: resized.mimeType,
          data: resized.base64,
          isActive: true,
          uploadKey,
        })
        if (!uploaded) throw new Error('sin respuesta')
        if (!imagesRef.current.some((img) => img.id === uploaded.id)) {
          const next = [
            ...imagesRef.current,
            { id: uploaded.id, url: uploaded.url, name: uploaded.name, order: imagesRef.current.length },
          ]
          onChange(next)
        }
        successCount++
      } catch {
        failedCount++
      }
    }
    setProgress(null)
    if (successCount > 0 || failedCount > 0) {
      const ok = failedCount === 0
      const subidas = `Se subieron ${successCount} foto${successCount === 1 ? '' : 's'}`
      const fallos =
        failedCount > 0
          ? ` · ${failedCount} no ${failedCount === 1 ? 'se pudo' : 'se pudieron'} subir`
          : ''
      setSummary({ text: `${subidas}${fallos}.`, ok })
    }
  }

  const onMove = (index: number, direction: -1 | 1) => {
    onChange(moveImage(images, index, direction))
  }

  const onDelete = async (img: PropertyImage, index: number) => {
    if (!driveFolderId) return
    setMessage(null)
    const ok = await deleteDriveFile(driveFolderId, img.id)
    if (!ok) {
      setMessage('No se pudo eliminar la foto.')
      return
    }
    onChange(removeImage(images, index))
  }

  const sync = async () => {
    if (!driveFolderId || !propertyId) return
    setSyncing(true)
    setMessage(null)
    const ok = await syncDriveFolder(driveFolderId, propertyId)
    setSyncing(false)
    if (ok) {
      setDesynced(false)
      onSynced?.()
    } else {
      setMessage('No se pudo sincronizar.')
    }
  }

  const sorted = sortImages(images)

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-300 bg-white p-4">
      <h3 className="text-h3 font-semibold text-neutral-900">Imágenes</h3>
      <p className="text-small text-neutral-500">{images.length} imágenes registradas.</p>

      {canManage && !driveFolderId && (
        <p className="text-small text-neutral-500">Sube la primera foto para crear la carpeta de Drive.</p>
      )}
      {!canManage && !driveFolderId && (
        <p className="text-small text-neutral-500">Sin carpeta de Drive asociada.</p>
      )}

      {canManage && (
        <div>
          <label
            htmlFor="image-upload"
            className="inline-flex cursor-pointer items-center justify-center rounded-sm bg-primary px-4 py-2 text-body font-medium text-white"
          >
            Agregar fotos
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => void onFiles(e.target.files)}
          />
        </div>
      )}

      {progress && (
        <p className="text-small text-neutral-500">
          Subiendo {progress.current} de {progress.total}
          {progress.name ? ` — ${progress.name}` : ''}…
        </p>
      )}
      {summary && (
        <p className={`text-small ${summary.ok ? 'text-success' : 'text-danger'}`}>{summary.text}</p>
      )}

      {desynced && canManage && (
        <p className="text-small text-warning">
          Las imágenes de este inmueble están desincronizadas con Drive.
        </p>
      )}
      {message && <p className="text-small text-danger">{message}</p>}

      {canManage && driveFolderId && propertyId && (
        <Button type="button" variant="secondary" onClick={sync} disabled={syncing}>
          {syncing ? 'Sincronizando...' : 'Sincronizar imágenes'}
        </Button>
      )}

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sorted.map((img, i) => (
            <li key={img.id} className="flex items-center gap-3">
              <img src={img.url} alt={img.name} className="h-14 w-14 rounded-sm object-cover" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-small text-neutral-900">{img.name}</span>
                {i === 0 && <Badge variant="success">Portada</Badge>}
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" aria-label="Subir" disabled={i === 0} onClick={() => onMove(i, -1)}>
                    ↑
                  </Button>
                  <Button type="button" variant="ghost" aria-label="Bajar" disabled={i === sorted.length - 1} onClick={() => onMove(i, 1)}>
                    ↓
                  </Button>
                  <Button type="button" variant="ghost" aria-label="Eliminar" onClick={() => void onDelete(img, i)}>
                    ✕
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
