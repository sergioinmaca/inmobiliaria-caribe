import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Container } from './Container'
import { PageLoader } from '../ui/PageLoader'

export function PublicLayout() {
  return (
    <Container className="flex-1 py-6">
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </Container>
  )
}
