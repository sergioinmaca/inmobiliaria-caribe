import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { Button } from '../ui/Button'
import { PageLoader } from '../ui/PageLoader'
import { AdminNav } from './AdminNav'

export function AdminLayout() {
  const { profile, signOut } = useSession()

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 bg-primary lg:block">
        <div className="sticky top-0 flex flex-col gap-4 p-4">
          <h2 className="text-h3 font-semibold text-surface">Panel de Control</h2>
          <AdminNav role={profile?.role} variant="dark" />
          <div className="flex flex-col gap-2 border-t border-secondary pt-3">
            <span className="truncate text-small text-surface">{profile?.email}</span>
            <Button variant="danger" onClick={() => void signOut()}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="w-full px-4 py-6 md:px-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
