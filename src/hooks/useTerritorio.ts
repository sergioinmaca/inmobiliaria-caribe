import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Estado } from '../types'

interface RawParroquia {
  id: string
  nombre: string
}

interface RawMunicipio {
  id: string
  nombre: string
  parroquias: RawParroquia[] | null
}

interface RawEstado {
  id: string
  nombre: string
  municipios: RawMunicipio[] | null
}

function byNombre(a: { nombre: string }, b: { nombre: string }) {
  return a.nombre.localeCompare(b.nombre, 'es')
}

function normalize(data: RawEstado[] | null): Estado[] {
  return (data ?? []).map((estado) => ({
    id: estado.id,
    nombre: estado.nombre,
    municipios: (estado.municipios ?? [])
      .map((municipio) => ({
        id: municipio.id,
        estado_id: estado.id,
        nombre: municipio.nombre,
        parroquias: (municipio.parroquias ?? [])
          .map((parroquia) => ({
            id: parroquia.id,
            municipio_id: municipio.id,
            nombre: parroquia.nombre,
          }))
          .sort(byNombre),
      }))
      .sort(byNombre),
  }))
}

/** Carga la división territorial (Estado → Municipio → Parroquia) para selects en cascada. */
export function useTerritorio() {
  const [estados, setEstados] = useState<Estado[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('estados')
      .select('id, nombre, municipios(id, nombre, parroquias(id, nombre))')
      .eq('is_active', true)
      .order('nombre', { ascending: true })

    setEstados(normalize(data as RawEstado[] | null))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const municipiosDe = useCallback(
    (estadoId: string) => estados.find((e) => e.id === estadoId)?.municipios ?? [],
    [estados],
  )

  const parroquiasDe = useCallback(
    (estadoId: string, municipioId: string) =>
      municipiosDe(estadoId).find((m) => m.id === municipioId)?.parroquias ?? [],
    [municipiosDe],
  )

  return { estados, loading, municipiosDe, parroquiasDe, refetch: load }
}
