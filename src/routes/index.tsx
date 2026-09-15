import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireRole } from '../features/admin/RequireRole'
import { AdminLayout } from '../components/layout/AdminLayout'
import { PublicLayout } from '../components/layout/PublicLayout'

const LandingPage = lazy(() =>
  import('../features/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const CatalogPage = lazy(() =>
  import('../features/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })),
)
const PropertyDetailPage = lazy(() =>
  import('../features/catalog/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })),
)
const LoginPage = lazy(() =>
  import('../features/admin/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const AdminListPage = lazy(() =>
  import('../features/admin/AdminListPage').then((m) => ({ default: m.AdminListPage })),
)
const PropertyFormPage = lazy(() =>
  import('../features/admin/PropertyFormPage').then((m) => ({ default: m.PropertyFormPage })),
)
const UsersPage = lazy(() =>
  import('../features/admin/UsersPage').then((m) => ({ default: m.UsersPage })),
)

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/inmueble/:id" element={<PropertyDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route
        element={
          <RequireRole roles={['master', 'gerente', 'supervisor', 'invitado']}>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route path="admin" element={<AdminListPage />} />
        <Route
          path="admin/inmueble"
          element={
            <RequireRole roles={['master', 'gerente']}>
              <PropertyFormPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/inmueble/:id"
          element={
            <RequireRole roles={['master', 'gerente', 'supervisor']}>
              <PropertyFormPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/usuarios"
          element={
            <RequireRole roles={['master']}>
              <UsersPage />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
