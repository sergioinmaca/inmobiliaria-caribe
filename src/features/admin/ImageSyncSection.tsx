import { useEffect, useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { listDriveFiles, syncDriveFolder } from '../../lib/drive'
import { Button } from '../../components/ui/Button'
import type { Property } from '../../types'

interface ImageSyncSectionProps {
  property: Property
  onSynced?: () => void
}

export function ImageSyncSection({ property, onSynced }: ImageSyncSectionProps) {
  const { profile } = useSession()
  const [desynced, setDesynced] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const canManage = profile?.role === 'gerente' || profile?.role === 'master'

  useEffect(() => {
    if (!canManage || !property.drive_folder_id) return
    let active = true
    listDriveFiles(property.drive_folder_id).then((files) => {
      if (!active) return
      const storedIds = new Set(property.images.map((img) => img.id))
      const driveIds = new Set(files.map((f) => f.id))
      const same =
        storedIds.size === driveIds.size && [...driveIds].every((id) => storedIds.has(id))
      setDesynced(!same)
    })
    return () => {
      active = false
    }
  }, [canManage, property.drive_folder_id, property.images])

  if (!canManage) return null

  if (!property.drive_folder_id) {
    return <p className="text-small text-neutral-500">Sin carpeta de Drive asociada.</p>
  }

  const sync = async () => {
    const folderId = property.drive_folder_id
    if (!folderId) return
    setSyncing(true)
    setMessage(null)
    const ok = await syncDriveFolder(folderId, property.id)
    setSyncing(false)
    if (ok) {
      setDesynced(false)
      onSynced?.()
    } else {
      setMessage('No se pudo sincronizar.')
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-300 bg-white p-4">
      <h3 className="text-h3 font-semibold text-neutral-900">Imágenes</h3>
      <p className="text-small text-neutral-500">{property.images.length} imágenes registradas.</p>
      {desynced && (
        <p className="text-small text-warning">
          Las imágenes de este inmueble están desincronizadas con Drive.
        </p>
      )}
      {message && <p className="text-small text-danger">{message}</p>}
      <Button onClick={sync} disabled={syncing}>
        {syncing ? 'Sincronizando...' : 'Sincronizar imágenes'}
      </Button>
    </div>
  )
}
