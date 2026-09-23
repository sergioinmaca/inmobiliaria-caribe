// Supabase Edge Function: escrituras y reglas de negocio de inmuebles.
// Despliegue: supabase functions deploy propiedades --use-api
// Acciones:
//   { action: 'create', payload, images, driveFolderId }
//   { action: 'update', id, payload }
//   { action: 'setActive', id, isActive }
//   { action: 'updateImages', id, images }
//   { action: 'delete', id }
//
// El cliente ya no escribe inmuebles directamente: toda regla se valida aquí.

import { serve } from '../_shared/handler.ts'
import { authenticate, requireRole, type AuthContext } from '../_shared/auth.ts'
import { ApiError, json } from '../_shared/http.ts'
import type { PriceCurrency, PropertyImage } from '../_shared/types.ts'

const PROPERTY_TYPES = ['apartamento', 'casa', 'local']
/** Decisión de negocio (Fase 1): mínimo de imágenes para activar. */
const MIN_IMAGES_TO_ACTIVATE = 1

interface PropertyInput {
  titulo: string
  tipo: string
  parroquia: string
  description?: string
  price_is_ref: boolean
  price_currency: PriceCurrency | null
  price_original: number | null
}

interface PropertyBody {
  action: string
  id?: string
  payload?: PropertyInput
  images?: PropertyImage[]
  driveFolderId?: string | null
  isActive?: boolean
}

function validateInput(input: PropertyInput): void {
  if (!input.titulo?.trim()) throw new ApiError(400, 'el título es obligatorio')
  if (!PROPERTY_TYPES.includes(input.tipo)) throw new ApiError(400, 'tipo inválido')
  if (!input.parroquia?.trim()) throw new ApiError(400, 'la parroquia es obligatoria')
  if (!input.price_is_ref) {
    if (input.price_original == null || input.price_original <= 0) {
      throw new ApiError(400, 'el monto debe ser mayor a 0')
    }
    if (input.price_currency !== 'usd' && input.price_currency !== 'bs') {
      throw new ApiError(400, 'moneda inválida')
    }
  }
}

/** Normaliza el precio a USD EN EL SERVIDOR (el cliente no puede falsificarlo). */
async function computePriceUsd(ctx: AuthContext, input: PropertyInput): Promise<number | null> {
  if (input.price_is_ref || input.price_original == null || input.price_currency == null) {
    return null
  }
  if (input.price_currency === 'usd') return input.price_original

  const { data } = await ctx.client
    .from('settings')
    .select('value')
    .eq('key', 'usd_to_bs_rate')
    .single()
  const rate = Number((data as { value: string } | null)?.value)
  if (!rate || rate <= 0) return null
  return input.price_original / rate
}

async function buildRow(ctx: AuthContext, input: PropertyInput) {
  return {
    titulo: input.titulo.trim(),
    tipo: input.tipo,
    parroquia: input.parroquia.trim(),
    description: input.description ?? '',
    price_is_ref: input.price_is_ref,
    price_currency: input.price_is_ref ? null : input.price_currency,
    price_original: input.price_is_ref ? null : input.price_original,
    price_usd: await computePriceUsd(ctx, input),
  }
}

async function getProperty(ctx: AuthContext, id: string) {
  const { data } = await ctx.client
    .from('propiedades')
    .select('id, titulo, parroquia, images, is_active')
    .eq('id', id)
    .single()
  if (!data) throw new ApiError(404, 'inmueble no encontrado')
  return data as {
    id: string
    titulo: string
    parroquia: string
    images: PropertyImage[]
    is_active: boolean
  }
}

async function createProperty(ctx: AuthContext, body: PropertyBody): Promise<Response> {
  if (!body.payload) throw new ApiError(400, 'faltan datos')
  validateInput(body.payload)
  const row = await buildRow(ctx, body.payload)

  const { data, error } = await ctx.client
    .from('propiedades')
    .insert({
      ...row,
      images: body.images ?? [],
      drive_folder_id: body.driveFolderId ?? null,
    })
    .select('id')
    .single()
  if (error) throw new ApiError(400, error.message)
  return json({ ok: true, id: (data as { id: string }).id })
}

async function updateProperty(ctx: AuthContext, body: PropertyBody): Promise<Response> {
  if (!body.id || !body.payload) throw new ApiError(400, 'faltan datos')
  validateInput(body.payload)
  const row = await buildRow(ctx, body.payload)

  const { error } = await ctx.client.from('propiedades').update(row).eq('id', body.id)
  if (error) throw new ApiError(400, error.message)
  return json({ ok: true })
}

async function setActive(ctx: AuthContext, body: PropertyBody): Promise<Response> {
  if (!body.id || typeof body.isActive !== 'boolean') throw new ApiError(400, 'faltan datos')

  if (body.isActive) {
    const property = await getProperty(ctx, body.id)
    const imageCount = property.images?.length ?? 0
    if (imageCount < MIN_IMAGES_TO_ACTIVATE) {
      const plural = MIN_IMAGES_TO_ACTIVATE === 1 ? '' : 'es'
      throw new ApiError(
        400,
        `No se puede activar: se necesita al menos ${MIN_IMAGES_TO_ACTIVATE} imagen${plural}.`,
      )
    }
    if (!property.titulo?.trim() || !property.parroquia?.trim()) {
      throw new ApiError(400, 'No se puede activar: faltan campos obligatorios.')
    }
  }

  const { error } = await ctx.client
    .from('propiedades')
    .update({ is_active: body.isActive })
    .eq('id', body.id)
  if (error) throw new ApiError(400, error.message)
  return json({ ok: true })
}

async function updateImages(ctx: AuthContext, body: PropertyBody): Promise<Response> {
  if (!body.id || !Array.isArray(body.images)) throw new ApiError(400, 'faltan datos')
  const { error } = await ctx.client
    .from('propiedades')
    .update({ images: body.images })
    .eq('id', body.id)
  if (error) throw new ApiError(400, error.message)
  return json({ ok: true })
}

async function deleteProperty(ctx: AuthContext, body: PropertyBody): Promise<Response> {
  if (!body.id) throw new ApiError(400, 'falta id')
  const { error } = await ctx.client.from('propiedades').delete().eq('id', body.id)
  if (error) throw new ApiError(400, error.message)
  return json({ ok: true })
}

serve(async (req) => {
  const ctx = await authenticate(req)
  const body = (await req.json()) as PropertyBody

  switch (body.action) {
    case 'create':
      requireRole(ctx, 'gerente', 'master')
      return createProperty(ctx, body)

    case 'update':
      requireRole(ctx, 'gerente', 'master', 'supervisor')
      return updateProperty(ctx, body)

    case 'setActive':
      requireRole(ctx, 'gerente', 'master')
      return setActive(ctx, body)

    case 'updateImages':
      requireRole(ctx, 'gerente', 'master')
      return updateImages(ctx, body)

    case 'delete':
      requireRole(ctx, 'gerente', 'master')
      return deleteProperty(ctx, body)

    default:
      throw new ApiError(400, 'acción desconocida')
  }
})
