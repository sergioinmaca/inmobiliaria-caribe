import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renderiza el header y la landing', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
    expect(screen.getByText('Catálogo de Inmuebles')).toBeInTheDocument()
    expect(screen.getByText('Noticias y Reportes')).toBeInTheDocument()
  })
})
