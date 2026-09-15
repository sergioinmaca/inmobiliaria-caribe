import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { createDriveFolder } from '../../lib/drive'
import { normalizePriceUsd } from '../../lib/price'
import { PROPERTY_TYPES, PARROQUIAS } from '../../lib/constants'
import { PropertyImagesSection } from './PropertyImagesSection'
import { propertySchema, type PropertyFormValues } from '../../lib/propertySchema'
import type { Property, PropertyImage } from '../../types'

const defaultValues: PropertyFormValues = {
  titulo: '',
  tipo: 'apartamento',
  parroquia: '',
  priceMode: 'ref',
  priceAmount: null,
  description: '',
}

export function PropertyFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [rate, setRate] = useState(0)
  const [property, setProperty] = useState<Property | null>(null)
  const [images, setImages] = useState<PropertyImage[]>([])
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({ resolver: zodResolver(propertySchema), defaultValues })

  const reloadProperty = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('propiedades').select('*').eq('id', id).single()
    if (data) {
      const p = data as Property
      setProperty(p)
      setImages(p.images)
      setDriveFolderId(p.drive_folder_id)
    }
  }, [id])

  const ensureFolder = useCallback(async () => {
    if (driveFolderId) return driveFolderId
    const name = `${getValues('tipo')}-${getValues('parroquia')}`
    const folderId = await createDriveFolder(name)
    if (folderId) {
      setDriveFolderId(folderId)
      if (isEdit && id) {
        await supabase.from('propiedades').update({ drive_folder_id: folderId }).eq('id', id)
      }
    }
    return folderId
  }, [driveFolderId, getValues, isEdit, id])

  const handleImagesChange = useCallback(
    async (next: PropertyImage[]) => {
      setImages(next)
      if (isEdit && id) {
        await supabase.from('propiedades').update({ images: next }).eq('id', id)
      }
    },
    [isEdit, id],
  )

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .eq('key', 'usd_to_bs_rate')
      .single()
      .then(({ data }) => {
        if (data) setRate(Number((data as { value: string }).value) || 0)
      })
  }, [])

  useEffect(() => {
    if (!id) return
    let active = true
    supabase
      .from('propiedades')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!active) return
        const p = data as Property | null
        if (p) {
          setProperty(p)
          setImages(p.images)
          setDriveFolderId(p.drive_folder_id)
          reset({
            titulo: p.titulo,
            tipo: p.tipo,
            parroquia: p.parroquia,
            priceMode: p.price_is_ref ? 'ref' : (p.price_currency ?? 'usd'),
            priceAmount: p.price_original,
            description: p.description,
          })
        }
      })
    return () => {
      active = false
    }
  }, [id, reset])

  const onSubmit = async (values: PropertyFormValues) => {
    setSubmitError(null)
    const currency = values.priceMode === 'ref' ? null : values.priceMode
    const isRef = currency === null
    const amount = isRef ? null : values.priceAmount
    const payload = {
      titulo: values.titulo,
      tipo: values.tipo,
      parroquia: values.parroquia,
      description: values.description ?? '',
      price_is_ref: isRef,
      price_currency: currency,
      price_original: amount,
      price_usd: normalizePriceUsd(currency, amount, isRef, rate),
    }

    if (isEdit && id) {
      const { error } = await supabase.from('propiedades').update(payload).eq('id', id)
      if (error) {
        setSubmitError('Error al guardar los cambios.')
        return
      }
      navigate('/admin')
      return
    }

    let folderId = driveFolderId
    if (!folderId) {
      folderId = await createDriveFolder(`${values.tipo}-${values.parroquia}`)
    }

    const { error } = await supabase
      .from('propiedades')
      .insert({ ...payload, drive_folder_id: folderId, images })
    if (error) {
      setSubmitError('Error al crear el inmueble.')
      return
    }
    navigate('/admin')
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-h2 font-bold text-primary">{isEdit ? 'Editar inmueble' : 'Nuevo inmueble'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input id="titulo" label="Título" {...register('titulo')} />
        {errors.titulo && <p className="text-small text-danger">{errors.titulo.message}</p>}

        <div className="flex flex-col gap-1">
          <label htmlFor="tipo" className="text-small font-medium text-neutral-900">
            Tipo
          </label>
          <select
            id="tipo"
            {...register('tipo')}
            className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="parroquia" className="text-small font-medium text-neutral-900">
            Parroquia
          </label>
          <select
            id="parroquia"
            {...register('parroquia')}
            className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
          >
            <option value="">Selecciona una parroquia</option>
            {PARROQUIAS.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
        {errors.parroquia && <p className="text-small text-danger">{errors.parroquia.message}</p>}

        <div className="flex flex-col gap-1">
          <label htmlFor="priceMode" className="text-small font-medium text-neutral-900">
            Precio
          </label>
          <select
            id="priceMode"
            {...register('priceMode')}
            className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
          >
            <option value="ref">Referencia (REF.)</option>
            <option value="usd">Dólares ($)</option>
            <option value="bs">Bolívares (Bs)</option>
          </select>
        </div>

        <Input
          id="priceAmount"
          label="Monto"
          type="number"
          inputMode="decimal"
          step="any"
          {...register('priceAmount', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
        />
        {errors.priceAmount && <p className="text-small text-danger">{errors.priceAmount.message}</p>}

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-small font-medium text-neutral-900">
            Descripción
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
          />
        </div>

        {submitError && <p className="text-small text-danger">{submitError}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isEdit ? 'Guardar cambios' : 'Crear inmueble'}
        </Button>
      </form>

      <PropertyImagesSection
        images={images}
        driveFolderId={driveFolderId}
        propertyId={id}
        isActive={property?.is_active ?? false}
        onChange={handleImagesChange}
        ensureFolder={ensureFolder}
        onSynced={reloadProperty}
      />
    </div>
  )
}
