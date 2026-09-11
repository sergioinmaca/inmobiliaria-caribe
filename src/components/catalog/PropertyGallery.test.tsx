// src/components/catalog/PropertyGallery.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PropertyGallery } from './PropertyGallery'

describe('PropertyGallery', () => {
  it('arranca en la foto con order 0 (portada)', () => {
    render(
      <PropertyGallery
        images={[
          { id: 'b', url: '/second.jpg', name: 'segunda', order: 1 },
          { id: 'a', url: '/first.jpg', name: 'primera', order: 0 },
        ]}
      />,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', '/first.jpg')
  })

  it('muestra placeholder si no hay imágenes', () => {
    render(<PropertyGallery images={[]} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/brand/placeholder-property.svg')
  })
})
