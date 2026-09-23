// Cliente del frontend para la Edge Function `propiedades`.
// Todas las escrituras de inmuebles pasan por aquí (Escenario B).

import { supabase } from './supabase'
import type { PriceCurrency, PropertyImage } from '../types'

export interface PropertyInput {
  titulo: string
  tipo_id: string
  estado_id: string | null
  municipio_id: string | null
  parroquia_id: string | null
  description?: string
  price_is_ref: boolean
  price_currency: PriceCurrency | null
  price_original: number | null
  habitaciones: number | null
  banos: number | null
  puestos_estacionamiento: number | null
  metros_construccion: number | null
  metros_terreno: number | null
}

interface InvokeResult<T> {
  data: T | null
  error: string | null
}

async function invoke<T>(body: Record<string, unknown>): Promise<InvokeResult<T>> {
  const { data, error } = await supabase.functions.invoke('propiedades', { body })
  if (error) {
    let message = 'Error del servidor.'
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string }
        if (payload?.error) message = payload.error
      } catch {
        // sin cuerpo JSON legible
      }
    } else if (error.message) {
      message = error.message
    }
    return { data: null, error: message }
  }
  return { data: (data as T) ?? null, error: null }
}

export function createProperty(
  input: PropertyInput,
  images: PropertyImage[],
  driveFolderId: string | null,
) {
  return invoke<{ ok: boolean; id: string }>({
    action: 'create',
    payload: input,
    images,
    driveFolderId,
  })
}

export function updateProperty(id: string, input: PropertyInput) {
  return invoke<{ ok: boolean }>({ action: 'update', id, payload: input })
}

export function setPropertyActive(id: string, isActive: boolean) {
  return invoke<{ ok: boolean }>({ action: 'setActive', id, isActive })
}

export function updatePropertyImages(id: string, images: PropertyImage[]) {
  return invoke<{ ok: boolean }>({ action: 'updateImages', id, images })
}

export function deleteProperty(id: string) {
  return invoke<{ ok: boolean }>({ action: 'delete', id })
}
