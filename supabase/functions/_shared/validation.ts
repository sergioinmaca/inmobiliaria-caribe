// Validaciones de payload reutilizables.

import { ApiError } from './http.ts'

/** Lanza ApiError(400) si falta alguno de los campos indicados. */
export function requireFields(body: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter((field) => {
    const value = body[field]
    return value === undefined || value === null || value === ''
  })
  if (missing.length) throw new ApiError(400, `faltan campos: ${missing.join(', ')}`)
}
