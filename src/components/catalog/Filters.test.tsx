import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Filters } from './Filters'
import type { PropertyFilters } from '../../hooks/useProperties'

const initial: PropertyFilters = { type: 'all', zone: '', minPrice: null, maxPrice: null }

describe('Filters', () => {
  it('emite el tipo seleccionado', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Filters value={initial} onChange={onChange} />)
    await user.selectOptions(screen.getByLabelText('Tipo'), 'apartamento')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'apartamento' }))
  })

  it('emite la zona seleccionada', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Filters value={initial} onChange={onChange} />)
    await user.selectOptions(screen.getByLabelText('Zona'), 'La Florida')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ zone: 'La Florida' }))
  })
})
