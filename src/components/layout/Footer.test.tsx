import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'
import { CONTACT, SOCIAL_LINKS } from '../../lib/contact'

describe('Footer', () => {
  it('muestra la dirección y enlaza a Google Maps', () => {
    render(<Footer />)
    expect(screen.getByText(/Av\. Teresa de la Parra, Santa Mónica/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Av\. Teresa de la Parra/ })).toHaveAttribute(
      'href',
      CONTACT.mapUrl,
    )
  })

  it('enlaza el teléfono y WhatsApp', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /Atención al Cliente/ })).toHaveAttribute(
      'href',
      `tel:${CONTACT.phone.tel}`,
    )
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      CONTACT.whatsapp.href,
    )
  })

  it('incluye las redes sociales', () => {
    render(<Footer />)
    for (const social of SOCIAL_LINKS) {
      expect(screen.getByRole('link', { name: social.label })).toHaveAttribute(
        'href',
        social.href,
      )
    }
  })
})
