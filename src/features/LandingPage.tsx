import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="relative left-1/2 -mt-6 w-screen -translate-x-1/2">
        <img
          src="/brand/banner_landing.png"
          alt="Inmobiliaria Municipal Caribe"
          className="w-full"
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
