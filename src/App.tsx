import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { AppRoutes } from './routes'
import { useSession } from './hooks/useSession'

function App() {
  const { profile, signOut } = useSession()

  return (
    <div className="flex min-h-screen flex-col">
      <Header profile={profile} onSignOut={signOut} />
      <main className="flex flex-1 flex-col">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  )
}

export default App
