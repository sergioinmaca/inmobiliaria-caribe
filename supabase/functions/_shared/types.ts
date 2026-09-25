// Tipos compartidos entre Edge Functions.
// Copia del contrato de `src/types/index.ts` (a futuro podrían generarse de la DB).

export type Role = 'master' | 'gerente' | 'supervisor' | 'invitado'
export type PriceCurrency = 'usd' | 'bs'

export interface PropertyImage {
  id: string
  url: string
  name: string
  order: number
}

export interface TipoInmueble {
  id: string
  nombre: string
  orden: number
  /** Clase de Remix Icon (ej. `ri-building-4-fill`). */
  icono: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Parroquia {
  id: string
  municipio_id: string
  nombre: string
  is_active: boolean
  created_at: string
}

export interface Municipio {
  id: string
  estado_id: string
  nombre: string
  is_active: boolean
  created_at: string
}

export interface Estado {
  id: string
  nombre: string
  is_active: boolean
  created_at: string
}
