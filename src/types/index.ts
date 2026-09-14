export type Role = 'master' | 'gerente' | 'supervisor' | 'invitado'
export type PropertyType = 'apartamento' | 'casa' | 'local'
export type PriceCurrency = 'usd' | 'bs'

export interface PropertyImage {
  id: string
  url: string
  name: string
  order: number
}

export interface Property {
  id: string
  titulo: string
  tipo: PropertyType
  parroquia: string
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
