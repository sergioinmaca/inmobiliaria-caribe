// Tipos compartidos entre Edge Functions.
// Copia del contrato de `src/types/index.ts` (a futuro podrían generarse de la DB).

export type Role = 'master' | 'gerente' | 'supervisor' | 'invitado'
export type PropertyType = 'apartamento' | 'casa' | 'local'
export type PriceCurrency = 'usd' | 'bs'

export interface PropertyImage {
  id: string
  url: string
  name: string
  order: number
}
