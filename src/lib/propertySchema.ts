import { z } from 'zod'

export const propertySchema = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio'),
  tipo: z.enum(['apartamento', 'casa', 'local']),
  parroquia: z.string().trim().min(1, 'La parroquia es obligatoria'),
  priceMode: z.enum(['ref', 'usd', 'bs']),
  priceAmount: z.number().positive('Debe ser mayor a 0').nullable(),
  description: z.string().optional(),
})

export type PropertyFormValues = z.infer<typeof propertySchema>
