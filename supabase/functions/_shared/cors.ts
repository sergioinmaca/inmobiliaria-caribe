// Cabeceras CORS compartidas por todas las Edge Functions.
// El origen permitido se controla con el secreto ALLOWED_ORIGINS (lista separada por comas).
// Si no se define, se usa una lista por defecto (dominio productivo + desarrollo local).

const DEFAULT_ORIGINS = [
  'https://inmobiliaria-caribe.com',
  'https://www.inmobiliaria-caribe.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

export function allowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS')
  if (!raw) return DEFAULT_ORIGINS
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = allowedOrigins()
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] ?? '*')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

/** Añade/sobrescribe las cabeceras CORS en una respuesta. */
export function withCors(res: Response, headers: Record<string, string>): Response {
  const merged = new Headers(res.headers)
  for (const [key, value] of Object.entries(headers)) merged.set(key, value)
  return new Response(res.body, { status: res.status, headers: merged })
}
