import { describe, expect, it } from 'vitest'
import { propertySchema } from './propertySchema'

describe('propertySchema', () => {
  it('rechaza título vacío', () => {
    const r = propertySchema.safeParse({
      titulo: '   ',
      tipo: 'apartamento',
      parroquia: 'La Florida',
      priceMode: 'ref',
      priceAmount: null,
    })
    expect(r.success).toBe(false)
  })

  it('rechaza parroquia vacía', () => {
    const r = propertySchema.safeParse({
      titulo: 'Apto',
      tipo: 'apartamento',
      parroquia: '',
      priceMode: 'ref',
      priceAmount: null,
    })
    expect(r.success).toBe(false)
  })

  it('rechaza tipo inválido', () => {
    const r = propertySchema.safeParse({
      titulo: 'Apto',
      tipo: 'otro',
      parroquia: 'La Florida',
      priceMode: 'ref',
      priceAmount: null,
    })
    expect(r.success).toBe(false)
  })

  it('acepta un inmueble válido en modo ref', () => {
    const r = propertySchema.safeParse({
      titulo: 'Apto',
      tipo: 'apartamento',
      parroquia: 'La Florida',
      priceMode: 'ref',
      priceAmount: null,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza monto no positivo', () => {
    const r = propertySchema.safeParse({
      titulo: 'Apto',
      tipo: 'apartamento',
      parroquia: 'La Florida',
      priceMode: 'usd',
      priceAmount: 0,
    })
    expect(r.success).toBe(false)
  })
})
