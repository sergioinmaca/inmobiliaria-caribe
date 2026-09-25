import { Suspense } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react'
import { PageLoader } from '../ui/PageLoader'

/**
 * Crossfade entre las páginas de navegación (Inicio ↔ Catálogo).
 * Ambas se apilan en la misma celda de grid para solaparse sin medir el layout
 * y sin `popLayout`. El resto de rutas no pasa por aquí, así que no se animan.
 */
export function BrowseTransitionLayout() {
  const outlet = useOutlet()
  const location = useLocation()
  const reduce = useReducedMotion()

  return (
    <LazyMotion features={domAnimation}>
      <div className="grid">
        <AnimatePresence initial={false}>
          <m.div
            key={location.pathname}
            className="col-start-1 row-start-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeInOut' }}
          >
            <Suspense fallback={<PageLoader />}>{outlet}</Suspense>
          </m.div>
        </AnimatePresence>
      </div>
    </LazyMotion>
  )
}
