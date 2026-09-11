# Header, menú administrativo y gestión de usuarios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el header post-login (nombre/apellido + menú hamburguesa), agregar un drawer lateral "Menú Administrativo" y permitir al Master crear usuarios con contraseña directa y correo `@inmaca.com`.

**Architecture:** Se amplía `profiles` con `first_name`, `last_name`, `phone` y `email` (denormalizado desde `auth.users`). La Edge Function `admin` cambia de invitación a `createUser` con `email_confirm: true` usando la service role key. El header y el nuevo `AdminMenu` (drawer que se desliza de derecha a izquierda) consumen el `Profile` ampliado.

**Tech Stack:** React 19 + TypeScript + Vite + TailwindCSS (tokens), Supabase (Auth + Postgres + Edge Functions), Zod + React Hook Form, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-11-admin-header-menu-usuarios-design.md`

## Global Constraints

- Mobile-First: clases Tailwind sin prefijo y escalan con `sm:`/`md:`/`lg:`.
- Nada de colores hex hardcodeados: usar tokens (`text-primary`, `text-neutral-900`, `bg-surface`, `bg-danger`, etc.).
- Idioma del código: inglés. Idioma de la UI: español (Venezuela).
- TypeScript estricto; `verbatimModuleSyntax` (usar `import type` para tipos). `noUnusedLocals`/`noUnusedParameters` activos.
- No agregar dependencias nuevas (Zod, React Hook Form, supabase-js ya están).
- `npm run lint` (oxlint) y `npx vitest run` deben pasar; `npx tsc -b` y `npm run build` deben compilar.
- Comandos: test de un archivo `npx vitest run <archivo>`; todos `npx vitest run`.
- La migración SQL se ejecuta manualmente en Supabase (SQL Editor); no hay runner de migraciones en CI.

---

### Task 1: Migración de campos de contacto en `profiles`

**Files:**
- Create: `supabase/migrations/0002_profiles_contact_fields.sql`

**Interfaces:**
- Consumes: nada.
- Produces: columnas `first_name text not null default ''`, `last_name text not null default ''`, `phone text` (nullable), `email text not null default ''` en `public.profiles`, más `handle_new_user` actualizado. Los demás tasks dependen de que esta migración se haya aplicado en Supabase (el frontend la asume).

- [ ] **Step 1: Crear la migración**

```sql
-- Migración: campos de contacto en profiles (nombre, apellido, teléfono, email).
-- Ejecutar en: Supabase → SQL Editor → New query → Run.

alter table public.profiles
  add column first_name text not null default '',
  add column last_name text not null default '',
  add column phone text,
  add column email text not null default '';

-- Backfill: email desde auth.users.
update public.profiles p
set email = coalesce((select u.email from auth.users u where u.id = p.id), '');

-- Backfill: dividir full_name en nombre y apellido.
update public.profiles
set
  first_name = case
    when position(' ' in full_name) > 0 then split_part(full_name, ' ', 1)
    else full_name
  end,
  last_name = case
    when position(' ' in full_name) > 0 then substr(full_name, position(' ' in full_name) + 1)
    else ''
  end;

-- Trigger actualizado: poblar email y nombre/apellido en usuarios nuevos.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, first_name, last_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    'invitado'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0002_profiles_contact_fields.sql
git commit -m "feat: migración de campos de contacto en profiles"
```

> Nota de despliegue manual (fuera del repo): ejecutar este SQL en el SQL Editor de Supabase **antes** de probar el frontend.

---

### Task 2: Ampliar el tipo `Profile` y arreglar mocks

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/features/admin/PropertyImagesSection.test.tsx`
- Modify: `src/features/admin/AdminListPage.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `Profile` con `first_name: string`, `last_name: string`, `phone: string | null`, `email: string` (además de los campos existentes). Los tasks 5, 6 y 7 dependen de estos campos.

- [ ] **Step 1: Ampliar `Profile` en `src/types/index.ts`**

Reemplaza la interfaz `Profile` (actualmente con `full_name`, `role`, `is_active`, `created_at`) por:

```ts
export interface Profile {
  id: string
  full_name: string
  first_name: string
  last_name: string
  phone: string | null
  email: string
  role: Role
  is_active: boolean
  created_at: string
}
```

- [ ] **Step 2: Arreglar el mock de `PropertyImagesSection.test.tsx`**

Reemplaza la línea del perfil mockeado:

```ts
      profile: { id: '1', full_name: 'Ana', role: 'gerente', is_active: true, created_at: '' },
```

por:

```ts
      profile: {
        id: '1',
        full_name: 'Ana',
        first_name: 'Ana',
        last_name: '',
        phone: null,
        email: 'ana@inmaca.com',
        role: 'gerente',
        is_active: true,
        created_at: '',
      },
```

- [ ] **Step 3: Arreglar el mock de `AdminListPage.test.tsx`**

Reemplaza la línea del perfil mockeado:

```ts
      profile: { id: '1', full_name: 'Ana', role: 'gerente', is_active: true, created_at: '' },
```

por:

```ts
      profile: {
        id: '1',
        full_name: 'Ana',
        first_name: 'Ana',
        last_name: '',
        phone: null,
        email: 'ana@inmaca.com',
        role: 'gerente',
        is_active: true,
        created_at: '',
      },
```

- [ ] **Step 4: Typecheck y tests**

Run: `npx tsc -b`
Expected: no errors.

Run: `npx vitest run`
Expected: all pass (45 tests).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/features/admin/PropertyImagesSection.test.tsx src/features/admin/AdminListPage.test.tsx
git commit -m "feat: ampliar Profile con nombre, apellido, teléfono y email"
```

---

### Task 3: Esquema del formulario de usuario (`userSchema`)

**Files:**
- Create: `src/lib/userSchema.ts`
- Test: `src/lib/userSchema.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces (usadas por Task 7):
  - `userSchema` (zod object con `firstName`, `lastName`, `phone`, `emailLocal`, `password`, `role`)
  - `UserFormValues` (tipo inferido)
  - `buildEmail(local: string): string`

- [ ] **Step 1: Escribir el test**

```ts
// src/lib/userSchema.test.ts
import { describe, expect, it } from 'vitest'
import { buildEmail, userSchema } from './userSchema'

describe('userSchema', () => {
  it('valida un usuario correcto', () => {
    const r = userSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '',
      emailLocal: 'ana.perez',
      password: '123456',
      role: 'gerente',
    })
    expect(r.success).toBe(true)
  })

  it('rechaza si falta nombre o apellido', () => {
    expect(
      userSchema.safeParse({
        firstName: '',
        lastName: '',
        phone: '',
        emailLocal: 'a',
        password: '123456',
        role: 'invitado',
      }).success,
    ).toBe(false)
  })

  it('rechaza contraseña menor a 6', () => {
    expect(
      userSchema.safeParse({
        firstName: 'A',
        lastName: 'B',
        phone: '',
        emailLocal: 'a',
        password: '12345',
        role: 'invitado',
      }).success,
    ).toBe(false)
  })

  it('rechaza parte local con caracteres inválidos', () => {
    expect(
      userSchema.safeParse({
        firstName: 'A',
        lastName: 'B',
        phone: '',
        emailLocal: 'ana@x',
        password: '123456',
        role: 'invitado',
      }).success,
    ).toBe(false)
  })

  it('permite teléfono vacío (opcional)', () => {
    const r = userSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      phone: undefined,
      emailLocal: 'a',
      password: '123456',
      role: 'invitado',
    })
    expect(r.success).toBe(true)
  })
})

describe('buildEmail', () => {
  it('arma el correo con @inmaca.com', () => {
    expect(buildEmail('ana.perez')).toBe('ana.perez@inmaca.com')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/userSchema.test.ts`
Expected: FAIL — cannot find module `./userSchema`.

- [ ] **Step 3: Implementar**

```ts
// src/lib/userSchema.ts
import { z } from 'zod'

export const userSchema = z.object({
  firstName: z.string().trim().min(1, 'El nombre es obligatorio'),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio'),
  phone: z.string().trim().optional(),
  emailLocal: z
    .string()
    .trim()
    .min(1, 'El correo es obligatorio')
    .regex(/^[a-z0-9._%+-]+$/i, 'Parte local inválida'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['gerente', 'supervisor', 'invitado']),
})

export type UserFormValues = z.infer<typeof userSchema>

export function buildEmail(local: string): string {
  return `${local}@inmaca.com`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/userSchema.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/userSchema.ts src/lib/userSchema.test.ts
git commit -m "feat: esquema y validación del formulario de usuario"
```

---

### Task 4: Acción `createUser` en la Edge Function `admin`

**Files:**
- Modify: `supabase/functions/admin/index.ts`

**Interfaces:**
- Consumes: `SUPABASE_SERVICE_ROLE_KEY` (ya configurado).
- Produce (endpoint HTTP llamado por Task 7): acción `createUser` con `{ firstName, lastName, phone, email, password, role }`.

- [ ] **Step 1: Actualizar el comentario de cabecera**

Reemplaza:

```
// Acción: { action: 'inviteUser', email, fullName, role }
```

por:

```
// Acción: { action: 'createUser', firstName, lastName, phone, email, password, role }
```

- [ ] **Step 2: Reemplazar el cuerpo de la acción**

Reemplaza desde `const body = await req.json()` hasta el final del bloque `return json({ ok: true })` con:

```ts
  const body = await req.json()
  const { firstName, lastName, phone, email, password, role } = body as {
    firstName: string
    lastName: string
    phone?: string
    email: string
    password: string
    role: string
  }
  if (!firstName || !lastName || !email || !password) {
    return json({ error: 'faltan campos' }, 400)
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return json({ error: 'rol inválido' }, 400)
  }
  if (!email.endsWith('@inmaca.com')) {
    return json({ error: 'correo inválido' }, 400)
  }
  if (password.length < 6) {
    return json({ error: 'contraseña muy corta' }, 400)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return json({ error: error.message }, 400)

  const fullName = `${firstName} ${lastName}`.trim()
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: data.user.id,
      role,
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? null,
      full_name: fullName,
      email,
    })
  if (profileError) return json({ error: profileError.message }, 500)

  return json({ ok: true })
```

> Nota: `ALLOWED_ROLES` ya existe arriba como `['gerente', 'supervisor', 'invitado']`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/admin/index.ts
git commit -m "feat: crear usuario con contraseña en la Edge Function admin"
```

> Nota de despliegue manual: redesplegar la Edge Function `admin` en Supabase.

---

### Task 5: Componente `AdminMenu` (drawer lateral)

**Files:**
- Create: `src/components/layout/AdminMenu.tsx`
- Test: `src/components/layout/AdminMenu.test.tsx`

**Interfaces:**
- Consumes: `Profile` (`../../types`), `Button` (`../ui/Button`).
- Produce (usada por Task 6):
  ```ts
  interface AdminMenuProps {
    open: boolean
    profile: Profile
    onClose: () => void
    onSignOut: () => void
  }
  ```

- [ ] **Step 1: Escribir el test**

```tsx
// src/components/layout/AdminMenu.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminMenu } from './AdminMenu'
import type { Profile, Role } from '../../types'

const profile = (role: Role): Profile => ({
  id: '1',
  full_name: 'Ana Pérez',
  first_name: 'Ana',
  last_name: 'Pérez',
  phone: null,
  email: 'ana@inmaca.com',
  role,
  is_active: true,
  created_at: '',
})

describe('AdminMenu', () => {
  it('muestra el título y el correo', () => {
    render(
      <MemoryRouter>
        <AdminMenu open profile={profile('gerente')} onClose={vi.fn()} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Menú Administrativo')).toBeInTheDocument()
    expect(screen.getByText('ana@inmaca.com')).toBeInTheDocument()
  })

  it('muestra Usuarios solo para master', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AdminMenu open profile={profile('master')} onClose={vi.fn()} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <AdminMenu open profile={profile('gerente')} onClose={vi.fn()} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })

  it('cierra sesión al pulsar Cerrar Sesión', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(
      <MemoryRouter>
        <AdminMenu open profile={profile('master')} onClose={vi.fn()} onSignOut={onSignOut} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Cerrar Sesión' }))
    expect(onSignOut).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/AdminMenu.test.tsx`
Expected: FAIL — cannot find module `./AdminMenu`.

- [ ] **Step 3: Implementar**

```tsx
// src/components/layout/AdminMenu.tsx
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import type { Profile } from '../../types'

interface AdminMenuProps {
  open: boolean
  profile: Profile
  onClose: () => void
  onSignOut: () => void
}

export function AdminMenu({ open, profile, onClose, onSignOut }: AdminMenuProps) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-neutral-900/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-72 flex-col bg-white shadow-lg transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-neutral-300 px-4 py-3">
          <h2 className="text-h3 font-semibold text-primary">Menú Administrativo</h2>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="text-body text-neutral-900"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <Link
            to="/admin"
            onClick={onClose}
            className="rounded-sm px-3 py-2 text-body font-medium text-neutral-900 hover:bg-surface"
          >
            Inmuebles
          </Link>
          {profile.role === 'master' && (
            <Link
              to="/admin/usuarios"
              onClick={onClose}
              className="rounded-sm px-3 py-2 text-body font-medium text-neutral-900 hover:bg-surface"
            >
              Usuarios
            </Link>
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-neutral-300 p-4">
          <span className="text-small text-neutral-500">{profile.email}</span>
          <Button variant="danger" onClick={onSignOut}>
            Cerrar Sesión
          </Button>
        </div>
      </aside>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/AdminMenu.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AdminMenu.tsx src/components/layout/AdminMenu.test.tsx
git commit -m "feat: menú hamburguesa lateral administrativo"
```

---

### Task 6: Header con nombre/apellido y hamburguesa

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Test: `src/components/layout/Header.test.tsx`

**Interfaces:**
- Consumes: `AdminMenu` (Task 5), `Profile` (`../../types`).
- Produce: header que muestra nombre/apellido + botón hamburguesa tras login, y "Iniciar Sesión" sin login.

- [ ] **Step 1: Escribir el test**

```tsx
// src/components/layout/Header.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './Header'
import type { Profile } from '../../types'

const profile: Profile = {
  id: '1',
  full_name: 'Ana Pérez',
  first_name: 'Ana',
  last_name: 'Pérez',
  phone: null,
  email: 'ana@inmaca.com',
  role: 'gerente',
  is_active: true,
  created_at: '',
}

describe('Header', () => {
  it('muestra nombre y apellido tras login', () => {
    render(
      <MemoryRouter>
        <Header profile={profile} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Pérez')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
  })

  it('muestra iniciar sesión sin login', () => {
    render(
      <MemoryRouter>
        <Header profile={null} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: FAIL — the assertions about `Ana`/`Abrir menú` fail (current Header shows `full_name` + "Salir").

- [ ] **Step 3: Implementar**

Reemplaza todo el contenido de `src/components/layout/Header.tsx` por:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminMenu } from './AdminMenu'
import type { Profile } from '../../types'

interface HeaderProps {
  profile?: Profile | null
  onSignOut?: () => void
}

export function Header({ profile, onSignOut }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex items-center justify-between border-b border-neutral-300 bg-white px-4 py-2">
      <div className="flex flex-1 items-center justify-center self-stretch">
        <Link to="/" className="block">
          <img
            src="/brand/horizontal_color_v2.svg"
            alt="Inmobiliaria Municipal Caribe"
            className="h-10 w-auto"
          />
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-l border-neutral-300 pl-3">
        {profile ? (
          <>
            <div className="flex flex-col leading-tight">
              <span className="text-small font-semibold text-neutral-900">{profile.first_name}</span>
              <span className="text-small text-neutral-500">{profile.last_name}</span>
            </div>
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
              className="flex flex-col gap-1"
            >
              <span className="block h-0.5 w-5 bg-primary" />
              <span className="block h-0.5 w-5 bg-primary" />
              <span className="block h-0.5 w-5 bg-primary" />
            </button>
          </>
        ) : (
          <Link to="/login" className="whitespace-nowrap text-small font-semibold text-primary">
            Iniciar Sesión
          </Link>
        )}
      </div>
      {profile && (
        <AdminMenu
          open={menuOpen}
          profile={profile}
          onClose={() => setMenuOpen(false)}
          onSignOut={onSignOut ?? (() => {})}
        />
      )}
    </header>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/Header.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Full suite + lint**

Run: `npx vitest run`
Expected: all pass.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.test.tsx
git commit -m "feat: header con nombre/apellido y menú hamburguesa"
```

---

### Task 7: Reescribir `UsersPage` (crear usuario)

**Files:**
- Modify: `src/features/admin/UsersPage.tsx`

**Interfaces:**
- Consumes: `userSchema`, `UserFormValues`, `buildEmail` (`../../lib/userSchema`, Task 3); `supabase` (`../../lib/supabase`); `Button`, `Input`, `Badge` (`../../components/ui`); `Profile` (`../../types`); `Role` (para el select).
- Produce: formulario de alta con nombre/apellido/teléfono/correo(+`@inmaca.com`)/contraseña/rol, que invoca `admin` con `action: 'createUser'`.

- [ ] **Step 1: Reescribir el componente**

Reemplaza todo el contenido de `src/features/admin/UsersPage.tsx` por:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { userSchema, buildEmail, type UserFormValues } from '../../lib/userSchema'
import type { Profile, Role } from '../../types'

const defaultValues: UserFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  emailLocal: '',
  password: '',
  role: 'invitado',
}

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [rate, setRate] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({ resolver: zodResolver(userSchema), defaultValues })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  const loadRate = useCallback(async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'usd_to_bs_rate')
      .single()
    if (data) setRate((data as { value: string }).value)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadRate()
  }, [loadRate])

  const createUser = async (values: UserFormValues) => {
    setMessage(null)
    const { error } = await supabase.functions.invoke('admin', {
      body: {
        action: 'createUser',
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || null,
        email: buildEmail(values.emailLocal),
        password: values.password,
        role: values.role,
      },
    })
    if (error) {
      setMessage('Error al crear el usuario.')
      return
    }
    reset(defaultValues)
    load()
  }

  const deactivate = async (id: string) => {
    if (!window.confirm('¿Desactivar este usuario?')) return
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    if (error) {
      setMessage('Error al desactivar el usuario.')
      return
    }
    load()
  }

  const saveRate = async () => {
    setMessage(null)
    const { error } = await supabase
      .from('settings')
      .update({ value: rate })
      .eq('key', 'usd_to_bs_rate')
    if (error) {
      setMessage('Error al guardar la tasa.')
      return
    }
    setMessage('Tasa guardada.')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 font-bold text-primary">Usuarios</h1>

      <section className="flex flex-col gap-3 rounded-md border border-neutral-300 bg-white p-4">
        <h2 className="text-h3 font-semibold text-neutral-900">Crear usuario</h2>
        <form onSubmit={handleSubmit(createUser)} className="flex flex-col gap-3" noValidate>
          <Input id="firstName" label="Nombre" {...register('firstName')} />
          {errors.firstName && <p className="text-small text-danger">{errors.firstName.message}</p>}

          <Input id="lastName" label="Apellido" {...register('lastName')} />
          {errors.lastName && <p className="text-small text-danger">{errors.lastName.message}</p>}

          <Input id="phone" label="Teléfono" type="tel" {...register('phone')} />

          <div className="flex flex-col gap-1">
            <label htmlFor="emailLocal" className="text-small font-medium text-neutral-900">
              Correo
            </label>
            <div className="flex items-center rounded-sm border border-neutral-300 px-3 py-2">
              <input
                id="emailLocal"
                {...register('emailLocal')}
                placeholder="juan.perez"
                className="w-full text-body text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
              />
              <span className="shrink-0 text-body text-neutral-500">@inmaca.com</span>
            </div>
          </div>
          {errors.emailLocal && <p className="text-small text-danger">{errors.emailLocal.message}</p>}

          <Input id="password" label="Contraseña" type="password" {...register('password')} />
          {errors.password && <p className="text-small text-danger">{errors.password.message}</p>}

          <div className="flex flex-col gap-1">
            <label htmlFor="role" className="text-small font-medium text-neutral-900">
              Rol
            </label>
            <select
              id="role"
              {...register('role')}
              className="rounded-sm border border-neutral-300 px-3 py-2 text-body"
            >
              <option value="gerente">Gerente</option>
              <option value="supervisor">Supervisor</option>
              <option value="invitado">Invitado</option>
            </select>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            Crear usuario
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-neutral-300 bg-white p-4">
        <h2 className="text-h3 font-semibold text-neutral-900">Tasa Bs → $</h2>
        <div className="flex items-end gap-3">
          <Input
            id="rate"
            label="Bolívares por dólar"
            type="number"
            inputMode="decimal"
            step="any"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <Button onClick={saveRate}>Guardar</Button>
        </div>
      </section>

      {message && <p className="text-small text-neutral-500">{message}</p>}

      {loading ? (
        <p className="text-body text-neutral-500">Cargando...</p>
      ) : users.length === 0 ? (
        <p className="text-body text-neutral-500">No hay usuarios</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-md border border-neutral-300 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-neutral-900">
                  {`${u.first_name} ${u.last_name}`.trim() || u.full_name}
                </p>
                <p className="text-small text-neutral-500">{u.role}</p>
              </div>
              <Badge variant={u.is_active ? 'success' : 'default'}>
                {u.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
              {u.is_active && (
                <Button variant="ghost" onClick={() => deactivate(u.id)}>
                  Desactivar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

> Nota: se mantiene `type Role` importado solo si lo usa el código; si el linter lo marca como no usado, quítalo del import (aquí se usa en el select `register('role')`, no requiere el tipo explícitamente; déjalo solo si `noUnusedLocals` no lo reclama). Para evitar el aviso, importa únicamente `Profile` y elimina `Role` del import.

- [ ] **Step 2: Typecheck, lint, tests y build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no errors (si `Role` quedó sin uso, quítalo del import).

Run: `npx vitest run`
Expected: all pass.

Run: `npm run build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/UsersPage.tsx
git commit -m "feat: crear usuario con contraseña y correo @inmaca.com"
```

---

## Self-Review

**Spec coverage:**
- Header post-login nombre/apellido + hamburguesa → Task 6.
- Menú hamburguesa desliza derecha→izquierda, título, opciones, fila final correo + cerrar sesión → Task 5.
- Usuarios solo master → sin cambios (RequireRole ya está), menú oculta "Usuarios" a no-master → Task 5.
- Alta de usuario con nombre/apellido/teléfono/correo/contraseña → Task 7.
- Contraseña directa con `email_confirm` → Task 4.
- Correo `@inmaca.com` (parte local + sufijo fijo) → Task 3 (`buildEmail`) + Task 7 (UI).
- Esquema BD + backfill + trigger → Task 1.
- Tipo `Profile` ampliado → Task 2.
- Testing (zod, AdminMenu, Header) → Tasks 3, 5, 6.

**Placeholder scan:** ninguno (todo con código concreto).

**Type consistency:** `Profile` (Task 2) con `first_name`, `last_name`, `phone`, `email` coincide con el uso en Header (Task 6), AdminMenu (Task 5) y UsersPage (Task 7). `userSchema`/`UserFormValues`/`buildEmail` (Task 3) coinciden con UsersPage (Task 7). Acción `createUser` (Task 4) coincide con el `invoke` de UsersPage (Task 7).
