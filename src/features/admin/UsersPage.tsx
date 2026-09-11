import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import type { Profile, Role } from '../../types'

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('invitado')
  const [rate, setRate] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  const loadRate = useCallback(async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'usd_to_bs_rate')
      .single()
    if (data) setRate((data as { value: string }).value)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadRate()
  }, [loadRate])

  const invite = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const { error } = await supabase.functions.invoke('admin', {
      body: { action: 'inviteUser', email, fullName, role },
    })
    if (error) {
      setMessage('Error al invitar al usuario.')
      return
    }
    setEmail('')
    setFullName('')
    setRole('invitado')
    load()
  }

  const deactivate = async (id: string) => {
    if (!window.confirm('¿Desactivar este usuario?')) return
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    if (error) {
      setMessage('Error al desactivar el usuario.')
      return
    }
    load()
  }

  const saveRate = async () => {
    setMessage(null)
    const { error } = await supabase
      .from('settings')
      .update({ value: rate })
      .eq('key', 'usd_to_bs_rate')
    if (error) {
      setMessage('Error al guardar la tasa.')
      return
    }
    setMessage('Tasa guardada.')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 font-bold text-primary">Usuarios</h1>

      <section className="flex flex-col gap-3 rounded-md border border-neutral-300 bg-white p-4">
        <h2 className="text-h3 font-semibold text-neutral-900">Invitar usuario</h2>
        <form onSubmit={invite} className="flex flex-col gap-3">
          <Input
            id="fullName"
            label="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            id="email"
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="role" className="text-small font-medium text-neutral-900">
              Rol
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
            >
              <option value="gerente">Gerente</option>
              <option value="supervisor">Supervisor</option>
              <option value="invitado">Invitado</option>
            </select>
          </div>
          <Button type="submit">Enviar invitación</Button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-neutral-300 bg-white p-4">
        <h2 className="text-h3 font-semibold text-neutral-900">Tasa Bs → $</h2>
        <div className="flex items-end gap-3">
          <Input
            id="rate"
            label="Bolívares por dólar"
            type="number"
            inputMode="decimal"
            step="any"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <Button onClick={saveRate}>Guardar</Button>
        </div>
      </section>

      {message && <p className="text-small text-neutral-500">{message}</p>}

      {loading ? (
        <p className="text-body text-neutral-500">Cargando...</p>
      ) : users.length === 0 ? (
        <p className="text-body text-neutral-500">No hay usuarios</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-md border border-neutral-300 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-neutral-900">{u.full_name}</p>
                <p className="text-small text-neutral-500">
                  {u.role}
                </p>
              </div>
              <Badge variant={u.is_active ? 'success' : 'default'}>
                {u.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
              {u.is_active && (
                <Button variant="ghost" onClick={() => deactivate(u.id)}>
                  Desactivar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
