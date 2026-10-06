import { useEffect, useState } from 'react'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'motion/react'
import type { Variants } from 'motion/react'
import type { Ad } from '../../types/ads'

const AUTOPLAY_MS = 8000

const IMAGE_CLASS =
  'w-full object-cover aspect-[2.5/1] lg:aspect-[4/1]'

const ARROW_ICON_CLASS = 'h-[18px] w-[18px] lg:h-[25px] lg:w-[25px]'

const ARROW_BUTTON_CLASS =
  'absolute top-1/2 z-10 flex h-9 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-white transition-transform duration-200 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100 lg:h-11 lg:w-8'

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ARROW_ICON_CLASS}
      aria-hidden="true"
    >
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

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
  const [direction, setDirection] = useState(1)
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
      setDirection(1)
      setIndex((i) => (i + 1) % count)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [count, paused, reducedMotion])

  if (count === 0) return null

  const current = ads[index]
  const prev = () => {
    setDirection(-1)
    setIndex((i) => (i - 1 + count) % count)
  }
  const next = () => {
    setDirection(1)
    setIndex((i) => (i + 1) % count)
  }

  const variants: Variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 48 : -48 }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? -48 : 48,
      transition: { duration: reducedMotion ? 0 : 0.15, ease: 'easeIn' },
    }),
  }

  return (
    <LazyMotion features={domAnimation}>
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
        <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm">
          <div aria-live="polite" className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)]">
            <AnimatePresence initial={false} custom={direction}>
              <m.div
                key={current.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="col-start-1 row-start-1 min-w-0"
              >
                <AdImage ad={current} />
              </m.div>
            </AnimatePresence>
          </div>
        </div>

        {count >= 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Anterior"
              className={`${ARROW_BUTTON_CLASS} left-0 -translate-x-1/2 shadow-[6px_0_12px_-2px_rgba(83,85,87,0.85)]`}
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Siguiente"
              className={`${ARROW_BUTTON_CLASS} right-0 translate-x-1/2 shadow-[-6px_0_12px_-2px_rgba(83,85,87,0.85)]`}
            >
              <Chevron dir="right" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2 lg:gap-3">
              {ads.map((ad, i) => (
                <button
                  key={ad.id}
                  type="button"
                  onClick={() => {
                    setDirection(i > index ? 1 : -1)
                    setIndex(i)
                  }}
                  aria-label={`Ir al anuncio ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  className={
                    i === index
                      ? 'h-2 w-2 rounded-full bg-primary ring-2 ring-white transition-transform duration-200 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100 lg:h-[11px] lg:w-[11px]'
                      : 'h-2 w-2 rounded-full bg-neutral-500 ring-2 ring-white transition-transform duration-200 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100 lg:h-[11px] lg:w-[11px]'
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </LazyMotion>
  )
}
