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
  titulo: 'Apto La Florida',
  tipo_id: 't1',
  estado_id: 'e1',
  municipio_id: 'm1',
  parroquia_id: 'p1',
  parroquia: 'La Florida',
  habitaciones: 3,
  banos: 2,
  puestos_estacionamiento: 1,
  metros_construccion: 120,
  metros_terreno: null,
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
  tipo: { nombre: 'Apartamento' },
}

function chain(result: unknown) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.single = vi.fn(() => Promise.resolve(result))
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return builder
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
    mockedFrom.mockImplementation(((table: string) => {
      if (table === 'settings') return chain({ data: { key: 'usd_to_bs_rate', value: '50' }, error: null })
      if (table === 'tipos_inmueble') return chain({ data: [], error: null })
      if (table === 'estados') return chain({ data: [], error: null })
      return chain({ data: [inactiveProperty], error: null, count: 1 })
    }) as never)

    render(
      <MemoryRouter>
        <AdminListPage />
      </MemoryRouter>,
    )

    await screen.findAllByText('Apto La Florida')
    await user.click(screen.getAllByRole('button', { name: 'Activar' })[0])

    expect(await screen.findByText(/se necesita al menos 1 imagen/)).toBeInTheDocument()
  })
})
