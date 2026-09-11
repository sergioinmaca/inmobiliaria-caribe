import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <img
          src="/brand/banner-placeholder.svg"
          alt="Inmobiliaria Municipal Caribe"
          className="h-48 w-full rounded-md object-cover"
        />
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link
          to="/catalogo"
          className="flex flex-col items-center gap-2 rounded-md border border-neutral-300 bg-white p-6 text-center"
        >
          <span className="text-h3 font-semibold text-primary">Catálogo de Inmuebles</span>
        </Link>
        <div
          aria-disabled="true"
          className="flex flex-col items-center gap-2 rounded-md border border-neutral-300 bg-white p-6 text-center opacity-50"
        >
          <span className="text-h3 font-semibold text-neutral-500">Noticias y Reportes</span>
        </div>
      </section>
    </div>
  )
}
