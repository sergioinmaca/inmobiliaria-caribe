import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { Container } from './components/layout/Container'
import { AppRoutes } from './routes'

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Container className="flex-1 py-6">
        <AppRoutes />
      </Container>
      <Footer />
    </div>
  )
}

export default App
