import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Filters } from './Filters'
import { DEFAULT_FILTERS } from '../../hooks/useProperties'
import type { Estado, TipoInmueble } from '../../types'

const tipos: TipoInmueble[] = [
  {
    id: 't1',
    nombre: 'Apartamento',
    icono: 'ri-building-4-fill',
    orden: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
]

const estados: Estado[] = [
  {
    id: 'e1',
    nombre: 'Miranda',
    municipios: [
      {
        id: 'm1',
        estado_id: 'e1',
        nombre: 'Baruta',
        parroquias: [{ id: 'p1', municipio_id: 'm1', nombre: 'Baruta' }],
      },
    ],
  },
]

describe('Filters', () => {
  it('emite el tipo seleccionado', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Filters value={DEFAULT_FILTERS} onChange={onChange} tipos={tipos} estados={estados} />)
    await user.selectOptions(screen.getByLabelText('Tipo'), 't1')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tipoId: 't1' }))
  })

  it('emite la parroquia seleccionada en cascada', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Filters
        value={{ ...DEFAULT_FILTERS, estadoId: 'e1', municipioId: 'm1' }}
        onChange={onChange}
        tipos={tipos}
        estados={estados}
      />,
    )
    await user.selectOptions(screen.getByLabelText('Parroquia'), 'p1')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ parroquiaId: 'p1' }))
  })
})
