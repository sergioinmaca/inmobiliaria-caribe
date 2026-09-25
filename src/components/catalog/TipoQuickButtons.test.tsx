import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TipoQuickButtons } from './TipoQuickButtons'
import type { TipoInmueble } from '../../types'

const tipos: TipoInmueble[] = [
  {
    id: 't1',
    nombre: 'Apartamento',
    icono: 'ri-building-4-fill',
    orden: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't2',
    nombre: 'Terreno',
    icono: null,
    orden: 2,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
]

describe('TipoQuickButtons', () => {
  it('genera un enlace al catálogo filtrado por cada tipo', () => {
    render(
      <MemoryRouter>
        <TipoQuickButtons tipos={tipos} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Apartamento' })).toHaveAttribute(
      'href',
      '/catalogo?tipo=t1',
    )
    expect(screen.getByRole('link', { name: 'Terreno' })).toHaveAttribute(
      'href',
      '/catalogo?tipo=t2',
    )
  })

  it('no renderiza nada sin tipos', () => {
    const { container } = render(
      <MemoryRouter>
        <TipoQuickButtons tipos={[]} />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
