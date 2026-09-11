import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import type { Role } from '../../types'

interface RequireRoleProps {
  roles: Role[]
  children: ReactNode
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { profile, loading } = useSession()

  if (loading) return <p className="py-10 text-center text-neutral-500">Cargando...</p>
  if (!profile || !profile.is_active) return <Navigate to="/login" replace />
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />

  return <>{children}</>
}
