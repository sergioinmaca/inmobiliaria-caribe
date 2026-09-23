import { describe, expect, it } from 'vitest'
import { propertySchema } from './propertySchema'

const valid = {
  titulo: 'Apto',
  tipo_id: 'tipo-1',
  estado_id: 'estado-1',
  municipio_id: 'municipio-1',
  parroquia_id: 'parroquia-1',
  habitaciones: 3,
  banos: 2,
  puestos_estacionamiento: 1,
  metros_construccion: 90,
  metros_terreno: null,
  priceMode: 'ref',
  priceAmount: null,
}

describe('propertySchema', () => {
  it('rechaza título vacío', () => {
    const r = propertySchema.safeParse({ ...valid, titulo: '   ' })
    expect(r.success).toBe(false)
  })

  it('rechaza parroquia vacía', () => {
    const r = propertySchema.safeParse({ ...valid, parroquia_id: '' })
    expect(r.success).toBe(false)
  })

  it('rechaza tipo vacío', () => {
    const r = propertySchema.safeParse({ ...valid, tipo_id: '' })
    expect(r.success).toBe(false)
  })

  it('rechaza municipio vacío', () => {
    const r = propertySchema.safeParse({ ...valid, municipio_id: '' })
    expect(r.success).toBe(false)
  })

  it('rechaza una métrica negativa', () => {
    const r = propertySchema.safeParse({ ...valid, habitaciones: -1 })
    expect(r.success).toBe(false)
  })

  it('acepta un inmueble válido en modo ref', () => {
    const r = propertySchema.safeParse(valid)
    expect(r.success).toBe(true)
  })

  it('rechaza monto no positivo', () => {
    const r = propertySchema.safeParse({ ...valid, priceMode: 'usd', priceAmount: 0 })
    expect(r.success).toBe(false)
  })
})
