import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { Container } from './components/layout/Container'

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Container className="flex-1 py-6">
        <h1 className="text-h1 font-bold text-primary">Inmobiliaria Municipal Caribe</h1>
      </Container>
      <Footer />
    </div>
  )
}

export default App
