import { PROPERTY_TYPES, ZONES } from '../../lib/constants'
import type { PropertyFilters } from '../../hooks/useProperties'

interface FiltersProps {
  value: PropertyFilters
  onChange: (filters: PropertyFilters) => void
}

export function Filters({ value, onChange }: FiltersProps) {
  const set = (patch: Partial<PropertyFilters>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-300 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-type" className="text-small font-medium text-neutral-900">
            Tipo
          </label>
          <select
            id="filter-type"
            value={value.type}
            onChange={(e) => set({ type: e.target.value as PropertyFilters['type'] })}
            className="rounded-sm border border-neutral-300 px-2 py-2 text-body"
          >
            <option value="all">Todos</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-zone" className="text-small font-medium text-neutral-900">
            Zona
          </label>
          <select
            id="filter-zone"
            value={value.zone}
            onChange={(e) => set({ zone: e.target.value })}
            className="rounded-sm border border-neutral-300 px-2 py-2 text-body"
          >
            <option value="">Todas</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-min" className="text-small font-medium text-neutral-900">
            Precio mín. (USD)
          </label>
          <input
            id="filter-min"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={value.minPrice ?? ''}
            onChange={(e) => set({ minPrice: e.target.value === '' ? null : Number(e.target.value) })}
            className="rounded-sm border border-neutral-300 px-2 py-2 text-body"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-max" className="text-small font-medium text-neutral-900">
            Precio máx. (USD)
          </label>
          <input
            id="filter-max"
            type="number"
            inputMode="numeric"
            placeholder="—"
            value={value.maxPrice ?? ''}
            onChange={(e) => set({ maxPrice: e.target.value === '' ? null : Number(e.target.value) })}
            className="rounded-sm border border-neutral-300 px-2 py-2 text-body"
          />
        </div>
      </div>
    </div>
  )
}
