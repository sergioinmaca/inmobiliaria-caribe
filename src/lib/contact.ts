// Datos de contacto institucionales mostrados en el footer.

export const CONTACT = {
  addressLines: [
    'Av. Teresa de la Parra, Santa Mónica, entre Calle Agustín Codazzi y Ramón Ignacio Méndez',
    'Edif. Codazzi, PB, Local N° 1, Urb. Santa Mónica, Caracas, Distrito Capital',
  ],
  mapUrl: 'https://maps.app.goo.gl/znEWfYpY9ejtF3dm9',
  phone: {
    label: 'Atención al Cliente',
    display: '0424-2174084',
    tel: '+584242174084',
  },
  whatsapp: {
    display: '0424-2174084',
    href: 'https://wa.me/584242174084',
  },
  hours: 'De lunes a viernes, de 8:00am a 5:00pm',
}

export interface SocialLink {
  label: string
  href: string
  /** Clase de Remix Icon. */
  icon: string
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/inmobicaribe/', icon: 'ri-instagram-fill' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@inmobicaribe_', icon: 'ri-tiktok-fill' },
  { label: 'WhatsApp', href: CONTACT.whatsapp.href, icon: 'ri-whatsapp-fill' },
]
