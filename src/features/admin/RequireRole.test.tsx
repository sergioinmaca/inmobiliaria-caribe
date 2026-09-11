import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from './RequireRole'
import { useSession } from '../../hooks/useSession'

vi.mock('../../hooks/useSession', () => ({
  useSession: vi.fn(),
}))

const mockedUseSession = vi.mocked(useSession)

const baseProfile = {
  id: '1',
  full_name: 'Ana Pérez',
  first_name: 'Ana',
  last_name: 'Pérez',
  phone: null,
  email: 'ana@inmaca.com',
  role: 'gerente' as const,
  is_active: true,
  created_at: '',
}

describe('RequireRole', () => {
  beforeEach(() => {
    mockedUseSession.mockReset()
  })

  it('redirige a login si no hay sesión', () => {
    mockedUseSession.mockReturnValue({ profile: null, loading: false, signOut: vi.fn() })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['gerente', 'master']}>
                <div>ok</div>
              </RequireRole>
            }
          />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('login')).toBeInTheDocument()
  })

  it('redirige a home si el rol no aplica', () => {
    mockedUseSession.mockReturnValue({
      profile: { ...baseProfile, role: 'invitado' },
      loading: false,
      signOut: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['gerente', 'master']}>
                <div>ok</div>
              </RequireRole>
            }
          />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('permite acceso con rol válido', () => {
    mockedUseSession.mockReturnValue({
      profile: { ...baseProfile, role: 'gerente' },
      loading: false,
      signOut: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['gerente', 'master']}>
                <div>ok</div>
              </RequireRole>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})
