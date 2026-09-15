import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { createDriveFolder, deletePropertyFiles } from '../../lib/drive'
import { normalizePriceUsd } from '../../lib/price'
import { PROPERTY_TYPES, PARROQUIAS } from '../../lib/constants'
import { PropertyImagesSection } from './PropertyImagesSection'
import { useSession } from '../../hooks/useSession'
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
  const { profile } = useSession()
  const [rate, setRate] = useState(0)
  const [images, setImages] = useState<PropertyImage[]>([])
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [folderKey] = useState(() => Math.random().toString(36).slice(2, 10))

  const canDelete = profile?.role === 'master' || profile?.role === 'gerente'

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
      const p = data as { images: PropertyImage[]; drive_folder_id: string | null }
      setImages(p.images)
      setDriveFolderId(p.drive_folder_id)
    }
  }, [id])

  const ensureFolder = useCallback(async () => {
    if (driveFolderId) return driveFolderId
    if (isEdit && id) {
      const { data } = await supabase
        .from('propiedades')
        .select('drive_folder_id')
        .eq('id', id)
        .single()
      const existing = (data as { drive_folder_id: string | null } | null)?.drive_folder_id
      if (existing) {
        setDriveFolderId(existing)
        return existing
      }
    }
    const name = `${getValues('tipo')}-${getValues('parroquia')}`
    const folderId = await createDriveFolder(name, isEdit && id ? id : folderKey)
    if (folderId) {
      setDriveFolderId(folderId)
      if (isEdit && id) {
        await supabase.from('propiedades').update({ drive_folder_id: folderId }).eq('id', id)
      }
    }
    return folderId
  }, [driveFolderId, getValues, isEdit, id, folderKey])

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

    const folderId = await createDriveFolder(`${values.tipo}-${values.parroquia}`, folderKey)
    if (!folderId) {
      setSubmitError('No se pudo crear la carpeta de Drive. Inténtalo de nuevo.')
      return
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

  const onDelete = async () => {
    if (!id) return
    if (
      !window.confirm(
        '¿Eliminar definitivamente este inmueble y sus fotos? Esta acción no se puede deshacer.',
      )
    ) {
      return
    }
    setDeleteError(null)
    setDeleting(true)
    const fileIds = images.map((img) => img.id)
    const folderId = driveFolderId
    const { error } = await supabase.from('propiedades').delete().eq('id', id)
    if (error) {
      setDeleting(false)
      setDeleteError('No se pudo eliminar el inmueble.')
      return
    }
    await deletePropertyFiles({ fileIds, folderId })
    setDeleting(false)
    navigate('/admin')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:max-w-3xl">
      <h1 className="text-h2 font-bold text-primary">{isEdit ? 'Editar inmueble' : 'Nuevo inmueble'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input id="titulo" label="Título" {...register('titulo')} />
        {errors.titulo && <p className="text-small text-danger">{errors.titulo.message}</p>}

        <div className="grid gap-4 md:grid-cols-2">
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
            {errors.parroquia && (
              <p className="text-small text-danger">{errors.parroquia.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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

          <div className="flex flex-col gap-1">
            <Input
              id="priceAmount"
              label="Monto"
              type="number"
              inputMode="decimal"
              step="any"
              {...register('priceAmount', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            />
            {errors.priceAmount && (
              <p className="text-small text-danger">{errors.priceAmount.message}</p>
            )}
          </div>
        </div>

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

      {isEdit ? (
        <PropertyImagesSection
          images={images}
          driveFolderId={driveFolderId}
          propertyId={id}
          onChange={handleImagesChange}
          ensureFolder={ensureFolder}
          onSynced={reloadProperty}
        />
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-300 bg-white p-4">
          <h3 className="text-h3 font-semibold text-neutral-900">Imágenes</h3>
          <p className="text-small text-neutral-500">
            Las imágenes se agregan después de crear el inmueble. Guarda los datos y luego edítalo
            para subir las fotos.
          </p>
        </div>
      )}

      {isEdit && canDelete && (
        <div className="flex flex-col gap-2 border-t border-neutral-300 pt-4">
          {deleteError && <p className="text-small text-danger">{deleteError}</p>}
          <Button type="button" variant="danger" onClick={() => void onDelete()} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar inmueble'}
          </Button>
        </div>
      )}
    </div>
  )
}
