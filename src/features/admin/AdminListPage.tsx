import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { setDriveVisibility } from '../../lib/drive'
import { MIN_IMAGES_TO_ACTIVATE } from '../../lib/constants'
import { coverImage } from '../../lib/images'
import { formatPrice } from '../../lib/price'
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
      .from('propiedades')
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
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      p.parroquia.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleActive = async (property: Property) => {
    if (!property.is_active) {
      if (property.images.length < MIN_IMAGES_TO_ACTIVATE) {
        setMessage(
          `No se puede activar: se necesita al menos ${MIN_IMAGES_TO_ACTIVATE} imagen${MIN_IMAGES_TO_ACTIVATE === 1 ? '' : 'es'}.`,
        )
        return
      }
      if (!property.titulo.trim() || !property.parroquia.trim()) {
        setMessage('No se puede activar: faltan campos obligatorios.')
        return
      }
    } else if (!window.confirm('¿Desactivar la publicación de este inmueble?')) {
      return
    }

    const { error } = await supabase
      .from('propiedades')
      .update({ is_active: !property.is_active })
      .eq('id', property.id)
    if (error) {
      setMessage('Error al actualizar el estado.')
      return
    }
    setMessage(null)
    void setDriveVisibility(property.id, property.drive_folder_id, !property.is_active)
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
        placeholder="Buscar por título o parroquia"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
      />

      {message && <p className="text-small text-danger">{message}</p>}

      {loading ? (
        <div className="relative left-1/2 flex w-screen -translate-x-1/2 flex-col" data-testid="admin-skeleton">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse border-b border-neutral-300 bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">No hay inmuebles</p>
      ) : (
        <ul className="relative left-1/2 flex w-screen -translate-x-1/2 flex-col border-t border-neutral-300">
          {filtered.map((p) => (
            <li key={p.id} className="border-b border-neutral-300 bg-white px-4 pt-2">
              <div className="flex h-44">
                <Link to={`/admin/inmueble/${p.id}`} className="relative block h-full w-2/5 shrink-0">
                  <img
                    src={coverImage(p.images)?.url ?? '/brand/placeholder-property.svg'}
                    alt={p.titulo}
                    className="h-full w-full object-cover"
                  />
                  <Badge
                    variant={p.is_active ? 'success' : 'default'}
                    className="absolute left-2 top-2"
                  >
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Link>
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <h3 className="text-h3 font-semibold text-neutral-900">{p.titulo}</h3>
                    <p className="text-small text-neutral-500">
                      {p.parroquia} · {p.tipo}
                    </p>
                  </div>
                  <span className="text-body font-bold text-primary">{formatPrice(p)}</span>
                </div>
              </div>

              {canEdit && (
                <div className="-mx-4 flex items-center justify-center gap-3 bg-accent px-4 py-2">
                  <Link
                    to={`/admin/inmueble/${p.id}`}
                    className="inline-flex items-center justify-center rounded-sm bg-white px-3 py-1 text-body font-medium text-primary"
                  >
                    Editar
                  </Link>
                  <Button variant={p.is_active ? 'danger' : 'success'} size="sm" onClick={() => toggleActive(p)}>
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
