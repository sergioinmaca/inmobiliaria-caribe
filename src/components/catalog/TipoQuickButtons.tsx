import { Link } from 'react-router-dom'
import type { TipoInmueble } from '../../types'
import { DEFAULT_TIPO_ICON } from '../../lib/tipoIconos'

interface TipoQuickButtonsProps {
  tipos: TipoInmueble[]
}

/** Acceso rápido por tipo de inmueble: lleva al catálogo ya filtrado. */
export function TipoQuickButtons({ tipos }: TipoQuickButtonsProps) {
  if (tipos.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3 font-semibold text-primary">Explora por tipo</h2>
      <ul className="-mx-4 flex snap-x items-start justify-start gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:justify-center md:px-0">
        {tipos.map((t) => (
          <li key={t.id} className="shrink-0 snap-start">
            <Link
              to={`/catalogo?tipo=${t.id}`}
              className="group flex w-24 flex-col items-center gap-2 rounded-md text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-h2 text-primary transition-colors group-hover:border-primary group-hover:bg-surface">
                <i className={`${t.icono ?? DEFAULT_TIPO_ICON} leading-none`} aria-hidden="true" />
              </span>
              <span className="flex min-h-[2.5rem] items-start justify-center text-small font-medium leading-tight text-neutral-900">
                {t.nombre}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
