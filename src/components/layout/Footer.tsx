export function Footer() {
  return (
    <footer className="flex flex-col items-center gap-2 bg-primary px-4 py-6 text-center">
      <img src="/brand/vertical_claro.svg" alt="Inmobiliaria Municipal Caribe" className="h-16 w-auto" />
      <p className="text-small text-surface">© {new Date().getFullYear()} Inmobiliaria Municipal Caribe</p>
    </footer>
  )
}
