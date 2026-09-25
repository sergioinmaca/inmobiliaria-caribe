import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { createTipo, deleteTipo, setTipoActive, updateTipo } from '../../lib/catalogApi'
import { DEFAULT_TIPO_ICON, TIPO_ICONS } from '../../lib/tipoIconos'

interface TypeManagerModalProps {
  open: boolean
  onClose: () => void
}

export function TypeManagerModal({ open, onClose }: TypeManagerModalProps) {
  const [tipos, setTipos] = useState<
    { id: string; nombre: string; icono: string | null; orden: number; is_active: boolean }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [icono, setIcono] = useState(DEFAULT_TIPO_ICON)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcono, setEditIcono] = useState(DEFAULT_TIPO_ICON)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tipos_inmueble')
      .select('*')
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
    setTipos(
      (data as { id: string; nombre: string; icono: string | null; orden: number; is_active: boolean }[]) ?? [],
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      setLoading(true)
      setError(null)
      void load()
    }
  }, [open, load])

  if (!open) return null

  const run = async (fn: () => Promise<{ error: string | null }>) => {
    setBusy(true)
    setError(null)
    const { error: err } = await fn()
    if (err) setError(err)
    setBusy(false)
    if (!err) await load()
    return !err
  }

  const handleCreate = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    const ok = await run(() => createTipo(nombre.trim(), icono))
    if (ok) {
      setNombre('')
      setIcono(DEFAULT_TIPO_ICON)
    }
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    const ok = await run(() => updateTipo(id, { nombre: editName.trim(), icono: editIcono }))
    if (ok) setEditingId(null)
  }

  const handleToggle = (id: string, isActive: boolean) => {
    void run(() => setTipoActive(id, !isActive))
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Eliminar este tipo? Esta acción no se puede deshacer.')) return
    void run(() => deleteTipo(id))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Gestión de tipos de inmueble"
    >
      <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-md bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 font-semibold text-primary">Tipos de inmueble</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-h3 leading-none text-neutral-500 hover:text-neutral-900"
          >
            ×
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-[8rem] flex-1 flex-col gap-1">
            <label htmlFor="nuevo-tipo" className="text-small font-medium text-neutral-900">
              Nuevo tipo
            </label>
            <input
              id="nuevo-tipo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="nuevo-tipo-icono" className="text-small font-medium text-neutral-900">
              Ícono
            </label>
            <div className="flex items-center gap-2">
              <i className={`${icono} text-h3 text-primary`} aria-hidden="true" />
              <select
                id="nuevo-tipo-icono"
                value={icono}
                onChange={(e) => setIcono(e.target.value)}
                className="rounded-sm border border-neutral-300 px-2 py-2 text-body"
              >
                {TIPO_ICONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button size="sm" type="button" onClick={() => void handleCreate()} disabled={busy}>
            Agregar
          </Button>
        </div>

        {error && <p className="text-small text-danger">{error}</p>}

        {loading ? (
          <p className="text-small text-neutral-500">Cargando...</p>
        ) : tipos.length === 0 ? (
          <p className="text-small text-neutral-500">No hay tipos registrados.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-300">
            {tipos.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-2">
                {editingId === t.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-sm border border-neutral-300 px-2 py-1 text-body"
                    />
                    <select
                      aria-label="Ícono"
                      value={editIcono}
                      onChange={(e) => setEditIcono(e.target.value)}
                      className="rounded-sm border border-neutral-300 px-2 py-1 text-body"
                    >
                      {TIPO_ICONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleRename(t.id)}
                      disabled={busy}
                      className="text-small font-medium text-primary"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-small text-neutral-500"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex flex-1 items-center gap-2 text-body text-neutral-900">
                      <i
                        className={`${t.icono ?? DEFAULT_TIPO_ICON} text-h3 text-primary`}
                        aria-hidden="true"
                      />
                      <span>
                        {t.nombre}
                        {!t.is_active && <span className="text-small text-neutral-500"> (inactivo)</span>}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(t.id)
                        setEditName(t.nombre)
                        setEditIcono(t.icono ?? DEFAULT_TIPO_ICON)
                      }}
                      className="text-small font-medium text-primary"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(t.id, t.is_active)}
                      disabled={busy}
                      className="text-small font-medium text-neutral-700"
                    >
                      {t.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      disabled={busy}
                      className="text-small font-medium text-danger"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
