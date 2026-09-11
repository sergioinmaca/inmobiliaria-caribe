import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PropertyCard } from './PropertyCard'
import type { Property } from '../../types'

const property: Property = {
  id: '1',
  title: 'Apartamento en La Florida',
  type: 'apartamento',
  zone: 'La Florida',
  price_usd: 120000,
  price_original: 120000,
  price_currency: 'usd',
  price_is_ref: false,
  description: '',
  is_active: true,
  drive_folder_id: null,
  images: [],
  created_at: '',
  updated_at: '',
}

describe('PropertyCard', () => {
  it('renderiza título, zona/tipo y precio', () => {
    render(
      <MemoryRouter>
        <PropertyCard property={property} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Apartamento en La Florida')).toBeInTheDocument()
    expect(screen.getByText('La Florida · apartamento')).toBeInTheDocument()
    expect(screen.getByText('$120.000')).toBeInTheDocument()
  })

  it('usa la primera foto por order como portada', () => {
    const withImages = {
      ...property,
      images: [
        { id: 'b', url: '/second.jpg', name: 'segunda', order: 1 },
        { id: 'a', url: '/first.jpg', name: 'primera', order: 0 },
      ],
    }
    render(
      <MemoryRouter>
        <PropertyCard property={withImages} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', '/first.jpg')
  })
})
