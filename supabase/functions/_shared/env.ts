// Lectura segura de variables de entorno.

/** Devuelve la variable o lanza un error claro si no existe. */
export function requireEnv(key: string): string {
  const value = Deno.env.get(key)
  if (!value) throw new Error(`Falta la variable de entorno ${key}`)
  return value
}
