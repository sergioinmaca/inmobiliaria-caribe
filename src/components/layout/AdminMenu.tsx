// src/components/layout/AdminMenu.tsx
import { AdminNav } from './AdminNav'
import { Button } from '../ui/Button'
import type { Profile } from '../../types'

interface AdminMenuProps {
  open: boolean
  profile: Profile
  onClose: () => void
  onSignOut: () => void
}

export function AdminMenu({ open, profile, onClose, onSignOut }: AdminMenuProps) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-neutral-900/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-72 flex-col bg-white shadow-lg transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-neutral-300 px-4 py-3">
          <h2 className="text-h3 font-semibold text-primary">Panel de Control</h2>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="text-body text-neutral-900"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <AdminNav role={profile.role} onNavigate={onClose} />
        </div>
        <div className="mt-auto flex flex-col gap-2 border-t border-neutral-300 p-4">
          <span className="text-small text-neutral-500">{profile.email}</span>
          <Button variant="danger" onClick={onSignOut}>
            Cerrar Sesión
          </Button>
        </div>
      </aside>
    </div>
  )
}
