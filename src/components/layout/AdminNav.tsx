import { NavLink } from 'react-router-dom'
import type { Role } from '../../types'

interface AdminNavProps {
  role?: Role
  onNavigate?: () => void
  variant?: 'light' | 'dark'
}

const lightLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-sm px-3 py-2 text-body font-medium transition-colors ${
    isActive ? 'bg-surface text-primary' : 'text-neutral-900 hover:bg-surface'
  }`

const darkLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-sm px-3 py-2 text-body font-medium transition-colors ${
    isActive ? 'bg-secondary text-white' : 'text-surface hover:bg-secondary'
  }`

export function AdminNav({ role, onNavigate, variant = 'light' }: AdminNavProps) {
  const linkClass = variant === 'dark' ? darkLinkClass : lightLinkClass

  return (
    <nav className="flex flex-col gap-1">
      <NavLink to="/admin" end className={linkClass} onClick={onNavigate}>
        Inmuebles
      </NavLink>
      {role === 'master' && (
        <NavLink to="/admin/usuarios" className={linkClass} onClick={onNavigate}>
          Usuarios
        </NavLink>
      )}
    </nav>
  )
}
