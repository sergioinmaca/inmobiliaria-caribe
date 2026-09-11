import { useState } from 'react'
import { sortImages } from '../../lib/images'
import type { PropertyImage } from '../../types'

export function PropertyGallery({ images }: { images: PropertyImage[] }) {
  const [index, setIndex] = useState(0)
  const sorted = sortImages(images)

  if (sorted.length === 0) {
    return (
      <img
        src="/brand/placeholder-property.svg"
        alt="Sin imágenes disponibles"
        className="h-64 w-full rounded-md object-cover"
      />
    )
  }

  const current = sorted[index]
  const prev = () => setIndex((i) => (i - 1 + sorted.length) % sorted.length)
  const next = () => setIndex((i) => (i + 1) % sorted.length)

  return (
    <div className="relative">
      <img
        src={current.url}
        alt={`${current.name} (${index + 1} de ${sorted.length})`}
        className="h-64 w-full rounded-md object-cover"
      />
      <button
        type="button"
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-sm bg-white/80 px-2 py-1 text-body"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm bg-white/80 px-2 py-1 text-body"
      >
        ›
      </button>
    </div>
  )
}
