import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { setDriveVisibility } from '../../lib/drive'
import { MIN_IMAGES_TO_ACTIVATE } from '../../lib/constants'
import { useSession } from '../../hooks/useSession'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import type { Property } from '../../types'

export function AdminListPage() {
  const { profile } = useSession()
  const [properties, setProperties] = useState<Property[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const canEdit = ['master', 'gerente', 'supervisor'].includes(profile?.role ?? '')
  const canCreate = ['master', 'gerente'].includes(profile?.role ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setProperties((data as Property[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = properties.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.zone.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleActive = async (property: Property) => {
    if (!property.is_active) {
      if (property.images.length < MIN_IMAGES_TO_ACTIVATE) {
        setMessage(`No se puede activar: se necesitan al menos ${MIN_IMAGES_TO_ACTIVATE} imágenes.`)
        return
      }
      if (!property.title.trim() || !property.zone.trim()) {
        setMessage('No se puede activar: faltan campos obligatorios.')
        return
      }
    } else if (!window.confirm('¿Desactivar la publicación de este inmueble?')) {
      return
    }

    const { error } = await supabase
      .from('properties')
      .update({ is_active: !property.is_active })
      .eq('id', property.id)
    if (error) {
      setMessage('Error al actualizar el estado.')
      return
    }
    setMessage(null)
    if (property.drive_folder_id) {
      void setDriveVisibility(property.id, property.drive_folder_id, !property.is_active)
    }
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h2 font-bold text-primary">Inmuebles</h1>
        {canCreate && (
          <Link
            to="/admin/inmueble"
            className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-body font-medium text-white"
          >
            Nuevo inmueble
          </Link>
        )}
      </div>

      <input
        type="search"
        placeholder="Buscar por título o zona"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
      />

      {message && <p className="text-small text-danger">{message}</p>}

      {loading ? (
        <div className="flex flex-col gap-3" data-testid="admin-skeleton">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">No hay inmuebles</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-md border border-neutral-300 bg-white p-3"
            >
              <img
                src={p.images[0]?.url ?? '/brand/placeholder-property.svg'}
                alt=""
                className="h-14 w-14 rounded-sm object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-neutral-900">{p.title}</p>
                <p className="text-small text-neutral-500">
                  {p.type} · {p.zone}
                </p>
              </div>
              <Badge variant={p.is_active ? 'success' : 'default'}>
                {p.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Link to={`/admin/inmueble/${p.id}`} className="text-small font-medium text-accent">
                    Editar
                  </Link>
                  <Button variant={p.is_active ? 'ghost' : 'primary'} onClick={() => toggleActive(p)}>
                    {p.is_active ? 'Desactivar' : 'Activar'}
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
