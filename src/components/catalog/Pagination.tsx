interface PaginationProps {
  total: number
  page: number
  perPage: number
  onChange: (page: number) => void
}

export function Pagination({ total, page, perPage, onChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`h-9 w-9 rounded-sm text-body font-medium ${
            p === page ? 'bg-primary text-white' : 'border border-neutral-300 bg-white text-neutral-900'
          }`}
        >
          {p}
        </button>
      ))}
    </nav>
  )
}
