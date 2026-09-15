# Diseño — Inmobiliaria Municipal Caribe (MVP Web)

- Fecha: 2026-09-10
- Estado: Para revisión

## 1. Resumen y alcance

Plataforma web de la Inmobiliaria Municipal Caribe (Caracas, Venezuela) con tres entornos iniciales: catálogo público, landing y panel administrativo. Mobile-first (375px), UI en español (Venezuela), código en inglés.

**Incluye (MVP):**

- Header global público con acceso a "Iniciar Sesión"
- Landing (banner + accesos a secciones)
- Catálogo público con filtros, cards horizontales y paginación numerada (20 por página)
- Detalle de inmueble con galería
- Login y panel administrativo: listado con Activar/Desactivar, formulario crear/editar que crea la carpeta de Drive, sincronización de imágenes con aviso de desincronización, gestión de usuarios (solo Master)
- Sistema de 4 roles aplicado con RLS

**Excluye (fase posterior):**

- Chat de preguntas/consultas por inmueble (estilo Mercado Libre)
- Noticias / Labor Social (solo icono placeholder en la landing)
- Subida de fotos desde el formulario vía Drive API (la vía por app)
- Dashboard con estadísticas

## 2. Arquitectura

- **Frontend:** React (Vite) + TypeScript + TailwindCSS (consume `design-system/tokens.json`) + React Router
- **Backend / BaaS:** Supabase — Auth, Postgres con RLS y Edge Functions
- **Imágenes:** Google Drive como fuente de archivos; Supabase guarda únicamente URLs (texto), nunca archivos. Supabase Storage no se usa.
- **Hosting:** Firebase Hosting

**Piezas nuevas:**

- Páginas públicas: `/` (landing), `/catalogo`, `/inmueble/:id`, `/login`
- Páginas admin (protegidas): `/admin`, `/admin/inmueble/:id?`, `/admin/usuarios`
- Edge Function `drive`: lista archivos de una carpeta y sincroniza URLs. Usa cuenta de servicio de Drive; las credenciales viven solo ahí.

## 3. Modelo de datos (Supabase)

**Tabla `profiles`** (una fila por usuario autenticado):

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | referencia a `auth.users` |
| full_name | text | |
| role | text | `master` \| `gerente` \| `supervisor` \| `invitado` |
| is_active | boolean | desactivar sin borrar |
| created_at | timestamptz | |

**Tabla `properties`:**

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| title | text | |
| type | text | `apartamento` \| `casa` \| `local` |
| zone | text | zona de Caracas |
| price_usd | numeric(12,2) | valor normalizado en USD para filtros/orden (null = sin precio exacto) |
| price_original | numeric(12,2) | monto original (si está en Bs) |
| price_currency | text | `usd` \| `bs` |
| price_is_ref | boolean | muestra "REF." (por defecto `true`) |
| description | text | |
| is_active | boolean | publicación visible en el catálogo público |
| drive_folder_id | text | id de la subcarpeta en Drive |
| images | jsonb | lista `[{id, url, name, order}]` — solo URLs |
| created_at / updated_at | timestamptz | |

**Tabla `settings`** (clave/valor, p. ej. tasa de cambio):

| Columna | Tipo | Notas |
|---|---|---|
| key | text PK | ej. `usd_to_bs_rate` |
| value | text | ej. `"50"` |

**Modelo de precio:** tres modos. `price_is_ref = true` → muestra "REF.". En `usd` → `price_usd` = monto. En `bs` → `price_usd = price_original / tasa` (la tasa vive en `settings.usd_to_bs_rate`, editable por Master).

**Políticas RLS:**

- `anon` (público): SELECT solo con `is_active = true`
- `invitado`: SELECT completo (incluye inactivos)
- `supervisor`: SELECT + UPDATE de datos (sin tocar `images` ni `drive_folder_id`)
- `gerente`: SELECT + INSERT + UPDATE + DELETE (todo)
- `master`: todo lo anterior + gestión de `profiles`

## 4. Roles

Matriz de permisos (detallada en el documento de proyecto, sección 12):

| Rol | Creación | Vista | Edición | Agregar | Eliminar | Interactuar | Gestiona usuarios |
|---|---|---|---|---|---|---|---|
| Master | Manual (Supabase) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (módulo propio) |
| Gerente | Por Master (front) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Supervisor | Por Master (front) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Invitado | Por Master (front) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

- **Master:** cuenta creada únicamente de forma manual en Supabase. Único rol con módulo de usuarios.
- **Interactuar** (chat de consultas) es fase posterior; en MVP no aplica.
- En fotos: solo **Gerente y Master** gestionan imágenes (subir a Drive, ver aviso de desincronización, sincronizar, reordenar URLs). Supervisor edita solo datos.

## 5. Integración Google Drive

**Estructura en Drive:**

- Carpeta raíz: `catalogo_inmuebles/`
- Una subcarpeta por inmueble con nombre legible para humanos: `<tipo>-<zona>-<secuencial>` (ej. `apartamento-la-florida-001`)
- La organización de carpetas la manejan los eventos del sistema (el código), no el admin

**Edge Function `drive`** (Supabase) → **Google Apps Script** (cuenta Google del admin, sin Google Cloud ni tarjeta):

- Verifica JWT de Supabase + rol `gerente` o `master`
- Llama al Apps Script (Web App) con un secreto compartido
- Acción `createFolder`: crea la subcarpeta en Drive
- Acción `list`: devuelve los archivos de la subcarpeta (id, nombre)
- Acción `sync`: genera URLs directas, fija el compartir según `is_active` y actualiza `properties.images`
- Acción `setVisibility`: oculta/revela las fotos al instante al activar/desactivar

**Flujo de sincronización (vía manual, MVP):**

1. Gerente/Master crea el inmueble en el admin → el sistema crea la subcarpeta en Drive y guarda `drive_folder_id`
2. Gerente/Master sube o elimina fotos manualmente en esa carpeta
3. Al abrir el inmueble en el admin, el front pide `list` a la Edge Function y compara los IDs de Drive contra `properties.images`
4. Si difieren → banner de advertencia: "Las imágenes de este inmueble están desincronizadas con Drive" + botón "Sincronizar imágenes"
5. Al pulsar: `sync` actualiza las URLs en Supabase y el aviso desaparece
6. Regla de publicación: se exigen mínimo 5 imágenes para activar un inmueble

La detección se hace bajo demanda (al abrir el inmueble), no por listado global — evita exceder los rate limits de la API de Drive.

## 6. Entorno público

### 6.1 Header (global)

- Fondo blanco
- Logo `horizontal_color.svg`: bloque que ocupa el 85% del ancho, alineado a la izquierda
- 15% restante (derecha): separador `|` + enlace "Iniciar Sesión"
- Tras login: el enlace se reemplaza por un menú de usuario (nombre, rol, "Panel de Control", "Salir")

### 6.2 Landing `/`

- Sección 1: banner de identidad (.png) — placeholder `/public/brand/banner-placeholder.png` hasta recibir el PNG real
- Sección 2: contenedor de 2 columnas × 1 fila con 2 iconos:
  - "Catálogo de Inmuebles" → navega a `/catalogo`
  - "Noticias y Reportes" → inactivo (deshabilitado visualmente)

### 6.3 Catálogo `/catalogo`

- Barra de filtros: tipo, precio (rango, USD), zona
- Lista de 1 columna; cards horizontales: imagen a la izquierda (~40% del ancho), información a la derecha (título, zona, tipo, precio)
- Altura fija de card ≈ 25% del alto de pantalla como referencia (~170–200px en móvil)
- 20 inmuebles por página, paginación numerada
- Solo muestra inmuebles con `is_active = true`
- Imagen fallida o sin imágenes → `/public/brand/placeholder-property.webp` (crear en implementación)

### 6.4 Detalle `/inmueble/:id`

- Galería (mínimo 5 fotos servidas desde las URLs de Drive), título, zona, tipo, precio, descripción
- Contacto/consultas: fase posterior (chat)

## 7. Entorno administrativo

### 7.1 Login `/login`

- Email + contraseña (Supabase Auth)
- Sin registro público; las cuentas las crea Master (o manualmente en Supabase para el primer Master)
- Error genérico al fallar (no revelar si el correo existe)

### 7.2 Listado `/admin`

- Búsqueda por título o zona
- Columnas: miniatura, título, tipo, zona, estado, acciones
- Toggle **Activar / Desactivar** publicación:
  - Desactivar pide confirmación
  - Activar exige campos completos y ≥5 imágenes
- Enlace a editar; creación de nuevo inmueble

### 7.3 Formulario crear/editar `/admin/inmueble/:id?`

- Campos: título, tipo, zona, precio (USD), descripción
- Al crear: se crea la subcarpeta en Drive (nombre legible) y se guarda `drive_folder_id`
- Sección Imágenes (visible solo para Gerente/Master):
  - Lista de imágenes registradas (URLs)
  - Aviso de desincronización + botón "Sincronizar imágenes" (sección 5)
  - Eliminar y reordenar URLs registradas (no borra los archivos de Drive)

### 7.4 Usuarios `/admin/usuarios` (solo Master)

- Crear: nombre, email, rol (`gerente` | `supervisor` | `invitado`) vía invitación de Supabase
- Desactivar cuenta (no eliminar)
- Lista con nombre, rol y estado

## 8. Estados de carga, vacío y error

- Catálogo: skeleton de cards; estado vacío ("Sin resultados") con mensaje y botón de limpiar filtros; error de red con reintentar
- Admin: indicadores de carga en botones; toasts de éxito/error (crear, actualizar, activar/desactivar, sincronizar)
- Sync: errores de Drive (cuota, permisos, carpeta inexistente) con mensaje claro y acción sugerida
- Imagen inexistente: placeholder en catálogo y detalle

## 9. Design system

- Solo tokens de `design-system/tokens.json` — nunca hex hardcodeados
- Raleway (todos los pesos); escala h1–h3 / body / small del brand-guide
- Radios 8/12/16px, unidad base 4px; contraste AA mínimo; alt y labels obligatorios
- Permutación de secciones: alternar blanco / surface / neutral-300

## 10. Testing

- Vitest + React Testing Library
- Unitarios: validación Zod del formulario, comparador de desincronización (Drive vs Supabase), reglas de activación
- Componentes: PropertyCard, filtros, toggle activar/desactivar, estados del aviso de sync
- E2E (Playwright): fase posterior

## 11. Entradas pendientes del cliente

- Banner PNG real de la landing (usar placeholder mientras)
- Lista de zonas de Caracas (constante provisional en código, reemplazable)
- Sección "Imágenes" del brand-guide (estilo fotográfico)
- Cuentas/configuración externa: proyecto Supabase (tablas, RLS, Edge Function), cuenta de servicio de Drive, carpeta `catalogo_inmuebles/`
