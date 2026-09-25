import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CatalogPage } from './CatalogPage'
import { DEFAULT_FILTERS } from '../../hooks/useProperties'

const { usePropertiesMock } = vi.hoisted(() => ({ usePropertiesMock: vi.fn() }))

vi.mock('../../hooks/useProperties', async () => {
  const actual =
    await vi.importActual<typeof import('../../hooks/useProperties')>('../../hooks/useProperties')
  return { ...actual, useProperties: usePropertiesMock }
})

vi.mock('../../hooks/useTiposInmueble', () => ({
  useTiposInmueble: () => ({ tipos: [], loading: false, refetch: vi.fn() }),
}))

vi.mock('../../hooks/useTerritorio', () => ({
  useTerritorio: () => ({ estados: [], loading: false }),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CatalogPage />
    </MemoryRouter>,
  )
}

describe('CatalogPage', () => {
  it('inicializa el filtro de tipo desde el query param ?tipo=', () => {
    usePropertiesMock.mockReturnValue({
      properties: [],
      total: 0,
      page: 1,
      setPage: vi.fn(),
      loading: false,
      error: null,
      filters: { ...DEFAULT_FILTERS, tipoId: 't1' },
      setFilters: vi.fn(),
      refetch: vi.fn(),
    })

    renderAt('/catalogo?tipo=t1')

    expect(usePropertiesMock).toHaveBeenCalledWith('t1')
  })
})
