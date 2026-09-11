import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { Container } from './components/layout/Container'
import { AppRoutes } from './routes'
import { useSession } from './hooks/useSession'

function App() {
  const { profile, signOut } = useSession()

  return (
    <div className="flex min-h-screen flex-col">
      <Header profile={profile} onSignOut={signOut} />
      <Container className="flex-1 py-6">
        <AppRoutes />
      </Container>
      <Footer />
    </div>
  )
}

export default App
