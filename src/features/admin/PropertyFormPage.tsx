import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { createDriveFolder } from '../../lib/drive'
import { normalizePriceUsd } from '../../lib/price'
import { PROPERTY_TYPES, ZONES } from '../../lib/constants'
import { PropertyImagesSection } from './PropertyImagesSection'
import { propertySchema, type PropertyFormValues } from '../../lib/propertySchema'
import type { Property, PropertyImage } from '../../types'

const defaultValues: PropertyFormValues = {
  title: '',
  type: 'apartamento',
  zone: '',
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
    const { data } = await supabase.from('properties').select('*').eq('id', id).single()
    if (data) {
      const p = data as Property
      setProperty(p)
      setImages(p.images)
      setDriveFolderId(p.drive_folder_id)
    }
  }, [id])

  const ensureFolder = useCallback(async () => {
    if (driveFolderId) return driveFolderId
    const name = `${getValues('type')}-${getValues('zone')}`
    const folderId = await createDriveFolder(name)
    if (folderId) setDriveFolderId(folderId)
    return folderId
  }, [driveFolderId, getValues])

  const handleImagesChange = useCallback(
    async (next: PropertyImage[]) => {
      setImages(next)
      if (isEdit && id) {
        await supabase.from('properties').update({ images: next }).eq('id', id)
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
      .from('properties')
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
            title: p.title,
            type: p.type,
            zone: p.zone,
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
      title: values.title,
      type: values.type,
      zone: values.zone,
      description: values.description ?? '',
      price_is_ref: isRef,
      price_currency: currency,
      price_original: amount,
      price_usd: normalizePriceUsd(currency, amount, isRef, rate),
    }

    if (isEdit && id) {
      const { error } = await supabase.from('properties').update(payload).eq('id', id)
      if (error) {
        setSubmitError('Error al guardar los cambios.')
        return
      }
      navigate('/admin')
      return
    }

    let folderId = driveFolderId
    if (!folderId) {
      folderId = await createDriveFolder(`${values.type}-${values.zone}`)
    }

    const { error } = await supabase
      .from('properties')
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
        <Input id="title" label="Título" {...register('title')} />
        {errors.title && <p className="text-small text-danger">{errors.title.message}</p>}

        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-small font-medium text-neutral-900">
            Tipo
          </label>
          <select
            id="type"
            {...register('type')}
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
          <label htmlFor="zone" className="text-small font-medium text-neutral-900">
            Zona
          </label>
          <select
            id="zone"
            {...register('zone')}
            className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
          >
            <option value="">Selecciona una zona</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
        {errors.zone && <p className="text-small text-danger">{errors.zone.message}</p>}

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
