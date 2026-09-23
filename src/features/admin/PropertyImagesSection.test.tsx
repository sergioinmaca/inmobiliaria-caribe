// src/features/admin/PropertyImagesSection.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PropertyImagesSection } from './PropertyImagesSection'
import { useSession } from '../../hooks/useSession'
import { listDriveFiles, uploadDriveFile, deleteDriveFile } from '../../lib/drive'
import { resizeImage, type ResizedImage } from '../../lib/imageResize'
import type { PropertyImage } from '../../types'

vi.mock('../../hooks/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../lib/drive', () => ({
  listDriveFiles: vi.fn(),
  syncDriveFolder: vi.fn(),
  uploadDriveFile: vi.fn(),
  deleteDriveFile: vi.fn(),
}))
vi.mock('../../lib/imageResize', () => ({ resizeImage: vi.fn() }))

const mockedUseSession = vi.mocked(useSession)
const mockedListDriveFiles = vi.mocked(listDriveFiles)
const mockedUploadDriveFile = vi.mocked(uploadDriveFile)
const mockedDeleteDriveFile = vi.mocked(deleteDriveFile)
const mockedResizeImage = vi.mocked(resizeImage)

const img = (id: string, order: number): PropertyImage => ({ id, url: `u/${id}`, name: `${id}.jpg`, order })

function renderSection(overrides: Partial<Parameters<typeof PropertyImagesSection>[0]> = {}) {
  const props = {
    images: [] as PropertyImage[],
    driveFolderId: 'folder-1' as string | null,
    propertyId: 'p1' as string | undefined,
    onChange: vi.fn(),
    ensureFolder: vi.fn().mockResolvedValue('folder-1'),
    ...overrides,
  }
  render(<PropertyImagesSection {...props} />)
  return props
}

describe('PropertyImagesSection', () => {
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
    mockedListDriveFiles.mockReset().mockResolvedValue([])
    mockedUploadDriveFile.mockReset()
    mockedDeleteDriveFile.mockReset()
    mockedResizeImage.mockReset()
  })

  it('muestra aviso cuando Drive tiene archivos que no están en Supabase', async () => {
    mockedListDriveFiles.mockResolvedValue([{ id: 'f1', name: 'foto1.jpg' }])
    renderSection()
    expect(await screen.findByText(/desincronizadas con Drive/)).toBeInTheDocument()
  })

  it('no muestra aviso cuando no hay desincronización', async () => {
    renderSection({ images: [] })
    await screen.findByText(/imágenes registradas/)
    expect(screen.queryByText(/desincronizadas con Drive/)).not.toBeInTheDocument()
  })

  it('sube una foto y la agrega al final', async () => {
    const user = userEvent.setup()
    const props = renderSection({ images: [] })
    mockedResizeImage.mockResolvedValue({ base64: 'abc', mimeType: 'image/jpeg', name: 'foto.jpg' })
    mockedUploadDriveFile.mockResolvedValue({ id: 'f1', name: 'foto.jpg', url: 'u/f1' })

    const file = new File(['x'], 'foto.png', { type: 'image/png', lastModified: 12345 })
    await user.upload(screen.getByLabelText('Agregar fotos'), file)

    expect(mockedUploadDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({ uploadKey: 'foto.png:1:12345', isActive: true }),
    )
    expect(props.onChange).toHaveBeenCalledWith([
      { id: 'f1', name: 'foto.jpg', url: 'u/f1', order: 0 },
    ])
  })

  it('no duplica si la foto ya existe (idempotente)', async () => {
    const user = userEvent.setup()
    const props = renderSection({ images: [img('f1', 0)] })
    mockedResizeImage.mockResolvedValue({ base64: 'abc', mimeType: 'image/jpeg', name: 'foto.jpg' })
    mockedUploadDriveFile.mockResolvedValue({ id: 'f1', name: 'foto.jpg', url: 'u/f1' })

    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Agregar fotos'), file)

    expect(props.onChange).not.toHaveBeenCalled()
  })

  it('reordena con el botón subir', async () => {
    const user = userEvent.setup()
    const props = renderSection({ images: [img('a', 0), img('b', 1)] })

    const upButtons = screen.getAllByRole('button', { name: 'Subir' })
    await user.click(upButtons[1])

    expect(props.onChange).toHaveBeenCalledWith([
      { id: 'b', name: 'b.jpg', url: 'u/b', order: 0 },
      { id: 'a', name: 'a.jpg', url: 'u/a', order: 1 },
    ])
  })

  it('elimina una foto de Drive y de la lista', async () => {
    const user = userEvent.setup()
    mockedDeleteDriveFile.mockResolvedValue(true)
    const props = renderSection({ images: [img('a', 0)] })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(mockedDeleteDriveFile).toHaveBeenCalledWith('folder-1', 'a')
    expect(props.onChange).toHaveBeenCalledWith([])
  })

  it('marca la primera foto como portada', () => {
    renderSection({ images: [img('a', 0), img('b', 1)] })
    expect(screen.getAllByText('Portada')).toHaveLength(1)
  })

  it('muestra el resumen al subir varias fotos', async () => {
    const user = userEvent.setup()
    const props = renderSection({ images: [] })
    mockedResizeImage
      .mockResolvedValueOnce({ base64: 'a', mimeType: 'image/jpeg', name: 'a.jpg' })
      .mockResolvedValueOnce({ base64: 'b', mimeType: 'image/jpeg', name: 'b.jpg' })
    mockedUploadDriveFile
      .mockResolvedValueOnce({ id: 'f1', name: 'a.jpg', url: 'u/f1' })
      .mockResolvedValueOnce({ id: 'f2', name: 'b.jpg', url: 'u/f2' })

    const files = [
      new File(['1'], 'a.png', { type: 'image/png' }),
      new File(['2'], 'b.png', { type: 'image/png' }),
    ]
    await user.upload(screen.getByLabelText('Agregar fotos'), files)

    expect(await screen.findByText('Se subieron 2 fotos.')).toBeInTheDocument()
    expect(props.onChange).toHaveBeenCalledTimes(1)
  })

  it('muestra el progreso del lote al subir', async () => {
    const user = userEvent.setup()
    renderSection({ images: [] })
    let resolveFirst!: (v: ResizedImage) => void
    const first = new Promise<ResizedImage>((resolve) => {
      resolveFirst = resolve
    })
    mockedResizeImage.mockReturnValueOnce(first)
    mockedResizeImage.mockResolvedValueOnce({ base64: 'b', mimeType: 'image/jpeg', name: 'b.jpg' })
    mockedUploadDriveFile.mockResolvedValue({ id: 'f1', name: 'a.jpg', url: 'u/f1' })

    const files = [
      new File(['1'], 'a.png', { type: 'image/png' }),
      new File(['2'], 'b.png', { type: 'image/png' }),
    ]
    await user.upload(screen.getByLabelText('Agregar fotos'), files)

    expect(await screen.findByText(/Subiendo 1 de 2/)).toBeInTheDocument()

    resolveFirst({ base64: 'a', mimeType: 'image/jpeg', name: 'a.jpg' })

    expect(await screen.findByText('Se subieron 2 fotos.')).toBeInTheDocument()
  })
})
