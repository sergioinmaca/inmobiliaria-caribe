import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { userSchema, buildEmail, type UserFormValues } from '../../lib/userSchema'
import type { Profile } from '../../types'

const defaultValues: UserFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  emailLocal: '',
  password: '',
  role: 'invitado',
}

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [rate, setRate] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({ resolver: zodResolver(userSchema), defaultValues })

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

  const createUser = async (values: UserFormValues) => {
    setMessage(null)
    const { error } = await supabase.functions.invoke('admin', {
      body: {
        action: 'createUser',
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || null,
        email: buildEmail(values.emailLocal),
        password: values.password,
        role: values.role,
      },
    })
    if (error) {
      setMessage('Error al crear el usuario.')
      return
    }
    reset(defaultValues)
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
        <h2 className="text-h3 font-semibold text-neutral-900">Crear usuario</h2>
        <form onSubmit={handleSubmit(createUser)} className="flex flex-col gap-3" noValidate>
          <Input id="firstName" label="Nombre" {...register('firstName')} />
          {errors.firstName && <p className="text-small text-danger">{errors.firstName.message}</p>}

          <Input id="lastName" label="Apellido" {...register('lastName')} />
          {errors.lastName && <p className="text-small text-danger">{errors.lastName.message}</p>}

          <Input id="phone" label="Teléfono" type="tel" {...register('phone')} />

          <div className="flex flex-col gap-1">
            <label htmlFor="emailLocal" className="text-small font-medium text-neutral-900">
              Correo
            </label>
            <div className="flex items-center rounded-sm border border-neutral-300 px-3 py-2">
              <input
                id="emailLocal"
                {...register('emailLocal')}
                placeholder="juan.perez"
                className="w-full text-body text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
              />
              <span className="shrink-0 text-body text-neutral-500">@inmaca.com</span>
            </div>
          </div>
          {errors.emailLocal && <p className="text-small text-danger">{errors.emailLocal.message}</p>}

          <Input id="password" label="Contraseña" type="password" {...register('password')} />
          {errors.password && <p className="text-small text-danger">{errors.password.message}</p>}

          <div className="flex flex-col gap-1">
            <label htmlFor="role" className="text-small font-medium text-neutral-900">
              Rol
            </label>
            <select
              id="role"
              {...register('role')}
              className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
            >
              <option value="gerente">Gerente</option>
              <option value="supervisor">Supervisor</option>
              <option value="invitado">Invitado</option>
            </select>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            Crear usuario
          </Button>
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
                <p className="truncate text-body font-semibold text-neutral-900">
                  {`${u.first_name} ${u.last_name}`.trim() || u.full_name}
                </p>
                <p className="text-small text-neutral-500">{u.role}</p>
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
