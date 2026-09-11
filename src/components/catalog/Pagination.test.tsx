import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('genera el número correcto de páginas', () => {
    render(<Pagination total={50} page={1} perPage={20} onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('no renderiza si hay una sola página', () => {
    render(<Pagination total={20} page={1} perPage={20} onChange={() => {}} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('llama onChange al seleccionar otra página', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination total={50} page={1} perPage={20} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenCalledWith(3)
  })
})
