import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the brand title', () => {
    render(<App />)
    expect(screen.getByText('Inmobiliaria Municipal Caribe')).toBeInTheDocument()
  })
})
