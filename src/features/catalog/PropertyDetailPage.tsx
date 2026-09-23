import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PropertyGallery } from '../../components/catalog/PropertyGallery'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/price'
import type { Property } from '../../types'

const DETAIL_SELECT =
  '*, tipo:tipos_inmueble(nombre), estado:estados(nombre), municipio:municipios(nombre)'

interface DetalleItem {
  label: string
  value: string
}

function buildDetalles(property: Property): DetalleItem[] {
  const items: DetalleItem[] = []
  if (property.habitaciones != null) {
    items.push({ label: 'Habitaciones', value: String(property.habitaciones) })
  }
  if (property.banos != null) {
    items.push({ label: 'Baños', value: String(property.banos) })
  }
  if (property.puestos_estacionamiento != null) {
    items.push({ label: 'Puestos de estacionamiento', value: String(property.puestos_estacionamiento) })
  }
  if (property.metros_construccion != null) {
    items.push({ label: 'Metros construidos', value: `${property.metros_construccion} m²` })
  }
  if (property.metros_terreno != null) {
    items.push({ label: 'Metros de terreno', value: `${property.metros_terreno} m²` })
  }
  return items
}

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from('propiedades')
      .select(DETAIL_SELECT)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setNotFound(true)
        } else {
          setProperty(data as Property)
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <p className="py-10 text-center text-neutral-500">Cargando...</p>
  if (notFound || !property) {
    return <p className="py-10 text-center text-neutral-500">Inmueble no encontrado</p>
  }

  const ubicacion = [property.estado?.nombre, property.municipio?.nombre, property.parroquia]
    .filter(Boolean)
    .join(' · ')
  const detalles = buildDetalles(property)

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
      <PropertyGallery images={property.images} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-primary">{property.titulo}</h1>
          <p className="text-body text-neutral-500">
            {ubicacion} · {property.tipo?.nombre ?? ''}
          </p>
          <p className="text-h2 font-semibold text-primary">{formatPrice(property)}</p>
        </div>

        {detalles.length > 0 && (
          <dl className="grid grid-cols-2 gap-3 rounded-md bg-surface p-4">
            {detalles.map((item) => (
              <div key={item.label} className="flex flex-col">
                <dt className="text-small text-neutral-500">{item.label}</dt>
                <dd className="text-body font-semibold text-neutral-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="text-body text-neutral-900">{property.description}</p>
      </div>
    </div>
  )
}
