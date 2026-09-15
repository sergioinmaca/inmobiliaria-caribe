// src/components/layout/AdminMenu.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminMenu } from './AdminMenu'
import type { Profile, Role } from '../../types'

const profile = (role: Role): Profile => ({
  id: '1',
  full_name: 'Ana Pérez',
  first_name: 'Ana',
  last_name: 'Pérez',
  phone: null,
  email: 'ana@inmaca.com',
  role,
  is_active: true,
  created_at: '',
})

describe('AdminMenu', () => {
  it('muestra el título y el correo', () => {
    render(
      <MemoryRouter>
        <AdminMenu open profile={profile('gerente')} onClose={vi.fn()} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Panel de Control')).toBeInTheDocument()
    expect(screen.getByText('ana@inmaca.com')).toBeInTheDocument()
  })

  it('muestra Usuarios solo para master', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AdminMenu open profile={profile('master')} onClose={vi.fn()} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <AdminMenu open profile={profile('gerente')} onClose={vi.fn()} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })

  it('cierra sesión al pulsar Cerrar Sesión', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(
      <MemoryRouter>
        <AdminMenu open profile={profile('master')} onClose={vi.fn()} onSignOut={onSignOut} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Cerrar Sesión' }))
    expect(onSignOut).toHaveBeenCalled()
  })
})
