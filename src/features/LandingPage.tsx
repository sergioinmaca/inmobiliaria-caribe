import { Link } from 'react-router-dom'
import { AdsCarousel } from '../components/ads/AdsCarousel'
import { TipoQuickButtons } from '../components/catalog/TipoQuickButtons'
import { useAds } from '../hooks/useAds'
import { useTiposInmueble } from '../hooks/useTiposInmueble'

export function LandingPage() {
  const { ads, loading } = useAds()
  const { tipos } = useTiposInmueble()

  return (
    <div className="flex flex-col gap-4">
      <section className="relative left-1/2 -mt-6 w-screen -translate-x-1/2">
        {loading ? (
          <div
            role="status"
            aria-label="Cargando publicidad"
            className="aspect-[2.5/1] w-full animate-pulse bg-neutral-200 lg:aspect-[4/1]"
          />
        ) : ads.length > 0 ? (
          <AdsCarousel ads={ads} />
        ) : (
          <img
            src="/brand/banner_landing.png"
            alt="Inmobiliaria Municipal Caribe"
            className="w-full object-cover lg:max-h-[420px]"
          />
        )}
      </section>

      <TipoQuickButtons tipos={tipos} />

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
