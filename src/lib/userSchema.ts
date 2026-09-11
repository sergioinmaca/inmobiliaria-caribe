// src/lib/userSchema.ts
import { z } from 'zod'

export const userSchema = z.object({
  firstName: z.string().trim().min(1, 'El nombre es obligatorio'),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio'),
  phone: z.string().trim().optional(),
  emailLocal: z
    .string()
    .trim()
    .min(1, 'El correo es obligatorio')
    .regex(/^[a-z0-9._%+-]+$/i, 'Parte local inválida'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['gerente', 'supervisor', 'invitado']),
})

export type UserFormValues = z.infer<typeof userSchema>

export function buildEmail(local: string): string {
  return `${local}@inmaca.com`
}
