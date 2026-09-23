# 03 — Código compartido de Edge Functions (`_shared/`)

- **Estado:** Diseño aprobado (implementación pendiente)
- **Objetivo:** eliminar la duplicación entre `admin` y `drive`, y sentar la base para las funciones
  de escritura del Escenario B.

---

## 1. Problema actual

`supabase/functions/admin/index.ts` y `supabase/functions/drive/index.ts` repiten:

| Duplicado | admin | drive |
|---|---|---|
| Cabeceras CORS | `index.ts:8-11` | `index.ts:38-41` |
| Helper `json()` | `index.ts:15-20` | `index.ts:43-48` |
| `createClient` con JWT | `index.ts:26-30` | `index.ts:103-107` |
| `getUser()` + chequeo | `index.ts:32-35` | `index.ts:109-112` |
| Leer rol de `profiles` | `index.ts:37-44` | `index.ts:114-120` |
| `Deno.serve` + OPTIONS | `index.ts:22-23` | `index.ts:99-100` |

Además, **`admin` y `drive` no comparten ni siquiera el import** de `supabase-js` (uno usa
`npm:@supabase/supabase-js@2` inline y el otro un import map). Esto se corrige con el map único.

---

## 2. Estructura propuesta

```
supabase/functions/
├── deno.json                 # import map único (ya existe; se reutiliza)
├── _shared/                  # NO se despliega como función (prefijo _)
│   ├── cors.ts
│   ├── http.ts
│   ├── env.ts
│   ├── supabaseClients.ts
│   ├── auth.ts
│   ├── validation.ts
│   ├── handler.ts
│   └── types.ts
├── admin/index.ts            # refactorizado
├── drive/index.ts            # refactorizado
├── propiedades/index.ts      # NUEVA (Escenario B)
└── tests/
    ├── auth-test.ts
    └── merge-images-test.ts
```

Supabase recomienda oficialmente esta estructura ("fat functions" + carpeta `_shared`), con un
`import_map`/`deno.json` superior compartido por todas las funciones.

---

## 3. Módulos, función y justificación

### 3.1 `_shared/cors.ts`
```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': import.meta.env.ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export const preflight = () => new Response('ok', { headers: corsHeaders })
```
**Qué hace:** centraliza las cabeceras CORS y la respuesta al *preflight* (`OPTIONS`).
**Por qué:** hoy está copiado en dos archivos; si se restringe el origen (recomendado en `04`), se
cambia en un solo sitio.

### 3.2 `_shared/http.ts`
```ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
```
**Qué hace:** `ApiError` transporta un código HTTP; `json()` produce respuestas uniformes.
**Por qué:** permite lanzar errores desde cualquier profundidad y traducirlos una sola vez. Evita el
bug clásico de respuestas de error **sin CORS**.

### 3.3 `_shared/env.ts`
```ts
export function requireEnv(key: string): string {
  const value = Deno.env.get(key)
  if (!value) throw new Error(`Falta la variable de entorno ${key}`)
  return value
}
```
**Qué hace:** lee una variable de entorno y falla si no existe.
**Por qué:** reemplaza `Deno.env.get('SUPABASE_URL')!` (`admin/index.ts:27`). El `!` de TypeScript
oculta el problema hasta tiempo de ejecución; `requireEnv` falla temprano y con mensaje claro.

### 3.4 `_shared/supabaseClients.ts`
```ts
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { requireEnv } from './env.ts'

const URL = requireEnv('SUPABASE_URL')
const ANON = requireEnv('SUPABASE_ANON_KEY')

/** Cliente con la identidad del usuario: RLS aplica. */
export const userClient = (authHeader: string) =>
  createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } })

/** Cliente con service_role: bypassa RLS. Usar con mínimo privilegio. */
export const adminClient = () =>
  createClient(URL, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
```
**Qué hace:** entrega dos clientes con semántica explícita.
**Por qué:** separa "actuar como el usuario" de "actuar con superpoderes". Hace evidente qué función
tiene `service_role` (solo `admin` y, cuando aplique, `propiedades`).

### 3.5 `_shared/auth.ts`
```ts
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { ApiError } from './http.ts'
import { userClient } from './supabaseClients.ts'
import type { Role } from './types.ts'

export interface AuthContext {
  user: User
  role: Role
  client: SupabaseClient  // cliente del usuario (respeta RLS)
}

export async function authenticate(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) throw new ApiError(401, 'no autorizado')
  const client = userClient(authHeader)
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new ApiError(401, 'no autorizado')
  const { data: profile } = await client
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) throw new ApiError(403, 'sin permisos')
  return { user, role: profile.role as Role, client }
}

export function requireRole(ctx: AuthContext, ...allowed: Role[]): void {
  if (!allowed.includes(ctx.role)) throw new ApiError(403, 'sin permisos')
}
```
**Qué hace:** `authenticate` valida el JWT y obtiene el rol **desde la base de datos**;
`requireRole` verifica permisos de forma declarativa.
**Por qué:** reemplaza el bloque duplicado. El rol se lee de `profiles` (fuente de verdad), no de lo
que envíe el cliente. `requireRole(ctx, 'gerente', 'master')` expresa el permiso en una línea.

### 3.6 `_shared/validation.ts`
```ts
import { ApiError } from './http.ts'

export function requireFields(body: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter((f) => !body[f])
  if (missing.length) throw new ApiError(400, `faltan campos: ${missing.join(', ')}`)
}
```
**Qué hace:** valida presencia de campos.
**Por qué:** elimina validaciones dispersas y estandariza los mensajes `400`.

### 3.7 `_shared/handler.ts` (envoltorio)
```ts
import { ApiError, json } from './http.ts'
import { corsHeaders } from './cors.ts'

export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    try {
      return await handler(req)
    } catch (err) {
      if (err instanceof ApiError) return json({ error: err.message }, err.status)
      console.error('[edge] error no controlado:', err)
      return json({ error: 'error interno' }, 500)
    }
  })
}
```
**Qué hace:** envuelve al manejador con CORS, captura de errores y logging.
**Por qué:** cada función deja de repetir `Deno.serve`/`try-catch`. Garantiza CORS en errores y no
filtra trazas internas al cliente.

### 3.8 `_shared/types.ts`
Tipos compartidos entre funciones (`Role`, `PropertyType`, `PropertyImage`). Es una copia del
contrato de `src/types/index.ts`; a futuro podría generarse automáticamente. **Por qué:** evita
tipos "mágicos" repetidos en cada función.

---

## 4. Cómo queda `drive` (ciclo de vida de un `upload`)

```ts
import { serve } from '../_shared/handler.ts'
import { authenticate, requireRole } from '../_shared/auth.ts'
import { json, ApiError } from '../_shared/http.ts'
import { requireFields } from '../_shared/validation.ts'
import { callAppsScript } from './appsScript.ts'
import { mergeImages } from './mergeImages.ts'

serve(async (req) => {
  const ctx = await authenticate(req)
  requireRole(ctx, 'gerente', 'master')

  const body = await req.json()
  switch (body.action) {
    case 'createFolder':
      return json(await callAppsScript({ action: 'createFolder', name: body.name, folderKey: body.folderKey }))
    case 'upload':
      requireFields(body, ['folderId', 'data'])
      if (!body.isActive) { /* permitido */ }
      return json(await callAppsScript({ action: 'upload', ...body }))
    case 'sync':
      return json(await syncAndPersist(ctx, body))
    default:
      throw new ApiError(400, 'acción desconocida')
  }
})
```

Recorrido de una llamada `upload`:

1. Navegador envía `OPTIONS` (preflight) → lo resuelve `serve`.
2. `authenticate` → valida JWT; obtiene rol real.
3. `requireRole(ctx, 'gerente', 'master')` → si no, `403` (con CORS).
4. `requireFields` → valida `folderId` y `data`; si falta, `400`.
5. `callAppsScript` → llama al Apps Script con reintentos con *jitter* (ver `04`).
6. `json(...)` → respuesta uniforme.

La función expresa **qué** hace; lo transversal vive en `_shared`.

---

## 5. Blueprint de la función `propiedades` (Escenario B)

Acciones: `create` | `update` | `setActive` | `delete`.

```
create/update:
  1. authenticate + requireRole('gerente','master')
  2. validar campos (titulo, tipo, parroquia)
  3. recalcular price_usd EN SERVIDOR desde settings.usd_to_bs_rate
     (el cliente no puede falsificar el precio normalizado)
  4. escribir (service_role o cliente del usuario con RLS)

setActive:
  1. requireRole('gerente','master')
  2. leer inmueble
  3. validar EN SERVIDOR: images.length >= MIN_IMAGES y campos completos
  4. actualizar is_active + sincronizar visibilidad en Drive

delete:
  1. requireRole('gerente','master')
  2. borrar inmueble
  3. borrar archivos/carpeta de Drive
```

El front añadirá `src/lib/propertiesApi.ts` que llame a
`supabase.functions.invoke('propiedades', { body: { action, ... } })`.

**Decisión de negocio (Fase 1):** `MIN_IMAGES_TO_ACTIVATE = 1`. Se unificó a **1** (coincide con
`src/lib/constants.ts:19`); la validación en servidor usará ese umbral. La tasa de cambio la edita
**solo `master`**.

---

## 6. Estrategia de despliegue

El editor del dashboard de Supabase **no soporta código compartido ni control de versiones**. Por
eso se adopta:

```bash
# una sola vez
supabase login
supabase link --project-ref <PROJECT_REF>

# cada despliegue de funciones (sin Docker)
supabase functions deploy admin --use-api
supabase functions deploy drive --use-api
supabase functions deploy propiedades --use-api
```

- **Migraciones:** siguen siendo manuales en el dashboard (decisión vigente). La CLI **no** se usa
  para la base de datos.
- `_shared/` se empaqueta automáticamente con cada función; nunca se despliega como función propia.

---

## 7. Tests previstos

- `tests/auth-test.ts` — `authenticate`/`requireRole` (casos 401/403/ok).
- `tests/merge-images-test.ts` — `mergeImages` (fusión que preserva orden).
- (Futuro) tests de reglas de `propiedades`: activación con <5 imágenes debe fallar.
