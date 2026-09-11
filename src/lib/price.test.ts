import { describe, expect, it } from 'vitest'
import { formatPrice, normalizePriceUsd } from './price'

describe('normalizePriceUsd', () => {
  it('devuelve null en modo REF', () => {
    expect(normalizePriceUsd(null, null, true, 50)).toBeNull()
  })

  it('devuelve el monto directo en USD', () => {
    expect(normalizePriceUsd('usd', 120000, false, 50)).toBe(120000)
  })

  it('convierte Bs a USD con la tasa', () => {
    expect(normalizePriceUsd('bs', 6000000, false, 50)).toBe(120000)
  })

  it('devuelve null si la tasa es 0', () => {
    expect(normalizePriceUsd('bs', 6000000, false, 0)).toBeNull()
  })
})

describe('formatPrice', () => {
  it('muestra REF cuando es referencia', () => {
    expect(
      formatPrice({ price_is_ref: true, price_currency: null, price_original: null, price_usd: null }),
    ).toBe('REF.')
  })

  it('formatea USD', () => {
    expect(
      formatPrice({ price_is_ref: false, price_currency: 'usd', price_original: 120000, price_usd: 120000 }),
    ).toBe('$120.000')
  })

  it('formatea Bs con su equivalente en USD', () => {
    expect(
      formatPrice({ price_is_ref: false, price_currency: 'bs', price_original: 6000000, price_usd: 120000 }),
    ).toBe('Bs 6.000.000 (≈ $120.000)')
  })
})
