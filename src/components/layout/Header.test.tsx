import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './Header'
import type { Profile } from '../../types'

const profile: Profile = {
  id: '1',
  full_name: 'Ana Pérez',
  first_name: 'Ana',
  last_name: 'Pérez',
  phone: null,
  email: 'ana@inmaca.com',
  role: 'gerente',
  is_active: true,
  created_at: '',
}

describe('Header', () => {
  it('muestra Iniciar Sesión cuando no hay sesión', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
  })

  it('muestra nombre, apellido y botón de menú cuando hay sesión', () => {
    render(
      <MemoryRouter>
        <Header profile={profile} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Pérez')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
  })
})
