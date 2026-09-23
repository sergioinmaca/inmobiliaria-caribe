import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { createDriveFolder, deletePropertyFiles } from '../../lib/drive'
import {
  createProperty,
  deleteProperty,
  updateProperty,
  updatePropertyImages,
  type PropertyInput,
} from '../../lib/propertiesApi'
import { useTiposInmueble } from '../../hooks/useTiposInmueble'
import { useTerritorio } from '../../hooks/useTerritorio'
import { PropertyImagesSection } from './PropertyImagesSection'
import { TypeManagerModal } from './TypeManagerModal'
import { useSession } from '../../hooks/useSession'
import { propertySchema, type PropertyFormValues } from '../../lib/propertySchema'
import type { Property, PropertyImage } from '../../types'

const defaultValues: PropertyFormValues = {
  titulo: '',
  tipo_id: '',
  estado_id: '',
  municipio_id: '',
  parroquia_id: '',
  habitaciones: null,
  banos: null,
  puestos_estacionamiento: null,
  metros_construccion: null,
  metros_terreno: null,
  priceMode: 'ref',
  priceAmount: null,
  description: '',
}

const selectClass = 'rounded-sm border border-neutral-300 px-3 py-2 text-body'
const labelClass = 'text-small font-medium text-neutral-900'

export function PropertyFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { profile } = useSession()
  const { tipos, refetch: refetchTipos } = useTiposInmueble(true)
  const { estados } = useTerritorio()
  const [images, setImages] = useState<PropertyImage[]>([])
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [folderKey] = useState(() => Math.random().toString(36).slice(2, 10))

  const canDelete = profile?.role === 'master' || profile?.role === 'gerente'
  const canManageTypes = profile?.role === 'master' || profile?.role === 'gerente'

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({ resolver: zodResolver(propertySchema), defaultValues })

  const estadoId = watch('estado_id')
  const municipioId = watch('municipio_id')
  const municipios = estados.find((e) => e.id === estadoId)?.municipios ?? []
  const parroquias = municipios.find((m) => m.id === municipioId)?.parroquias ?? []

  const parroquiaNombre = useCallback(
    (parroquiaId: string): string => {
      for (const estado of estados) {
        for (const municipio of estado.municipios) {
          const found = municipio.parroquias.find((p) => p.id === parroquiaId)
          if (found) return found.nombre
        }
      }
      return ''
    },
    [estados],
  )

  const folderName = useCallback(() => {
    const tipo = tipos.find((t) => t.id === getValues('tipo_id'))?.nombre ?? 'inmueble'
    const parroquia = parroquiaNombre(getValues('parroquia_id')) || 'sin-parroquia'
    return `${tipo}-${parroquia}`
  }, [tipos, parroquiaNombre, getValues])

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
    const folderId = await createDriveFolder(folderName(), isEdit && id ? id : folderKey)
    if (folderId) {
      setDriveFolderId(folderId)
      if (isEdit && id) {
        await supabase.from('propiedades').update({ drive_folder_id: folderId }).eq('id', id)
      }
    }
    return folderId
  }, [driveFolderId, folderName, isEdit, id, folderKey])

  const handleImagesChange = useCallback(
    async (next: PropertyImage[]) => {
      setImages(next)
      if (isEdit && id) {
        await updatePropertyImages(id, next)
      }
    },
    [isEdit, id],
  )

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
            tipo_id: p.tipo_id ?? '',
            estado_id: p.estado_id ?? '',
            municipio_id: p.municipio_id ?? '',
            parroquia_id: p.parroquia_id ?? '',
            habitaciones: p.habitaciones,
            banos: p.banos,
            puestos_estacionamiento: p.puestos_estacionamiento,
            metros_construccion: p.metros_construccion,
            metros_terreno: p.metros_terreno,
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
    const input: PropertyInput = {
      titulo: values.titulo,
      tipo_id: values.tipo_id,
      estado_id: values.estado_id || null,
      municipio_id: values.municipio_id || null,
      parroquia_id: values.parroquia_id || null,
      description: values.description ?? '',
      price_is_ref: isRef,
      price_currency: currency,
      price_original: amount,
      habitaciones: values.habitaciones,
      banos: values.banos,
      puestos_estacionamiento: values.puestos_estacionamiento,
      metros_construccion: values.metros_construccion,
      metros_terreno: values.metros_terreno,
    }

    if (isEdit && id) {
      const { error } = await updateProperty(id, input)
      if (error) {
        setSubmitError(error)
        return
      }
      navigate('/admin')
      return
    }

    const folderId = await createDriveFolder(folderName(), folderKey)
    if (!folderId) {
      setSubmitError('No se pudo crear la carpeta de Drive. Inténtalo de nuevo.')
      return
    }

    const { error } = await createProperty(input, images, folderId)
    if (error) {
      setSubmitError(error)
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
    const { error } = await deleteProperty(id)
    if (error) {
      setDeleting(false)
      setDeleteError(error)
      return
    }
    await deletePropertyFiles({ fileIds, folderId })
    setDeleting(false)
    navigate('/admin')
  }

  const numeric = { setValueAs: (v: string) => (v === '' || v == null ? null : Number(v)) }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:max-w-3xl">
      <h1 className="text-h2 font-bold text-primary">{isEdit ? 'Editar inmueble' : 'Nuevo inmueble'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input id="titulo" label="Título" {...register('titulo')} />
        {errors.titulo && <p className="text-small text-danger">{errors.titulo.message}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="tipo_id" className={labelClass}>
                Tipo
              </label>
              {canManageTypes && (
                <button
                  type="button"
                  aria-label="Gestionar tipos"
                  onClick={() => setShowTypeModal(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-sm border border-neutral-300 text-body leading-none text-primary hover:bg-surface"
                >
                  +
                </button>
              )}
            </div>
            <select id="tipo_id" {...register('tipo_id')} className={selectClass}>
              <option value="">Selecciona un tipo</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                  {t.is_active ? '' : ' (inactivo)'}
                </option>
              ))}
            </select>
            {errors.tipo_id && <p className="text-small text-danger">{errors.tipo_id.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="estado_id" className={labelClass}>
              Estado
            </label>
            <select
              id="estado_id"
              {...register('estado_id', {
                onChange: () => {
                  setValue('municipio_id', '')
                  setValue('parroquia_id', '')
                },
              })}
              className={selectClass}
            >
              <option value="">Selecciona un estado</option>
              {estados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            {errors.estado_id && <p className="text-small text-danger">{errors.estado_id.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="municipio_id" className={labelClass}>
              Municipio
            </label>
            <select
              id="municipio_id"
              disabled={!estadoId}
              {...register('municipio_id', {
                onChange: () => setValue('parroquia_id', ''),
              })}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="">Selecciona un municipio</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            {errors.municipio_id && (
              <p className="text-small text-danger">{errors.municipio_id.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="parroquia_id" className={labelClass}>
              Parroquia
            </label>
            <select
              id="parroquia_id"
              disabled={!municipioId}
              {...register('parroquia_id')}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="">Selecciona una parroquia</option>
              {parroquias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {errors.parroquia_id && (
              <p className="text-small text-danger">{errors.parroquia_id.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Input
            id="habitaciones"
            label="Habitaciones"
            type="number"
            inputMode="numeric"
            min={0}
            {...register('habitaciones', numeric)}
          />
          <Input
            id="banos"
            label="Baños"
            type="number"
            inputMode="numeric"
            min={0}
            {...register('banos', numeric)}
          />
          <Input
            id="puestos_estacionamiento"
            label="Puestos de estacionamiento"
            type="number"
            inputMode="numeric"
            min={0}
            {...register('puestos_estacionamiento', numeric)}
          />
          <Input
            id="metros_construccion"
            label="Metros construidos (m²)"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            {...register('metros_construccion', numeric)}
          />
          <Input
            id="metros_terreno"
            label="Metros de terreno (m²)"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            {...register('metros_terreno', numeric)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="priceMode" className={labelClass}>
              Precio
            </label>
            <select id="priceMode" {...register('priceMode')} className={selectClass}>
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
          <label htmlFor="description" className={labelClass}>
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

      <TypeManagerModal
        open={showTypeModal}
        onClose={() => {
          setShowTypeModal(false)
          void refetchTipos()
        }}
      />
    </div>
  )
}
