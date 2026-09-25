import { useEffect, useState } from 'react'
import type { Ad } from '../../types/ads'

const AUTOPLAY_MS = 8000

const IMAGE_CLASS =
  'w-full object-cover aspect-[2.5/1] lg:aspect-[4/1]'

function AdImage({ ad }: { ad: Ad }) {
  const image = ad.image_url_mobile ? (
    <picture>
      <source media="(max-width: 1023px)" srcSet={ad.image_url_mobile} />
      <img src={ad.image_url} alt={ad.title} className={IMAGE_CLASS} />
    </picture>
  ) : (
    <img src={ad.image_url} alt={ad.title} className={IMAGE_CLASS} />
  )

  if (ad.link_url) {
    return (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
        {image}
      </a>
    )
  }

  return image
}

export function AdsCarousel({ ads }: { ads: Ad[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const count = ads.length

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (count <= 1 || paused || reducedMotion) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [count, paused, reducedMotion])

  if (count === 0) return null

  const current = ads[index]
  const prev = () => setIndex((i) => (i - 1 + count) % count)
  const next = () => setIndex((i) => (i + 1) % count)

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Publicidad"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div aria-live="polite">
        <AdImage ad={current} />
      </div>

      {count >= 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-sm bg-white/80 px-2 py-1 text-body md:px-3 md:py-2 md:text-h3"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm bg-white/80 px-2 py-1 text-body md:px-3 md:py-2 md:text-h3"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {ads.map((ad, i) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir al anuncio ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={
                  i === index
                    ? 'h-2 w-2 rounded-full bg-primary'
                    : 'h-2 w-2 rounded-full bg-white/80'
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
