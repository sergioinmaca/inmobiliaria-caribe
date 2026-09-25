import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AdsCarousel } from './AdsCarousel'
import type { Ad } from '../../types/ads'

function makeAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: '1',
    title: 'Anuncio 1',
    image_url: '/ads/1.webp',
    image_url_mobile: null,
    link_url: null,
    is_active: true,
    sort_order: 1,
    starts_at: null,
    ends_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('AdsCarousel', () => {
  it('muestra el primer anuncio', () => {
    render(
      <AdsCarousel
        ads={[
          makeAd({ id: '1', image_url: '/ads/1.webp' }),
          makeAd({ id: '2', title: 'Anuncio 2', image_url: '/ads/2.webp' }),
        ]}
      />,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', '/ads/1.webp')
  })

  it('avanza al siguiente y retrocede al anterior', async () => {
    const user = userEvent.setup()
    render(
      <AdsCarousel
        ads={[
          makeAd({ id: '1', image_url: '/ads/1.webp' }),
          makeAd({ id: '2', title: 'Anuncio 2', image_url: '/ads/2.webp' }),
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('img')).toHaveAttribute('src', '/ads/2.webp')

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByRole('img')).toHaveAttribute('src', '/ads/1.webp')
  })

  it('renderiza como enlace si tiene link_url', () => {
    render(<AdsCarousel ads={[makeAd({ link_url: 'https://example.com' })]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('con un solo anuncio muestra flechas y un dot', () => {
    render(<AdsCarousel ads={[makeAd()]} />)
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir al anuncio 1' })).toBeInTheDocument()
  })

  it('muestra un dot por anuncio', () => {
    render(
      <AdsCarousel
        ads={[
          makeAd({ id: '1' }),
          makeAd({ id: '2', title: 'Anuncio 2' }),
          makeAd({ id: '3', title: 'Anuncio 3' }),
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Ir al anuncio 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir al anuncio 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir al anuncio 3' })).toBeInTheDocument()
  })
})
