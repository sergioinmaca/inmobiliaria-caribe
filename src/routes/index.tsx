import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from '../features/LandingPage'
import { CatalogPage } from '../features/catalog/CatalogPage'
import { PropertyDetailPage } from '../features/catalog/PropertyDetailPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route path="/inmueble/:id" element={<PropertyDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
