import { describe, expect, it } from 'vitest'
import { propertySchema } from './propertySchema'

describe('propertySchema', () => {
  it('rechaza título vacío', () => {
    const r = propertySchema.safeParse({
      title: '   ',
      type: 'apartamento',
      zone: 'La Florida',
      priceMode: 'ref',
      priceAmount: null,
    })
    expect(r.success).toBe(false)
  })

  it('rechaza zona vacía', () => {
    const r = propertySchema.safeParse({
      title: 'Apto',
      type: 'apartamento',
      zone: '',
      priceMode: 'ref',
      priceAmount: null,
    })
    expect(r.success).toBe(false)
  })

  it('rechaza tipo inválido', () => {
    const r = propertySchema.safeParse({
      title: 'Apto',
      type: 'otro',
      zone: 'La Florida',
      priceMode: 'ref',
      priceAmount: null,
    })
    expect(r.success).toBe(false)
  })

  it('acepta un inmueble válido en modo ref', () => {
    const r = propertySchema.safeParse({
      title: 'Apto',
      type: 'apartamento',
      zone: 'La Florida',
      priceMode: 'ref',
      priceAmount: null,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza monto no positivo', () => {
    const r = propertySchema.safeParse({
      title: 'Apto',
      type: 'apartamento',
      zone: 'La Florida',
      priceMode: 'usd',
      priceAmount: 0,
    })
    expect(r.success).toBe(false)
  })
})
