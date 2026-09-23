import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PropertyFormPage } from './PropertyFormPage'
import { useSession } from '../../hooks/useSession'
import { supabase } from '../../lib/supabase'
import { deletePropertyFiles, listDriveFiles } from '../../lib/drive'
import { deleteProperty } from '../../lib/propertiesApi'

vi.mock('../../hooks/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('../../lib/drive', () => ({
  createDriveFolder: vi.fn(),
  deleteDriveFolder: vi.fn(),
  deletePropertyFiles: vi.fn(),
  listDriveFiles: vi.fn().mockResolvedValue([]),
  uploadDriveFile: vi.fn(),
  deleteDriveFile: vi.fn(),
  syncDriveFolder: vi.fn(),
}))
vi.mock('../../lib/propertiesApi', () => ({
  createProperty: vi.fn(),
  updateProperty: vi.fn(),
  updatePropertyImages: vi.fn(),
  setPropertyActive: vi.fn(),
  deleteProperty: vi.fn(),
}))

const mockedUseSession = vi.mocked(useSession)
const mockedFrom = vi.mocked(supabase.from)
const mockedDeletePropertyFiles = vi.mocked(deletePropertyFiles)
const mockedListDriveFiles = vi.mocked(listDriveFiles)
const mockedDeleteProperty = vi.mocked(deleteProperty)

const property = {
  id: 'p1',
  titulo: 'Casa de prueba',
  tipo: 'casa',
  parroquia: 'Chacao',
  price_usd: null,
  price_original: null,
  price_currency: null,
  price_is_ref: true,
  description: '',
  is_active: true,
  drive_folder_id: 'folder-1',
  images: [],
  created_at: '',
  updated_at: '',
}

function queryBuilder(table: string) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn(() =>
    Promise.resolve(
      table === 'settings'
        ? { data: { key: 'usd_to_bs_rate', value: '0' }, error: null }
        : { data: property, error: null },
    ),
  )
  builder.update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
  builder.insert = vi.fn(() => Promise.resolve({ error: null }))
  return builder
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/inmueble/p1']}>
      <Routes>
        <Route path="/admin/inmueble/:id" element={<PropertyFormPage />} />
        <Route path="/admin" element={<div>Listado admin</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PropertyFormPage — eliminar inmueble', () => {
  beforeEach(() => {
    mockedFrom.mockReset()
    mockedDeletePropertyFiles.mockReset()
    mockedListDriveFiles.mockReset()
    mockedListDriveFiles.mockResolvedValue([])
    mockedDeleteProperty.mockReset()
    mockedFrom.mockImplementation(((table: string) => queryBuilder(table)) as never)
    mockedUseSession.mockReturnValue({
      profile: {
        id: 'u1',
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
  })

  it('borra la fila, las fotos de Drive y navega al listado', async () => {
    const user = userEvent.setup()
    mockedDeleteProperty.mockResolvedValue({ data: { ok: true }, error: null })
    mockedDeletePropertyFiles.mockResolvedValue(true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderPage()

    await screen.findByRole('button', { name: 'Eliminar inmueble' })
    await user.click(screen.getByRole('button', { name: 'Eliminar inmueble' }))

    expect(mockedDeleteProperty).toHaveBeenCalledWith('p1')
    expect(mockedDeletePropertyFiles).toHaveBeenCalledWith({ fileIds: [], folderId: 'folder-1' })
    expect(await screen.findByText('Listado admin')).toBeInTheDocument()
  })

  it('no borra si el usuario cancela la confirmación', async () => {
    const user = userEvent.setup()
    mockedDeletePropertyFiles.mockResolvedValue(true)
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Eliminar inmueble' }))

    expect(mockedDeletePropertyFiles).not.toHaveBeenCalled()
    expect(mockedDeleteProperty).not.toHaveBeenCalled()
  })

  it('oculta el botón para el supervisor', async () => {
    mockedUseSession.mockReturnValue({
      profile: {
        id: 'u2',
        full_name: 'Beto',
        first_name: 'Beto',
        last_name: '',
        phone: null,
        email: 'beto@inmaca.com',
        role: 'supervisor',
        is_active: true,
        created_at: '',
      },
      loading: false,
      signOut: vi.fn(),
    })

    renderPage()

    await screen.findByText('Editar inmueble')
    expect(screen.queryByRole('button', { name: 'Eliminar inmueble' })).not.toBeInTheDocument()
  })

  it('en creación muestra el aviso y no habilita subir fotos', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/inmueble']}>
        <Routes>
          <Route path="/admin/inmueble" element={<PropertyFormPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText(/Las imágenes se agregan después de crear el inmueble/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Agregar fotos')).not.toBeInTheDocument()
  })
})
