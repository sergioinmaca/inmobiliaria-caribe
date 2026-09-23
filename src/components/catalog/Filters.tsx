import type { ReactNode } from 'react'
import type { Estado, TipoInmueble } from '../../types'
import type { PropertyFilters } from '../../hooks/useProperties'

interface FiltersProps {
  value: PropertyFilters
  onChange: (filters: PropertyFilters) => void
  tipos?: TipoInmueble[]
  estados?: Estado[]
  children?: ReactNode
}

const selectClass = 'rounded-sm border border-neutral-300 px-2 py-2 text-body'
const labelClass = 'text-small font-medium text-neutral-900'

export function Filters({ value, onChange, tipos = [], estados = [], children }: FiltersProps) {
  const set = (patch: Partial<PropertyFilters>) => onChange({ ...value, ...patch })

  const municipios = estados.find((e) => e.id === value.estadoId)?.municipios ?? []
  const parroquias = municipios.find((m) => m.id === value.municipioId)?.parroquias ?? []

  return (
    <div className="flex flex-col gap-3 rounded-md bg-white p-4">
      <h2 className="text-h3 font-semibold text-primary">Filtros</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-1">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-type" className={labelClass}>
            Tipo
          </label>
          <select
            id="filter-type"
            value={value.tipoId}
            onChange={(e) => set({ tipoId: e.target.value })}
            className={selectClass}
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-estado-territorio" className={labelClass}>
            Estado
          </label>
          <select
            id="filter-estado-territorio"
            value={value.estadoId}
            onChange={(e) => set({ estadoId: e.target.value, municipioId: '', parroquiaId: '' })}
            className={selectClass}
          >
            <option value="">Todos</option>
            {estados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-municipio" className={labelClass}>
            Municipio
          </label>
          <select
            id="filter-municipio"
            value={value.municipioId}
            onChange={(e) => set({ municipioId: e.target.value, parroquiaId: '' })}
            disabled={!value.estadoId}
            className={`${selectClass} disabled:opacity-50`}
          >
            <option value="">Todos</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-parroquia" className={labelClass}>
            Parroquia
          </label>
          <select
            id="filter-parroquia"
            value={value.parroquiaId}
            onChange={(e) => set({ parroquiaId: e.target.value })}
            disabled={!value.municipioId}
            className={`${selectClass} disabled:opacity-50`}
          >
            <option value="">Todas</option>
            {parroquias.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-min" className={labelClass}>
            Precio mín. (USD)
          </label>
          <input
            id="filter-min"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={value.minPrice ?? ''}
            onChange={(e) => set({ minPrice: e.target.value === '' ? null : Number(e.target.value) })}
            className={selectClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-max" className={labelClass}>
            Precio máx. (USD)
          </label>
          <input
            id="filter-max"
            type="number"
            inputMode="numeric"
            placeholder="—"
            value={value.maxPrice ?? ''}
            onChange={(e) => set({ maxPrice: e.target.value === '' ? null : Number(e.target.value) })}
            className={selectClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-habitaciones" className={labelClass}>
            Habitaciones (mín.)
          </label>
          <input
            id="filter-habitaciones"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="—"
            value={value.minHabitaciones ?? ''}
            onChange={(e) =>
              set({ minHabitaciones: e.target.value === '' ? null : Number(e.target.value) })
            }
            className={selectClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-banos" className={labelClass}>
            Baños (mín.)
          </label>
          <input
            id="filter-banos"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="—"
            value={value.minBanos ?? ''}
            onChange={(e) => set({ minBanos: e.target.value === '' ? null : Number(e.target.value) })}
            className={selectClass}
          />
        </div>
      </div>
      {children}
    </div>
  )
}
