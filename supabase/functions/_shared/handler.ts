// Envoltorio común de las Edge Functions:
// - resuelve el preflight CORS (OPTIONS)
// - garantiza cabeceras CORS en todas las respuestas (incluidos errores)
// - traduce ApiError a HTTP y evita filtrar detalles internos

import { corsHeadersFor, withCors } from './cors.ts'
import { ApiError, json } from './http.ts'

type Handler = (req: Request) => Promise<Response>

export function serve(handler: Handler): void {
  Deno.serve(async (req: Request) => {
    const cors = corsHeadersFor(req)

    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

    try {
      const res = await handler(req)
      return withCors(res, cors)
    } catch (err) {
      if (err instanceof ApiError) {
        return withCors(json({ error: err.message }, err.status), cors)
      }
      console.error('[edge] error no controlado:', err)
      return withCors(json({ error: 'error interno' }, 500), cors)
    }
  })
}
