export function PageLoader() {
  return (
    <div className="flex flex-col items-center gap-3 py-10" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary" />
      <p className="text-small text-neutral-500">Cargando…</p>
    </div>
  )
}
