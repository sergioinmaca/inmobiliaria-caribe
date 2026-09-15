import { lazy, Suspense, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { Profile } from '../../types'

const AdminMenu = lazy(() =>
  import('./AdminMenu').then((m) => ({ default: m.AdminMenu })),
)

interface HeaderProps {
  profile?: Profile | null
  onSignOut?: () => void
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-small font-medium transition-colors ${
    isActive ? 'text-primary' : 'text-neutral-500 hover:text-primary'
  }`

export function Header({ profile, onSignOut }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-neutral-300 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 md:px-6 lg:px-8">
        <Link to="/" className="block shrink-0">
          <img
            src="/brand/horizontal_color_v2.svg"
            alt="Inmobiliaria Municipal Caribe"
            className="h-10 w-auto"
          />
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-6 lg:flex">
          <NavLink to="/" end className={navLinkClass}>
            Inicio
          </NavLink>
          <NavLink to="/catalogo" className={navLinkClass}>
            Catálogo
          </NavLink>
          {profile && (
            <NavLink to="/admin" className={navLinkClass}>
              Administración
            </NavLink>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {profile ? (
            <>
              <div className="flex flex-col leading-tight lg:border-r lg:border-neutral-300 lg:pr-3">
                <span className="text-small font-semibold text-neutral-900">{profile.first_name}</span>
                <span className="text-small text-neutral-500">{profile.last_name}</span>
              </div>
              <button
                type="button"
                aria-label="Abrir menú"
                onClick={() => setMenuOpen(true)}
                className="flex flex-col gap-1 lg:hidden"
              >
                <span className="block h-0.5 w-5 bg-primary" />
                <span className="block h-0.5 w-5 bg-primary" />
                <span className="block h-0.5 w-5 bg-primary" />
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="hidden text-small font-semibold text-primary hover:text-secondary lg:inline-flex"
              >
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="whitespace-nowrap text-small font-semibold text-primary">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
      {profile && (
        <Suspense fallback={null}>
          <AdminMenu
            open={menuOpen}
            profile={profile}
            onClose={() => setMenuOpen(false)}
            onSignOut={onSignOut ?? (() => {})}
          />
        </Suspense>
      )}
    </header>
  )
}
