import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}))

vi.mock('./hooks/useAds', () => ({
  useAds: () => ({ ads: [], loading: false, error: null, refetch: vi.fn() }),
}))

describe('App', () => {
  it('renderiza el header y la landing', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
    expect(await screen.findByText('Catálogo de Inmuebles')).toBeInTheDocument()
    expect(screen.getByText('Noticias y Reportes')).toBeInTheDocument()
  })
})
