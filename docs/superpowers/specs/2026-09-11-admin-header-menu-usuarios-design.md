# Diseño — Header, menú administrativo y gestión de usuarios

- Fecha: 2026-09-11
- Estado: Para revisión

## 1. Resumen y alcance

Modifica el entorno administrativo en tres frentes: el header tras iniciar sesión, un menú hamburguesa lateral, y el módulo de usuarios (solo Master) con alta de usuarios con contraseña directa.

**Incluye:**

- Header post-login con dos columnas: `Nombre` (arriba) / `Apellido` (abajo) y un botón de menú hamburguesa (3 rayas azul oscuro).
- Menú hamburguesa que se desliza de derecha a izquierda, con título "Menú Administrativo", opciones "Inmuebles" y "Usuarios" (esta última solo para Master), y fila final con "Correo" y "Cerrar Sesión" (botón rojo `danger`).
- Módulo de usuarios (solo Master): crear usuario con `nombre`, `apellido`, `teléfono` (opcional), `correo` (parte local + `@inmaca.com`), `contraseña` (mín. 6) y `rol`.

**Excluye:**

- Edición de usuarios existentes (más allá del "Desactivar" ya existente).
- Recuperación/restablecimiento de contraseña por el propio usuario (queda fuera de alcance; el Master vuelve a crear la cuenta si es necesario).
- Cualquier cambio en el catálogo público o en la landing.

## 2. Arquitectura

- **Frontend:** React (Vite) + TypeScript + TailwindCSS (tokens) + React Router.
- **Backend/BaaS:** Supabase (Auth + Postgres + Edge Functions).
- La creación de usuarios con contraseña directa usa la **service role key** en la Edge Function `admin` (ya presente), con `email_confirm: true` para que el usuario entre directo sin email de verificación.

## 3. Modelo de datos

### 3.1 Migración nueva (`0002_profiles_contact_fields.sql`)

Se agregan columnas a `public.profiles`:

| Columna | Tipo | Notas |
|---|---|---|
| `first_name` | text | nombre |
| `last_name` | text | apellido |
| `phone` | text | teléfono, nullable (opcional) |
| `email` | text | correo denormalizado desde `auth.users` (para mostrar "Correo" sin consultar auth) |

Se conserva `full_name` (se genera como `"{first_name} {last_name}"`) para no romper usos existentes.

**Backfill** para usuarios ya existentes:

- `email` ← `auth.users.email` por `id`.
- `first_name` ← primera palabra de `full_name`; `last_name` ← el resto (si `full_name` tiene una sola palabra, `first_name = full_name` y `last_name = ''`).

Se actualiza `handle_new_user` para poblar también `email` desde `new.email` en usuarios futuros.

### 3.2 Tipo `Profile` (`src/types/index.ts`)

Se amplía con `first_name: string`, `last_name: string`, `phone: string | null`, `email: string`. Se mantiene `full_name`.

## 4. Edge Function `admin`

Se reemplaza la acción de invitación por `createUser`:

```
{ action: 'createUser', firstName, lastName, phone, email, password, role }
```

Flujo:

1. `admin.auth.admin.createUser({ email, password, email_confirm: true })` → `user.id`.
2. `admin.from('profiles').upsert({ id: user.id, role, first_name, last_name, phone, full_name, email })`.
3. Devuelve `{ ok: true }` o `{ error }` (p. ej. si el correo ya existe).

Validaciones en la Edge Function: `role` debe estar en `('gerente','supervisor','invitado')`; `email` completo = `local@inmaca.com` (armado por el front, la Edge Function lo recibe completo); `password` mín. 6.

## 5. Header y menú hamburguesa

### 5.1 Header (`src/components/layout/Header.tsx`)

Tras login, el área de usuario (hoy `full_name` + "Salir") se reemplaza por dos columnas:

- Columna 1: `Nombre` (arriba) / `Apellido` (abajo) — texto apilado (`flex flex-col`).
- Columna 2: botón hamburguesa con 3 rayas `primary` (azul oscuro), `aria-label="Abrir menú"`, que abre el drawer.

Para visitantes no logueados se mantiene el enlace "Iniciar Sesión".

### 5.2 Menú hamburguesa (`src/components/layout/AdminMenu.tsx`, nuevo)

Drawer lateral que se desliza de derecha a izquierda:

- Overlay semitransparente + panel fijo a la derecha.
- Título: **"Menú Administrativo"**.
- Opciones: **"Inmuebles"** → `/admin`; **"Usuarios"** → `/admin/usuarios` (solo si rol `master`).
- Fila final: **"Correo"** (arriba, `profile.email`) y **"Cerrar Sesión"** (abajo), botón `variant="danger"` que llama a `onSignOut`.
- Cierre: clic en overlay, botón X, o al navegar a una opción.

## 6. Módulo de usuarios (`src/features/admin/UsersPage.tsx`)

- Solo Master (se mantiene `RequireRole roles=['master']`).
- Formulario de alta con Zod:
  - `firstName` (requerido), `lastName` (requerido), `phone` (opcional), `email` local (requerido), `password` (requerido, mín. 6), `role` (Gerente/Supervisor/Invitado).
  - El front arma `email = local + '@inmaca.com'`.
- Lista de usuarios: muestra `first_name last_name` (o `full_name` si los nuevos campos no existen) y rol.

## 7. Permisos

- `/admin/usuarios`: solo `master` (sin cambios).
- `/admin`: todos los roles (sin cambios).
- Menú: "Usuarios" solo visible para `master`.

## 8. Estados de carga, vacío y error

- Alta de usuario: botón deshabilitado mientras carga; mensaje de error claro si el correo ya existe o falla la Edge Function.
- Drawer: accesible (overlay cierra con Escape/click fuera); sin estados de carga.

## 9. Testing

- Zod del formulario de usuario (requeridos, `password` mín. 6, `phone` opcional).
- `AdminMenu`: muestra/oculta "Usuarios" según rol; dispara `onSignOut` en "Cerrar Sesión".
- `Header`: tras login muestra nombre/apellido + hamburguesa; sin login muestra "Iniciar Sesión".
- Edge Function `admin` se verifica manualmente (como el resto).
