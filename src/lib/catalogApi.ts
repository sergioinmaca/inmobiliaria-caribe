// Cliente del frontend para la Edge Function `catalogos` (tipos de inmueble).

import { supabase } from './supabase'

interface InvokeResult<T> {
  data: T | null
  error: string | null
}

async function invoke<T>(body: Record<string, unknown>): Promise<InvokeResult<T>> {
  const { data, error } = await supabase.functions.invoke('catalogos', { body })
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

export function createTipo(nombre: string, icono?: string, orden?: number) {
  return invoke<{ ok: boolean; id: string }>({ action: 'create', nombre, icono, orden })
}

export function updateTipo(id: string, patch: { nombre?: string; icono?: string; orden?: number }) {
  return invoke<{ ok: boolean }>({ action: 'update', id, ...patch })
}

export function setTipoActive(id: string, isActive: boolean) {
  return invoke<{ ok: boolean }>({ action: 'setActive', id, isActive })
}

export function deleteTipo(id: string) {
  return invoke<{ ok: boolean }>({ action: 'delete', id })
}
