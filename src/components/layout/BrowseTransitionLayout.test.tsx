import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BrowseTransitionLayout } from './BrowseTransitionLayout'

describe('BrowseTransitionLayout', () => {
  it('renderiza el contenido de la ruta anidada', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<BrowseTransitionLayout />}>
            <Route index element={<div>Contenido de Inicio</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Contenido de Inicio')).toBeInTheDocument()
  })
})
