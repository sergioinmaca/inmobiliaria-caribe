// Respuestas HTTP y error tipado para las Edge Functions.

import { corsHeadersFor } from './cors.ts'

/** Error controlado: transporta un código HTTP que el envoltorio `serve` traduce. */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Respuesta JSON uniforme. Si se pasa `req`, incluye cabeceras CORS.
 */
export function json(body: unknown, status = 200, req?: Request): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (req) Object.assign(headers, corsHeadersFor(req))
  return new Response(JSON.stringify(body), { status, headers })
}
