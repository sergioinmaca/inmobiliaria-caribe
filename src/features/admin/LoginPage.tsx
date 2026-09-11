import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginValues) => {
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (err) {
      setError('Credenciales inválidas')
      return
    }
    navigate('/admin')
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-h2 font-bold text-primary">Iniciar Sesión</h1>
      {error && <p className="text-small text-danger">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <p className="text-small text-danger">{errors.email.message}</p>}
        <Input
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="text-small text-danger">{errors.password.message}</p>}
        <Button type="submit" disabled={isSubmitting}>
          Entrar
        </Button>
      </form>
    </div>
  )
}
