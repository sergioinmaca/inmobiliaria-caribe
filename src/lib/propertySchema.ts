import { z } from 'zod'

const optionalMetric = z
  .number()
  .nonnegative('No puede ser negativo')
  .nullable()

export const propertySchema = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio'),
  tipo_id: z.string().trim().min(1, 'El tipo es obligatorio'),
  estado_id: z.string().trim().min(1, 'El estado es obligatorio'),
  municipio_id: z.string().trim().min(1, 'El municipio es obligatorio'),
  parroquia_id: z.string().trim().min(1, 'La parroquia es obligatoria'),
  habitaciones: optionalMetric,
  banos: optionalMetric,
  puestos_estacionamiento: optionalMetric,
  metros_construccion: optionalMetric,
  metros_terreno: optionalMetric,
  priceMode: z.enum(['ref', 'usd', 'bs']),
  priceAmount: z.number().positive('Debe ser mayor a 0').nullable(),
  description: z.string().optional(),
})

export type PropertyFormValues = z.infer<typeof propertySchema>
