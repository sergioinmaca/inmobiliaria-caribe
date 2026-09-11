import { z } from 'zod'

export const propertySchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio'),
  type: z.enum(['apartamento', 'casa', 'local']),
  zone: z.string().trim().min(1, 'La zona es obligatoria'),
  priceMode: z.enum(['ref', 'usd', 'bs']),
  priceAmount: z.number().positive('Debe ser mayor a 0').nullable(),
  description: z.string().optional(),
})

export type PropertyFormValues = z.infer<typeof propertySchema>
