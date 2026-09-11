import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminListPage } from './AdminListPage'
import { useSession } from '../../hooks/useSession'
import { supabase } from '../../lib/supabase'

vi.mock('../../hooks/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))

const mockedUseSession = vi.mocked(useSession)
const mockedFrom = vi.mocked(supabase.from)

const inactiveProperty = {
  id: '1',
  title: 'Apto La Florida',
  type: 'apartamento',
  zone: 'La Florida',
  price_usd: null,
  price_original: null,
  price_currency: null,
  price_is_ref: true,
  description: '',
  is_active: false,
  drive_folder_id: null,
  images: [],
  created_at: '',
  updated_at: '',
}

describe('AdminListPage', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      profile: {
        id: '1',
        full_name: 'Ana',
        first_name: 'Ana',
        last_name: '',
        phone: null,
        email: 'ana@inmaca.com',
        role: 'gerente',
        is_active: true,
        created_at: '',
      },
      loading: false,
      signOut: vi.fn(),
    })
    mockedFrom.mockReset()
  })

  it('bloquea activar sin imágenes y muestra el error', async () => {
    const user = userEvent.setup()
    mockedFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [inactiveProperty], error: null }),
      }),
    } as unknown as ReturnType<typeof supabase.from>)

    render(
      <MemoryRouter>
        <AdminListPage />
      </MemoryRouter>,
    )

    await screen.findByText('Apto La Florida')
    await user.click(screen.getByRole('button', { name: 'Activar' }))

    expect(await screen.findByText(/se necesita al menos 1 imagen/)).toBeInTheDocument()
  })
})
