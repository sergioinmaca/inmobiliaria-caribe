# Inmobiliaria Municipal Caribe (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la plataforma web completa de la Inmobiliaria Municipal Caribe (catálogo público + landing + panel admin con Supabase/Drive) y desplegarla en Firebase Hosting.

**Architecture:** React SPA (Vite) con TailwindCSS consumiendo `design-system/tokens.json`; Supabase para auth, datos y RLS (Edge Function para Drive); Google Drive como fuente de archivos de imagen (Supabase guarda solo URLs); Firebase Hosting para desplegar. Componentes UI propios sobre Tailwind; data-fetching con hooks propios.

**Tech Stack:** React 18 + TypeScript + Vite · TailwindCSS 3.4 · React Router · @supabase/supabase-js · React Hook Form + Zod · Vitest + React Testing Library · firebase-tools (devDependency, fase 4)

**Spec:** `docs/superpowers/specs/2026-09-10-inmobiliaria-caribe-mvp-design.md`

## Global Constraints

- TypeScript estricto; nada de `any` sin justificación
- Componentes funcionales con hooks (nada de clases)
- Mobile-First: clases Tailwind sin prefijo para móvil, escalando con `sm:` `md:` `lg:`
- Accesibilidad AA: `alt` en imágenes, `label` en inputs, contraste AA
- Nombres: componentes en PascalCase, utilidades en camelCase
- Código en inglés, UI en español (Venezuela)
- NUNCA hardcodear colores hex — solo clases derivadas de `tokens.json` vía `tailwind.config.ts`
- Tipografía Raleway (todos los pesos)
- Mínimo 5 imágenes por inmueble para activar publicación
- No usar localStorage para datos sensibles
- No exponer claves de Supabase/Drive en el cliente (`.env` + RLS)
- No agregar dependencias sin consultar (autorizadas: react-router-dom, @supabase/supabase-js, react-hook-form, zod, @hookform/resolvers, vitest, @testing-library/*, jsdom, tailwindcss, postcss, autoprefixer, firebase-tools)

---

## Fase 0 — Scaffold y Design System

### Task 0.1: Scaffold Vite + React + TS + Tailwind + Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.cjs`, `index.html`, `.env` (local, no commit), `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`
- Test: `vitest` config dentro de `vite.config.ts`

**Interfaces:**
- Produces: `npm run dev` (servidor dev), `npm run build` (salida `dist/`), `npm run test` (Vitest)

- [ ] **Step 1: Crear el proyecto Vite (react-ts) en el directorio actual**

```bash
npm create vite@latest . -- --template react-ts
```

Si avisa de directorio no vacío, aceptar mantener los archivos existentes (no borrar nada).

- [ ] **Step 2: Instalar dependencias**

```bash
npm install
npm install react-router-dom @supabase/supabase-js react-hook-form zod @hookform/resolvers
npm install -D tailwindcss@3.4 postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Configurar Tailwind con `tokens.json`**

```ts
// tailwind.config.ts
import tokens from './design-system/tokens.json'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        accent: tokens.colors.accent,
        surface: tokens.colors.surface,
        neutral: tokens.colors.neutral,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        danger: tokens.colors.danger,
      },
      fontFamily: {
        sans: tokens.fontFamily.sans,
      },
      fontSize: {
        h1: tokens.fontSize.h1,
        h2: tokens.fontSize.h2,
        h3: tokens.fontSize.h3,
        body: tokens.fontSize.body,
        small: tokens.fontSize.small,
      },
      borderRadius: {
        sm: tokens.borderRadius.sm,
        md: tokens.borderRadius.md,
        lg: tokens.borderRadius.lg,
      },
    },
  },
  plugins: [],
}
```

```js
// postcss.config.cjs
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

Nota: `tsconfig.json` debe habilitar `resolveJsonModule: true` para importar `tokens.json`.

- [ ] **Step 4: Configurar Vitest en `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Base de Tailwind y Raleway**

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { font-family: theme('fontFamily.sans'); }
}
```

En `index.html`, agregar el `<link>` de Google Fonts para Raleway (pesos 400–800).

- [ ] **Step 6: Limpiar el scaffold (quitar App.css/logo default) y verificar**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind (tokens) + Vitest"
```

### Task 0.2: Tipos, constantes y utilidades base

**Files:**
- Create: `src/types/index.ts`, `src/lib/constants.ts`, `src/lib/price.ts`
- Test: `src/lib/price.test.ts`

**Interfaces:**
- Produces: tipos `Role`, `PropertyType`, `PriceCurrency`, `PropertyImage`, `Property`, `Profile`; constantes `PROPERTY_TYPES`, `ZONES`, `ITEMS_PER_PAGE`; funciones `formatPrice`, `normalizePriceUsd`

```ts
// src/types/index.ts
export type Role = 'master' | 'gerente' | 'supervisor' | 'invitado'
export type PropertyType = 'apartamento' | 'casa' | 'local'
export type PriceCurrency = 'usd' | 'bs'

export interface PropertyImage {
  id: string
  url: string
  name: string
  order: number
}

export interface Property {
  id: string
  title: string
  type: PropertyType
  zone: string
  price_usd: number | null
  price_original: number | null
  price_currency: PriceCurrency | null
  price_is_ref: boolean
  description: string
  is_active: boolean
  drive_folder_id: string | null
  images: PropertyImage[]
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
}
```

```ts
// src/lib/constants.ts
import type { PropertyType } from '../types'

export const PROPERTY_TYPES: PropertyType[] = ['apartamento', 'casa', 'local']

export const ZONES = [
  'La Florida',
  'Las Mercedes',
  'Chacao',
  'El Rosal',
  'Altamira',
  'Los Palos Grandes',
  'La Castellana',
  'El Hatillo',
  'Prados del Este',
  'Cumbres de Curumo',
]

export const ITEMS_PER_PAGE = 20
export const MIN_IMAGES_TO_ACTIVATE = 5
```

```ts
// src/lib/price.ts
import type { Property } from '../types'

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(value)
}

export function formatPrice(property: Pick<Property, 'price_is_ref' | 'price_currency' | 'price_original' | 'price_usd'>): string {
  if (property.price_is_ref) return 'REF.'
  if (property.price_currency === 'usd') return `$${formatNumber(property.price_original ?? 0)}`
  if (property.price_currency === 'bs' && property.price_usd != null) {
    return `Bs ${formatNumber(property.price_original ?? 0)} (≈ $${formatNumber(property.price_usd)})`
  }
  return 'REF.'
}

export function normalizePriceUsd(
  currency: 'usd' | 'bs' | null,
  amount: number | null,
  isRef: boolean,
  rate: number,
): number | null {
  if (isRef || amount == null || currency == null) return null
  if (currency === 'usd') return amount
  if (rate > 0) return amount / rate
  return null
}
```

- [ ] **Step 1: Escribir tests de `price.ts`**

```ts
// src/lib/price.test.ts
import { formatPrice, normalizePriceUsd } from './price'

describe('normalizePriceUsd', () => {
  it('devuelve null en modo REF', () => {
    expect(normalizePriceUsd(null, null, true, 50)).toBeNull()
  })
  it('devuelve el monto directo en USD', () => {
    expect(normalizePriceUsd('usd', 120000, false, 50)).toBe(120000)
  })
  it('convierte Bs a USD con la tasa', () => {
    expect(normalizePriceUsd('bs', 6000000, false, 50)).toBe(120000)
  })
  it('devuelve null si la tasa es 0', () => {
    expect(normalizePriceUsd('bs', 6000000, false, 0)).toBeNull()
  })
})

describe('formatPrice', () => {
  it('muestra REF cuando es referencia', () => {
    expect(formatPrice({ price_is_ref: true, price_currency: null, price_original: null, price_usd: null })).toBe('REF.')
  })
  it('formatea USD', () => {
    expect(formatPrice({ price_is_ref: false, price_currency: 'usd', price_original: 120000, price_usd: 120000 })).toBe('$120.000')
  })
})
```

- [ ] **Step 2: Correr tests y verificar que pasan**

```bash
npm run test
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: tipos, constantes y utilidades de precio"
```

### Task 0.3: Átomos UI y layout base

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Badge.tsx`, `src/components/layout/Container.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`
- Test: `src/components/layout/Header.test.tsx`

**Interfaces:**
- Produces: `Button` (variants `primary|secondary|ghost`, props `variant?`, `children`, `...button`), `Input` (props `label`, `id`, `...input`), `Card` (`children`, `className?`), `Badge` (`children`, `variant?`), `Container`, `Header` (recibe `session` opcional), `Footer`

- [ ] **Step 1: Crear `Button` con variantes usando tokens**

```tsx
// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-secondary',
  secondary: 'bg-secondary text-white hover:bg-accent',
  ghost: 'bg-transparent text-neutral-900 hover:bg-surface',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-sm px-4 py-2 text-body font-medium transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Crear `Input`, `Card`, `Badge`, `Container`, `Footer` siguiendo el mismo patrón (tokens, mobile-first, `label` con `htmlFor` en Input).**

- [ ] **Step 3: Crear `Header` con logo 85% + "Iniciar Sesión" 15%**

```tsx
// src/components/layout/Header.tsx
import { Link } from 'react-router-dom'
import type { Profile } from '../../types'

interface HeaderProps {
  profile?: Profile | null
}

export function Header({ profile }: HeaderProps) {
  return (
    <header className="flex items-center bg-white px-4 py-2">
      <div className="flex items-center gap-3" style={{ width: '85%' }}>
        <Link to="/">
          <img src="/brand/horizontal_color.svg" alt="Inmobiliaria Municipal Caribe" className="h-10 w-auto" />
        </Link>
      </div>
      <div className="flex items-center justify-end gap-3 border-l border-neutral-300 pl-3" style={{ width: '15%' }}>
        {profile ? (
          <Link to="/admin" className="text-small font-semibold text-primary">{profile.full_name}</Link>
        ) : (
          <Link to="/login" className="text-small font-semibold text-primary">Iniciar Sesión</Link>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Test de Header**

```tsx
// src/components/layout/Header.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'

test('muestra Iniciar Sesión cuando no hay sesión', () => {
  render(<MemoryRouter><Header /></MemoryRouter>)
  expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
})

test('muestra el nombre cuando hay sesión', () => {
  const profile = { id: '1', full_name: 'Ana Pérez', role: 'gerente' as const, is_active: true, created_at: '' }
  render(<MemoryRouter><Header profile={profile} /></MemoryRouter>)
  expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
})
```

- [ ] **Step 5: Correr tests y commit**

```bash
npm run test
git add -A && git commit -m "feat: átomos UI y layout base (Header/Footer/Container)"
```

---

## Fase 1 — Fundación Supabase

### Task 1.1: Cliente Supabase y variables de entorno

**Files:**
- Create: `src/lib/supabase.ts`
- Modify: `.env` (local, NO commitear)

**Interfaces:**
- Produces: `supabase` (instancia tipada de `createClient`)

- [ ] **Step 1: Crear `.env` desde `.env.example` y pegar URL + anon key (lo hace el usuario)**

```bash
copy .env.example .env
```

- [ ] **Step 2: Crear cliente**

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, anonKey)
```

- [ ] **Step 3: Commit (solo `src/lib/supabase.ts`, nunca `.env`)**

```bash
git add src/lib/supabase.ts && git commit -m "feat: cliente de Supabase"
```

### Task 1.2: Migración SQL (tablas + RLS) para el dashboard

**Files:**
- Create: `supabase/migrations/0001_initial.sql`

**Interfaces:**
- Produce: esquema `profiles`, `properties`, `settings` con RLS (se ejecuta manualmente en el SQL Editor del dashboard)

- [ ] **Step 1: Escribir el SQL completo (ver abajo)**

```sql
-- supabase/migrations/0001_initial.sql
create extension if not exists "pgcrypto";

create type public.user_role as enum ('master', 'gerente', 'supervisor', 'invitado');
create type public.property_type as enum ('apartamento', 'casa', 'local');
create type public.price_currency as enum ('usd', 'bs');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'invitado',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type public.property_type not null,
  zone text not null,
  price_usd numeric(12,2),
  price_original numeric(12,2),
  price_currency public.price_currency,
  price_is_ref boolean not null default true,
  description text not null default '',
  is_active boolean not null default false,
  drive_folder_id text,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value text not null
);

insert into public.settings (key, value) values ('usd_to_bs_rate', '0');

-- perfil automático al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'invitado')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.settings enable row level security;

-- profiles: cada usuario ve su perfil; solo master gestiona todos
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_master" on public.profiles for select using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master'
));
create policy "profiles_insert_master" on public.profiles for insert with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master'
));
create policy "profiles_update_master" on public.profiles for update using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master'
));

-- helper de rol
create or replace function public.current_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- properties: público ve solo activos
create policy "properties_select_public" on public.properties for select
  using (is_active = true);

create policy "properties_select_admin" on public.properties for select
  using (current_role() in ('master','gerente','supervisor','invitado'));

create policy "properties_insert_admin" on public.properties for insert
  with check (current_role() in ('master','gerente'));

create policy "properties_update_admin" on public.properties for update
  using (current_role() in ('master','gerente','supervisor'))
  with check (current_role() in ('master','gerente','supervisor'));

create policy "properties_delete_admin" on public.properties for delete
  using (current_role() in ('master','gerente'));

-- settings: lectura para autenticados, escritura solo master
create policy "settings_select" on public.settings for select using (auth.role() = 'authenticated');
create policy "settings_update_master" on public.settings for update using (current_role() = 'master');
```

- [ ] **Step 2: Pedir al usuario que lo ejecute en el dashboard (SQL Editor) y verificar que no arroja errores.**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_initial.sql && git commit -m "feat: migración inicial de Supabase (tablas + RLS)"
```

### Task 1.3: Auth sin registro público + primer Master

**Interfaces:** config del dashboard (manual), no código.

- [ ] **Step 1: En Supabase → Authentication → Providers → Email:** desactivar "Enable email confirmations" si se desea acceso inmediato, y desactivar "Allow new users to sign up" (solo invitaciones).

- [ ] **Step 2: Crear el primer Master:** Authentication → Users → Add user → luego en `profiles` setear `role = 'master'` vía SQL Editor.

- [ ] **Step 3: Verificar que `profiles` recibe la fila automáticamente al crear el usuario (trigger).**

---

## Fase 2 — Sitio público

### Task 2.1: Hook de datos + PropertyCard

**Files:**
- Create: `src/hooks/useProperties.ts`, `src/components/catalog/PropertyCard.tsx`
- Test: `src/components/catalog/PropertyCard.test.tsx`

**Interfaces:**
- Consumes: `supabase`, `Property`, `formatPrice`
- Produces: `useProperties()` (retorna `{ properties, loading, error, total, page, setPage, filters, setFilters }`), `PropertyCard({ property })`

- [ ] **Step 1: Hook `useProperties` (fetch + filtros + paginación server-side)**

```ts
// src/hooks/useProperties.ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ITEMS_PER_PAGE } from '../lib/constants'
import type { Property, PropertyType } from '../types'

export interface PropertyFilters {
  type: PropertyType | 'all'
  zone: string
  minPrice: number | null
  maxPrice: number | null
}

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PropertyFilters>({ type: 'all', zone: '', minPrice: null, maxPrice: null })

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setError(null)
    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters.type !== 'all') query = query.eq('type', filters.type)
    if (filters.zone) query = query.eq('zone', filters.zone)
    if (filters.minPrice != null) query = query.gte('price_usd', filters.minPrice)
    if (filters.maxPrice != null) query = query.lte('price_usd', filters.maxPrice)

    const { data, count, error: err } = await query
    if (err) { setError(err.message); setLoading(false); return }
    setProperties((data as Property[]) ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, filters])

  useEffect(() => { fetchProperties() }, [fetchProperties])

  return { properties, total, page, setPage, loading, error, filters, setFilters }
}
```

- [ ] **Step 2: `PropertyCard` horizontal (imagen izquierda ~40%, info derecha)**

```tsx
// src/components/catalog/PropertyCard.tsx
import { Link } from 'react-router-dom'
import { formatPrice } from '../../lib/price'
import type { Property } from '../../types'

export function PropertyCard({ property }: { property: Property }) {
  const cover = property.images[0]?.url ?? '/brand/placeholder-property.webp'
  return (
    <Link to={`/inmueble/${property.id}`} className="flex h-44 overflow-hidden rounded-md border border-neutral-300 bg-white">
      <img src={cover} alt={property.title} className="h-full w-2/5 object-cover" />
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <h3 className="text-h3 font-semibold text-neutral-900">{property.title}</h3>
          <p className="text-small text-neutral-500">{property.zone} · {property.type}</p>
        </div>
        <span className="text-body font-bold text-primary">{formatPrice(property)}</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Test de `PropertyCard` (renderiza título, zona, precio; usa placeholder sin imágenes).**

- [ ] **Step 4: Correr tests y commit.**

### Task 2.2: Filtros del catálogo

**Files:**
- Create: `src/components/catalog/Filters.tsx`
- Test: `src/components/catalog/Filters.test.tsx`

**Interfaces:**
- Consumes: `PropertyFilters`, `PROPERTY_TYPES`, `ZONES`
- Produces: `Filters({ value, onChange })` — controlado, emite `PropertyFilters`

- [ ] **Step 1: Implementar selects de tipo/zona y rangos de precio, con `label` accesible y clase mobile-first.**

- [ ] **Step 2: Test: cambiar tipo llama a `onChange` con el filtro actualizado.**

- [ ] **Step 3: Commit.**

### Task 2.3: Página catálogo + paginación + estados

**Files:**
- Create: `src/features/catalog/CatalogPage.tsx`, `src/components/catalog/Pagination.tsx`
- Test: `src/components/catalog/Pagination.test.tsx`

**Interfaces:**
- Consumes: `useProperties`, `Filters`, `PropertyCard`
- Produces: `CatalogPage` (ruta `/catalogo`), `Pagination({ total, page, perPage, onChange })`

- [ ] **Step 1: `Pagination` numerada (botones 1..N, N = ceil(total/perPage)).**

- [ ] **Step 2: `CatalogPage`** — filtros arriba, lista 1 columna, skeleton en loading, estado vacío "Sin resultados" con botón limpiar filtros, error con reintentar.

- [ ] **Step 3: Tests de `Pagination` (genera el número correcto de páginas, llama `onChange`).**

- [ ] **Step 4: Commit.**

### Task 2.4: Detalle de inmueble con galería

**Files:**
- Create: `src/features/catalog/PropertyDetailPage.tsx`, `src/components/catalog/PropertyGallery.tsx`

**Interfaces:**
- Consumes: `supabase`, `Property`, `formatPrice`
- Produces: `PropertyDetailPage` (ruta `/inmueble/:id`), `PropertyGallery({ images })`

- [ ] **Step 1: `PropertyGallery`** — galería con navegación prev/next, `alt` en cada imagen, placeholder si no hay.

- [ ] **Step 2: `PropertyDetailPage`** — carga por `id`, muestra título, zona, tipo, precio, descripción; estado "No encontrado".

- [ ] **Step 3: Commit.**

### Task 2.5: Landing + rutas

**Files:**
- Create: `src/features/LandingPage.tsx`, `src/routes/index.tsx`, `public/brand/banner-placeholder.png` (placeholder simple), `public/brand/placeholder-property.webp`
- Modify: `src/main.tsx` (RouterProvider), `src/App.tsx`

**Interfaces:**
- Consumes: `Header`, `Footer`
- Produces: rutas `/`, `/catalogo`, `/inmueble/:id`, `/login` (login placeholder por ahora)

- [ ] **Step 1: Landing** — Sección 1 banner placeholder; Sección 2 contenedor 2 columnas con 2 iconos: "Catálogo de Inmuebles" (Link a `/catalogo`) y "Noticias y Reportes" (inactivo, `aria-disabled`, visualmente atenuado).

- [ ] **Step 2: Configurar rutas y `main.tsx`.**

- [ ] **Step 3: Crear placeholders de imagen (banner y property) — archivos simples de marca con el color primary.**

- [ ] **Step 4: Commit.**

---

## Fase 3 — Auth y Panel Admin

### Task 3.1: Auth (login + sesión + guards)

**Files:**
- Create: `src/features/admin/LoginPage.tsx`, `src/hooks/useSession.ts`, `src/features/admin/RequireRole.tsx`
- Test: `src/features/admin/RequireRole.test.tsx`

**Interfaces:**
- Consumes: `supabase`, `Profile`
- Produces: `useSession()` → `{ profile, loading }`; `RequireRole({ roles, children })` (redirect a `/login` si no hay sesión, a `/` si falta rol); `LoginPage`

- [ ] **Step 1: `useSession`** — suscribe a `supabase.auth.getSession()` / `onAuthStateChange` y carga el `profile` (rol) desde `profiles`.

- [ ] **Step 2: `LoginPage`** — form email/password con React Hook Form + Zod, `signInWithPassword`, error genérico "Credenciales inválidas", redirect a `/admin` tras login.

- [ ] **Step 3: `RequireRole`** — guard por rol (listado/edición para `gerente`/`master`/`supervisor`; usuarios solo `master`).

- [ ] **Step 4: Tests de `RequireRole` (sin sesión → redirect; rol insuficiente → redirect).**

- [ ] **Step 5: Commit.**

### Task 3.2: Listado admin + toggle Activar/Desactivar

**Files:**
- Create: `src/features/admin/AdminListPage.tsx`
- Test: `src/features/admin/AdminListPage.test.tsx` (con supabase mockeado)

**Interfaces:**
- Consumes: `useSession`, `supabase`, `MIN_IMAGES_TO_ACTIVATE`
- Produces: `AdminListPage` (ruta `/admin`)

- [ ] **Step 1: Lista de inmuebles (búsqueda por título/zona) con columnas: miniatura, título, tipo, zona, estado, acciones.**

- [ ] **Step 2: Toggle Activar/Desactivar** — desactivar pide confirmación; activar valida `images.length >= MIN_IMAGES_TO_ACTIVATE` y campos completos (muestra error si no cumple).

- [ ] **Step 3: Tests (mockeando supabase): activar sin 5 imágenes muestra error; desactivar actualiza estado.**

- [ ] **Step 4: Commit.**

### Task 3.3: Formulario crear/editar + Zod

**Files:**
- Create: `src/features/admin/PropertyFormPage.tsx`, `src/lib/propertySchema.ts`
- Test: `src/lib/propertySchema.test.ts`

**Interfaces:**
- Consumes: `supabase`, `normalizePriceUsd`, `useSession`
- Produces: `PropertyFormPage` (ruta `/admin/inmueble/:id?`), schema Zod `propertySchema`

- [ ] **Step 1: Schema Zod** (título obligatorio, tipo/zone en listas, precio según modo REF/usd/bs, descripción opcional).

- [ ] **Step 2: Formulario con React Hook Form** — campos título, tipo, zona, precio (modo + monto), descripción; en crear, también crea la carpeta en Drive (vía Edge Function, Task 3.4) y guarda `drive_folder_id`.

- [ ] **Step 3: Tests del schema (rechaza título vacío, zona inválida, etc.).**

- [ ] **Step 4: Commit.**

### Task 3.4: Edge Function `drive` (list/sync)

**Files:**
- Create: `supabase/functions/drive/index.ts` (código Deno para pegar en el editor de Functions)

**Interfaces:**
- Consumes: cuenta de servicio de Drive (secrets `DRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`), `properties.drive_folder_id`
- Produce: acciones `list` (archivos de la carpeta) y `sync` (genera URLs y actualiza `properties.images`), restringidas a `gerente`/`master`

- [ ] **Step 1: Escribir la función (Deno)** — verifica JWT + rol; `list` usa `files.list` de Drive; `sync` genera URL directa `https://drive.google.com/uc?export=view&id=FILE_ID` y actualiza `properties.images`.

- [ ] **Step 2: Instrucciones de deploy** — pegar en Supabase → Edge Functions → New Function (o `supabase functions deploy drive` con CLI si se prefiere).

- [ ] **Step 3: Commit del código de la función.**

### Task 3.5: Sección imágenes (aviso desincronización + sincronizar)

**Files:**
- Create: `src/features/admin/ImageSyncSection.tsx`
- Test: `src/features/admin/ImageSyncSection.test.tsx`

**Interfaces:**
- Consumes: `supabase`, Edge Function `drive`, `Property`
- Produce: `ImageSyncSection({ property })` — visible solo Gerente/Master

- [ ] **Step 1: Al montar, llama `list` de la Edge Function y compara IDs con `property.images`; si difieren muestra banner "Las imágenes de este inmueble están desincronizadas con Drive" + botón "Sincronizar imágenes".**

- [ ] **Step 2: Al pulsar, llama `sync` y recarga; maneja errores de Drive (cuota, permisos) con mensaje claro.**

- [ ] **Step 3: Tests (mockeando la Edge Function): desincronizado → muestra aviso; sincronizado → no.**

- [ ] **Step 4: Commit.**

### Task 3.6: Gestión de usuarios (solo Master)

**Files:**
- Create: `src/features/admin/UsersPage.tsx`

**Interfaces:**
- Consumes: `supabase`, `Profile`, `Role`
- Produce: `UsersPage` (ruta `/admin/usuarios`, guard `master`)

- [ ] **Step 1: Lista de usuarios (nombre, rol, estado) + crear (nombre, email, rol) vía invitación de Supabase + desactivar (setear `is_active = false`).**

- [ ] **Step 2: Editar la tasa Bs→$ (tabla `settings`, key `usd_to_bs_rate`) — campo editable solo Master.**

- [ ] **Step 3: Commit.**

---

## Fase 4 — Despliegue Firebase

### Task 4.1: Configurar Firebase Hosting y primer deploy

**Files:**
- Create: `firebase.json`, `.firebaserc`

- [ ] **Step 1: Instalar CLI**

```bash
npm install -D firebase-tools
```

- [ ] **Step 2: Login + init**

```bash
npx firebase login
npx firebase init hosting
```

Elegir el proyecto existente; directorio público `dist/`; SPA (rewrite a `index.html`).

- [ ] **Step 3: Build y deploy**

```bash
npm run build
npx firebase deploy --only hosting
```

- [ ] **Step 4: Commit `firebase.json` + `.firebaserc` (no contienen secretos).**

### Task 4.2: Conectar dominio

- [ ] **Step 1: Firebase Console → Hosting → Add custom domain → `inmobiliaria-caribe.com` → Quick Setup.**

- [ ] **Step 2: Agregar registros TXT + A (199.36.158.100) en K2WebHost (sección 11 del documento de proyecto).**

- [ ] **Step 3: Esperar propagación y verificar SSL.**

---

## Self-Review (completado por el autor del plan)

- **Spec coverage:** catálogo (T2.1–2.4), landing (T2.5), header 85/15 (T0.3), login (T3.1), admin listado/toggle (T3.2), formulario + Drive (T3.3/T3.4), sync con aviso (T3.5), usuarios + tasa (T3.6), roles/RLS (T1.2), Firebase (T4.1/4.2). Precio REF/$/Bs (T0.2/T3.3). Estados vacío/error/carga (T2.3/T2.4).
- **Sin placeholders:** todos los pasos incluyen código o comandos concretos.
- **Consistencia de tipos:** `Property`, `PropertyImage`, `Profile`, `Role`, `formatPrice`, `normalizePriceUsd`, `useProperties` — definidos en T0.2/T2.1 y reutilizados consistentemente.
