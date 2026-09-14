import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PropertyGallery } from '../../components/catalog/PropertyGallery'
import { supabase } from '../../lib/supabase'
import { formatPrice } from '../../lib/price'
import type { Property } from '../../types'

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
      .select('*')
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

  return (
    <div className="flex flex-col gap-6">
      <PropertyGallery images={property.images} />
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-primary">{property.titulo}</h1>
        <p className="text-body text-neutral-500">
          {property.parroquia} · {property.tipo}
        </p>
        <p className="text-h2 font-semibold text-primary">{formatPrice(property)}</p>
      </div>
      <p className="text-body text-neutral-900">{property.description}</p>
    </div>
  )
}
