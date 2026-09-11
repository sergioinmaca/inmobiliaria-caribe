import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from '../features/LandingPage'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { PropertyDetailPage } from '../features/catalog/PropertyDetailPage'
import { LoginPage } from '../features/admin/LoginPage'
import { RequireRole } from '../features/admin/RequireRole'
import { AdminListPage } from '../features/admin/AdminListPage'
import { PropertyFormPage } from '../features/admin/PropertyFormPage'
import { UsersPage } from '../features/admin/UsersPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route path="/inmueble/:id" element={<PropertyDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireRole roles={['master', 'gerente', 'supervisor', 'invitado']}>
            <AdminListPage />
          </RequireRole>
        }
      />
      <Route
        path="/admin/inmueble"
        element={
          <RequireRole roles={['master', 'gerente']}>
            <PropertyFormPage />
          </RequireRole>
        }
      />
      <Route
        path="/admin/inmueble/:id"
        element={
          <RequireRole roles={['master', 'gerente', 'supervisor']}>
            <PropertyFormPage />
          </RequireRole>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <RequireRole roles={['master']}>
            <UsersPage />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
