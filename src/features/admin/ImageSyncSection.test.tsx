import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageSyncSection } from './ImageSyncSection'
import { useSession } from '../../hooks/useSession'
import { listDriveFiles } from '../../lib/drive'
import type { Property } from '../../types'

vi.mock('../../hooks/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../lib/drive', () => ({
  listDriveFiles: vi.fn(),
  syncDriveFolder: vi.fn(),
}))

const mockedUseSession = vi.mocked(useSession)
const mockedListDriveFiles = vi.mocked(listDriveFiles)

const property: Property = {
  id: 'p1',
  title: 'Apto',
  type: 'apartamento',
  zone: 'La Florida',
  price_usd: null,
  price_original: null,
  price_currency: null,
  price_is_ref: true,
  description: '',
  is_active: false,
  drive_folder_id: 'folder-1',
  images: [],
  created_at: '',
  updated_at: '',
}

describe('ImageSyncSection', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      profile: { id: '1', full_name: 'Ana', role: 'gerente', is_active: true, created_at: '' },
      loading: false,
      signOut: vi.fn(),
    })
    mockedListDriveFiles.mockReset()
  })

  it('muestra aviso cuando Drive tiene archivos que no están en Supabase', async () => {
    mockedListDriveFiles.mockResolvedValue([{ id: 'f1', name: 'foto1.jpg' }])

    render(<ImageSyncSection property={property} />)

    expect(
      await screen.findByText(/desincronizadas con Drive/),
    ).toBeInTheDocument()
  })

  it('no muestra aviso cuando no hay desincronización', async () => {
    mockedListDriveFiles.mockResolvedValue([])

    render(<ImageSyncSection property={{ ...property, images: [] }} />)

    await screen.findByText(/imágenes registradas/)
    expect(screen.queryByText(/desincronizadas con Drive/)).not.toBeInTheDocument()
  })
})
