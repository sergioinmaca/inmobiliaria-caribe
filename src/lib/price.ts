import type { PriceCurrency, Property } from '../types'

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(value)
}

export function formatPrice(
  property: Pick<Property, 'price_is_ref' | 'price_currency' | 'price_original' | 'price_usd'>,
): string {
  if (property.price_is_ref) return 'REF.'
  if (property.price_currency === 'usd') return `$${formatNumber(property.price_original ?? 0)}`
  if (property.price_currency === 'bs' && property.price_usd != null) {
    return `Bs ${formatNumber(property.price_original ?? 0)} (≈ $${formatNumber(property.price_usd)})`
  }
  return 'REF.'
}

export function normalizePriceUsd(
  currency: PriceCurrency | null,
  amount: number | null,
  isRef: boolean,
  rate: number,
): number | null {
  if (isRef || amount == null || currency == null) return null
  if (currency === 'usd') return amount
  if (rate > 0) return amount / rate
  return null
}
