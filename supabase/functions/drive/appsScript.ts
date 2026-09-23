/// <reference lib="deno.ns" />
// Cliente del Google Apps Script (puente hacia Drive).
// Incluye reintentos con backoff exponencial + jitter.

import { requireEnv } from '../_shared/env.ts'
import { ApiError } from '../_shared/http.ts'

/**
 * Llama al Web App de Apps Script con el secreto compartido.
 * Reintenta ante fallos transitorios (429/500, red, redirecciones).
 * Lanza ApiError con el mensaje del script si éste devuelve `{ error }`.
 */
export async function callAppsScript(
  payload: Record<string, unknown>,
  options?: { retries?: number },
): Promise<Record<string, unknown>> {
  const url = requireEnv('APPS_SCRIPT_URL')
  const secret = requireEnv('APPS_SCRIPT_SECRET')
  const maxAttempts = options?.retries ?? 3
  let lastError = ''

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, secret }),
        redirect: 'manual',
      })

      // Apps Script responde con 302 hacia googleusercontent; seguimos manualmente.
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (location) {
          res = await fetch(location, {
            method: 'GET',
            headers: { Accept: 'application/json,text/plain,*/*' },
          })
        }
      }

      const text = await res.text()
      let data: unknown
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Apps Script no devolvió JSON (HTTP ${res.status})`)
      }

      const scriptError = (data as { error?: string })?.error
      if (scriptError) throw new ApiError(400, String(scriptError))

      return data as Record<string, unknown>
    } catch (err) {
      if (err instanceof ApiError) throw err
      lastError = err instanceof Error ? err.message : String(err)
      console.error(`[AppsScript] intento ${attempt + 1}/${maxAttempts} falló: ${lastError}`)
      if (attempt < maxAttempts - 1) {
        const wait = Math.min(2 ** attempt * 300, 5000) + Math.floor(Math.random() * 250)
        await new Promise((resolve) => setTimeout(resolve, wait))
      }
    }
  }

  console.error('[AppsScript] reintentos agotados:', lastError)
  throw new ApiError(502, 'Apps Script no respondió correctamente')
}
