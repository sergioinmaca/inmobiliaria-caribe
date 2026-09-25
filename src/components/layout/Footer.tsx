import { Container } from './Container'
import { CONTACT, SOCIAL_LINKS } from '../../lib/contact'

const linkClass =
  'flex gap-2 text-small transition-colors hover:text-accent focus-visible:text-accent'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-primary text-surface">
      <Container className="flex flex-col gap-8 py-[15px] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="flex items-center justify-center md:self-center md:px-8">
          <img
            src="/brand/vertical_claro_v2.svg"
            alt="Inmobiliaria Municipal Caribe"
            className="h-16 w-auto"
          />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href={`tel:${CONTACT.phone.tel}`} className={`${linkClass} items-center`}>
              <i className="ri-phone-fill text-h3 leading-none" aria-hidden="true" />
              <span>
                {CONTACT.phone.display} · {CONTACT.phone.label}
              </span>
            </a>

            <p className={`${linkClass} items-center`}>
              <i className="ri-time-line text-h3 leading-none" aria-hidden="true" />
              <span>{CONTACT.hours}</span>
            </p>
          </div>

          <a
            href={CONTACT.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} items-start`}
          >
            <i className="ri-map-pin-line mt-0.5 text-h3 leading-none" aria-hidden="true" />
            <span>
              {CONTACT.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </a>
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:items-end md:self-center md:px-8">
          <ul className="flex items-center gap-5">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-primary transition-colors hover:bg-secondary hover:text-surface focus-visible:bg-secondary focus-visible:text-surface"
                >
                  <i className={`${social.icon} text-[25px] leading-none`} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-surface/20">
        <Container className="py-3 text-center text-[12px]">
          Inmobiliaria Municipal Caribe © {year} · RIF: G-20016595-2
        </Container>
      </div>
    </footer>
  )
}
