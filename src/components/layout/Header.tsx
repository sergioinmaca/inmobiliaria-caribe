import { Link } from 'react-router-dom'
import type { Profile } from '../../types'

interface HeaderProps {
  profile?: Profile | null
}

export function Header({ profile }: HeaderProps) {
  return (
    <header className="flex items-center border-b border-neutral-300 bg-white px-4 py-2">
      <div className="flex items-center" style={{ width: '85%' }}>
        <Link to="/" className="block">
          <img
            src="/brand/horizontal_color.svg"
            alt="Inmobiliaria Municipal Caribe"
            className="h-10 w-auto"
          />
        </Link>
      </div>
      <div
        className="flex items-center justify-end gap-3 border-l border-neutral-300 pl-3"
        style={{ width: '15%' }}
      >
        {profile ? (
          <Link to="/admin" className="text-small font-semibold text-primary">
            {profile.full_name}
          </Link>
        ) : (
          <Link to="/login" className="text-small font-semibold text-primary">
            Iniciar Sesión
          </Link>
        )}
      </div>
    </header>
  )
}
