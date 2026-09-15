import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="flex flex-col gap-4">
      <section className="relative left-1/2 -mt-6 w-screen -translate-x-1/2">
        <picture>
          <source media="(min-width: 1024px)" srcSet="/brand/banner-placeholder.svg" />
          <img
            src="/brand/banner_landing.png"
            alt="Inmobiliaria Municipal Caribe"
            className="w-full object-cover lg:max-h-[420px]"
          />
        </picture>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          to="/catalogo"
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white p-8 text-center transition-colors hover:border-primary lg:p-12"
        >
          <span className="text-h3 font-semibold text-primary">Catálogo de Inmuebles</span>
        </Link>
        <div
          aria-disabled="true"
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white p-8 text-center opacity-50 lg:p-12"
        >
          <span className="text-h3 font-semibold text-neutral-500">Noticias y Reportes</span>
        </div>
      </section>
    </div>
  )
}
