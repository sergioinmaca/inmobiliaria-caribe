// Catálogo curado de íconos Remix disponibles para los tipos de inmueble.

export interface TipoIconOption {
  value: string
  label: string
}

/** Ícono por defecto cuando un tipo no tiene uno asignado. */
export const DEFAULT_TIPO_ICON = 'ri-home-4-fill'

export const TIPO_ICONS: TipoIconOption[] = [
  { value: 'ri-building-4-fill', label: 'Edificio' },
  { value: 'ri-building-3-fill', label: 'Edificio industrial' },
  { value: 'ri-building-2-fill', label: 'Edificio comercial' },
  { value: 'ri-home-9-fill', label: 'Casa' },
  { value: 'ri-home-4-fill', label: 'Vivienda' },
  { value: 'ri-home-2-fill', label: 'Vivienda 2' },
  { value: 'ri-store-3-fill', label: 'Local' },
  { value: 'ri-store-2-fill', label: 'Tienda' },
  { value: 'ri-store-fill', label: 'Comercio' },
  { value: 'ri-plant-fill', label: 'Terreno' },
  { value: 'ri-leaf-fill', label: 'Naturaleza' },
  { value: 'ri-computer-fill', label: 'Oficina' },
  { value: 'ri-macbook-fill', label: 'Escritorio' },
  { value: 'ri-community-fill', label: 'Comunidad' },
  { value: 'ri-hotel-fill', label: 'Hotel' },
]
