import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { Header } from './Header'

describe('Header', () => {
  test('muestra Iniciar Sesión cuando no hay sesión', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
  })

  test('muestra el nombre cuando hay sesión', () => {
    const profile = {
      id: '1',
      full_name: 'Ana Pérez',
      role: 'gerente' as const,
      is_active: true,
      created_at: '',
    }
    render(
      <MemoryRouter>
        <Header profile={profile} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
  })
})
