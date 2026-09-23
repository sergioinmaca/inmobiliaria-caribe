// Supabase Edge Function: gestión del catálogo de tipos de inmueble.
// Despliegue: supabase functions deploy catalogos --use-api
// Roles: gerente, master.
// Acciones:
//   { action: 'create', nombre, orden? }
//   { action: 'update', id, nombre?, orden? }
//   { action: 'setActive', id, isActive }
//   { action: 'delete', id }
//
// La división territorial (estados/municipios/parroquias) es de solo lectura (seed),
// por eso esta función solo administra `tipos_inmueble`.

import { serve } from '../_shared/handler.ts'
import { authenticate, requireRole, type AuthContext } from '../_shared/auth.ts'
import { ApiError, json } from '../_shared/http.ts'
import { requireFields } from '../_shared/validation.ts'

interface CatalogBody {
  action: string
  id?: string
  nombre?: string
  orden?: number
  isActive?: boolean
}

async function createTipo(ctx: AuthContext, body: CatalogBody): Promise<Response> {
  requireFields(body, ['nombre'])
  const nombre = body.nombre!.trim()
  const { data, error } = await ctx.client
    .from('tipos_inmueble')
    .insert({ nombre, orden: body.orden ?? 0 })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') throw new ApiError(400, 'Ya existe un tipo con ese nombre.')
    throw new ApiError(400, error.message)
  }
  return json({ ok: true, id: (data as { id: string }).id })
}

async function updateTipo(ctx: AuthContext, body: CatalogBody): Promise<Response> {
  if (!body.id) throw new ApiError(400, 'falta id')

  const patch: Record<string, unknown> = {}
  if (body.nombre !== undefined) {
    const nombre = body.nombre.trim()
    if (!nombre) throw new ApiError(400, 'el nombre es obligatorio')
    patch.nombre = nombre
  }
  if (body.orden !== undefined) patch.orden = body.orden

  if (Object.keys(patch).length === 0) throw new ApiError(400, 'nada que actualizar')

  const { error } = await ctx.client.from('tipos_inmueble').update(patch).eq('id', body.id)
  if (error) {
    if (error.code === '23505') throw new ApiError(400, 'Ya existe un tipo con ese nombre.')
    throw new ApiError(400, error.message)
  }
  return json({ ok: true })
}

async function setActive(ctx: AuthContext, body: CatalogBody): Promise<Response> {
  if (!body.id || typeof body.isActive !== 'boolean') throw new ApiError(400, 'faltan datos')
  const { error } = await ctx.client
    .from('tipos_inmueble')
    .update({ is_active: body.isActive })
    .eq('id', body.id)
  if (error) throw new ApiError(400, error.message)
  return json({ ok: true })
}

async function deleteTipo(ctx: AuthContext, body: CatalogBody): Promise<Response> {
  if (!body.id) throw new ApiError(400, 'falta id')

  const { count, error: countError } = await ctx.client
    .from('propiedades')
    .select('id', { count: 'exact', head: true })
    .eq('tipo_id', body.id)
  if (countError) throw new ApiError(400, countError.message)
  if ((count ?? 0) > 0) {
    throw new ApiError(
      400,
      'No se puede eliminar: hay inmuebles usando este tipo. Desactívalo en su lugar.',
    )
  }

  const { error } = await ctx.client.from('tipos_inmueble').delete().eq('id', body.id)
  if (error) throw new ApiError(400, error.message)
  return json({ ok: true })
}

serve(async (req) => {
  const ctx = await authenticate(req)
  requireRole(ctx, 'gerente', 'master')

  const body = (await req.json()) as CatalogBody

  switch (body.action) {
    case 'create':
      return createTipo(ctx, body)
    case 'update':
      return updateTipo(ctx, body)
    case 'setActive':
      return setActive(ctx, body)
    case 'delete':
      return deleteTipo(ctx, body)
    default:
      throw new ApiError(400, 'acción desconocida')
  }
})
