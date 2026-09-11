import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminMenu } from './AdminMenu'
import type { Profile } from '../../types'

interface HeaderProps {
  profile?: Profile | null
  onSignOut?: () => void
}

export function Header({ profile, onSignOut }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex items-center justify-between border-b border-neutral-300 bg-white px-4 py-2">
      <div className="flex flex-1 items-center justify-center self-stretch">
        <Link to="/" className="block">
          <img
            src="/brand/horizontal_color_v2.svg"
            alt="Inmobiliaria Municipal Caribe"
            className="h-10 w-auto"
          />
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-l border-neutral-300 pl-3">
        {profile ? (
          <>
            <div className="flex flex-col leading-tight">
              <span className="text-small font-semibold text-neutral-900">{profile.first_name}</span>
              <span className="text-small text-neutral-500">{profile.last_name}</span>
            </div>
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
              className="flex flex-col gap-1"
            >
              <span className="block h-0.5 w-5 bg-primary" />
              <span className="block h-0.5 w-5 bg-primary" />
              <span className="block h-0.5 w-5 bg-primary" />
            </button>
          </>
        ) : (
          <Link to="/login" className="whitespace-nowrap text-small font-semibold text-primary">
            Iniciar Sesión
          </Link>
        )}
      </div>
      {profile && (
        <AdminMenu
          open={menuOpen}
          profile={profile}
          onClose={() => setMenuOpen(false)}
          onSignOut={onSignOut ?? (() => {})}
        />
      )}
    </header>
  )
}
