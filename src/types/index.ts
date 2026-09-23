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
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Parroquia {
  id: string
  municipio_id: string
  nombre: string
}

export interface Municipio {
  id: string
  estado_id: string
  nombre: string
  parroquias: Parroquia[]
}

export interface Estado {
  id: string
  nombre: string
  municipios: Municipio[]
}

export interface Property {
  id: string
  titulo: string
  tipo_id: string | null
  estado_id: string | null
  municipio_id: string | null
  parroquia_id: string | null
  /** Nombre de la parroquia (columna text conservada por compatibilidad). */
  parroquia: string
  habitaciones: number | null
  banos: number | null
  puestos_estacionamiento: number | null
  metros_construccion: number | null
  metros_terreno: number | null
  price_usd: number | null
  price_original: number | null
  price_currency: PriceCurrency | null
  price_is_ref: boolean
  description: string
  is_active: boolean
  drive_folder_id: string | null
  images: PropertyImage[]
  created_at: string
  updated_at: string
  /** Relación embebida del tipo (PostgREST). */
  tipo?: { nombre: string } | null
  /** Campos territoriales embebidos (solo lectura del catálogo). */
  estado?: { nombre: string } | null
  municipio?: { nombre: string } | null
  parroquia_ref?: { nombre: string } | null
}

export interface Profile {
  id: string
  full_name: string
  first_name: string
  last_name: string
  phone: string | null
  email: string
  role: Role
  is_active: boolean
  created_at: string
}
