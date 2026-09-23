# 01 — Estado actual de la base de datos

- **Fuente:** introspección SQL ejecutada en el proyecto productivo el **2026-09-22 22:05 UTC**.
- **Script:** [`sql/introspect.sql`](./sql/introspect.sql).
- **Motor:** PostgreSQL 17.6 (Supabase).
- **Datos:** 2 usuarios (`auth.users`), 2 `profiles`, 3 `propiedades`, 1 fila en `settings`.

---

## 1. Tablas y columnas

### `public.profiles` (2 filas)

| # | Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|---|
| 1 | `id` | uuid | NO | — | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| 2 | `full_name` | text | NO | — | legado; se conserva |
| 3 | `role` | `user_role` | NO | `'invitado'` | enum |
| 4 | `is_active` | boolean | NO | `true` | desactivar sin borrar |
| 5 | `created_at` | timestamptz | NO | `now()` | |
| 6 | `first_name` | text | NO | `''` | migración 0002 |
| 7 | `last_name` | text | NO | `''` | migración 0002 |
| 8 | `phone` | text | YES | — | opcional |
| 9 | `email` | text | NO | `''` | denormalizado desde `auth.users` |

### `public.propiedades` (3 filas)

| # | Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|---|
| 1 | `id` | uuid | NO | `gen_random_uuid()` | PK |
| 2 | `titulo` | text | NO | — | ex-`title` (0003) |
| 3 | `tipo` | `property_type` | NO | — | ex-`type` (0003) |
| 4 | `parroquia` | text | NO | — | ex-`zone` (0003) |
| 5 | `price_usd` | numeric | YES | — | precio normalizado |
| 6 | `price_original` | numeric | YES | — | monto original |
| 7 | `price_currency` | `price_currency` | YES | — | `usd` \| `bs` |
| 8 | `price_is_ref` | boolean | NO | `true` | muestra "REF." |
| 9 | `description` | text | NO | `''` | |
| 10 | `is_active` | boolean | NO | `false` | visibilidad pública |
| 11 | `drive_folder_id` | text | YES | — | id de carpeta en Drive |
| 12 | `images` | jsonb | NO | `'[]'::jsonb` | `[{id,url,name,order}]` |
| 13 | `created_at` | timestamptz | NO | `now()` | |
| 14 | `updated_at` | timestamptz | NO | `now()` | **sin trigger de actualización** |

> ⚠️ La introspección no capturó `numeric_precision`/`numeric_scale`. Las migraciones declaran
> `numeric(12,2)`; conviene confirmarlo con `sql/introspect.sql` (sección de precisión) si se
> planea un cambio de tipo.

### `public.settings` (1 fila)

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `key` | text | NO | PK |
| `value` | text | NO | |

Contenido actual: `usd_to_bs_rate = "0"`.

---

## 2. Tipos enumerados (enums)

- **`user_role`:** `master`, `gerente`, `supervisor`, `invitado`
- **`property_type`:** `apartamento`, `casa`, `local`
- **`price_currency`:** `usd`, `bs`

Coinciden exactamente con `src/types/index.ts`.

---

## 3. Índices

| Tabla | Índice | Definición |
|---|---|---|
| profiles | `profiles_pkey` | UNIQUE (id) |
| propiedades | `properties_pkey` | UNIQUE (id) |
| settings | `settings_pkey` | UNIQUE (key) |

**Hallazgo 🟠:** no existen más índices. El catálogo filtra por `is_active`, `tipo`, `parroquia`,
`price_usd` y ordena por `created_at`, pero solo hay el índice de la PK. Con 3 filas no se nota;
con decenas/cientos degradará y forzará *seq scans*. Ver `05`.

> Nota cosmética: el índice conserva el nombre `properties_pkey` aunque la tabla se llama
> `propiedades` (efecto del `rename` de la migración 0003).

---

## 4. Restricciones (constraints)

| Tabla | Nombre | Tipo | Definición |
|---|---|---|---|
| profiles | `profiles_pkey` | PK | PRIMARY KEY (id) |
| profiles | `profiles_id_fkey` | FK | `id` → `auth.users(id)` ON DELETE CASCADE |
| propiedades | `properties_pkey` | PK | PRIMARY KEY (id) |
| settings | `settings_pkey` | PK | PRIMARY KEY (key) |

**Hallazgo 🟠:** no hay ningún `CHECK`. El tipo `numeric` de `price_usd`/`price_original` admite
valores negativos, y **nada impide** marcar `is_active = true` con `images = '[]'`. Las reglas
"≥5 imágenes" y "campos completos" viven solo en el cliente
(`src/features/admin/AdminListPage.tsx:92-103`). Ver `05`.

---

## 5. Políticas RLS (Row Level Security)

RLS está habilitado en `profiles`, `propiedades` y `settings`. Todas las políticas aplican al rol
`public` (Postgres) y delegan la decisión en `auth.uid()` / `auth.role()` / `get_user_role()`.

| Tabla | Política | Cmd | `USING` / `WITH CHECK` |
|---|---|---|---|
| profiles | `profiles_select_own` | SELECT | `auth.uid() = id` |
| profiles | `profiles_select_master` | SELECT | `get_user_role() = 'master'` |
| profiles | `profiles_insert_master` | INSERT | CHECK `get_user_role() = 'master'` |
| profiles | `profiles_update_master` | UPDATE | `get_user_role() = 'master'` (sin CHECK) |
| propiedades | `properties_select_public` | SELECT | `is_active = true` |
| propiedades | `properties_select_admin` | SELECT | `get_user_role() IN (master,gerente,supervisor,invitado)` |
| propiedades | `properties_insert_admin` | INSERT | CHECK `get_user_role() IN (master,gerente)` |
| propiedades | `properties_update_admin` | UPDATE | `get_user_role() IN (master,gerente,supervisor)` |
| propiedades | `properties_delete_admin` | DELETE | `get_user_role() IN (master,gerente)` |
| settings | `settings_select` | SELECT | `auth.role() = 'authenticated'` |
| settings | `settings_update_master` | UPDATE | `get_user_role() = 'master'` |

### Hallazgos de permisos

- **🔴 Incoherencia funcional:** la UI permite al **gerente** guardar la tasa de cambio
  (`src/features/admin/AdminListPage.tsx:31` → `canManageRate` incluye `gerente`), pero la política
  `settings_update_master` **solo permite a `master`**. El `update` del gerente falla silenciosamente.
- **🟡 `profiles_update_master`** no tiene `WITH CHECK`: un master puede reasignar roles
  (incluso ascender a otro a `master`) sin validación adicional. Es intencional en parte, pero
  conviene acotarlo.
- **🔵 `settings_select`** permite leer la tasa a cualquier autenticado (incluido `invitado`); aceptable.
- La lógica de "≥5 imágenes para activar" **no** está garantizada por RLS: un `gerente` podría
  activar por API directa sin fotos.

---

## 6. Funciones y triggers

| Función | Argumentos | Retorna | SECURITY DEFINER |
|---|---|---|---|
| `public.get_user_role()` | — | `user_role` | Sí |
| `public.handle_new_user()` | — | `trigger` | Sí |

- `get_user_role()` lee `role` de `profiles` para `auth.uid()`. Es `security definer` para evitar
  recursión en las políticas. **Correcto.**
- `handle_new_user()` inserta en `profiles` al crear un usuario en `auth.users`.

**La consulta no listó triggers en `public`.** El trigger `on_auth_user_created` vive en
`auth.users` (esquema `auth`), por eso no aparece; **no significa que falte**. Se recomienda
confirmar con `sql/introspect.sql` (sección de triggers sobre `auth.users`).

**Hallazgo 🟠:** la columna `updated_at` **no se actualiza sola**. No hay trigger `BEFORE UPDATE`;
queda congelada en el valor de creación. Ver `05`.

---

## 7. Extensiones instaladas

`pg_stat_statements` 1.11 · `pgcrypto` 1.3 · `plpgsql` 1.0 · `supabase_vault` 0.3.1 · `uuid-ossp` 1.1

`pgcrypto` está presente (usado por `gen_random_uuid()`). No falta ninguna para el modelo actual.

---

## 8. Comparación con las migraciones (`supabase/migrations/`)

**Conclusión: la cadena de migraciones SÍ reproduce el esquema observado.** Aplicando en orden
`0001 → 0002 → 0003` sobre una base vacía se obtienen las mismas tablas, columnas, enums,
políticas y funciones. Esto es una **buena noticia**: el *drift* es menor de lo que se temía.

Matices a documentar:

1. `0003` advierte que se aplicó **manualmente** y pide ejecutarla "solo donde la tabla aún se llame
   `properties`". Un `db reset` desde cero la ejecutaría bien, pero el flujo real fue manual.
2. El índice conserva el nombre `properties_pkey` (efecto del rename).
3. No se capturó la precisión de `numeric`; la migración dice `numeric(12,2)`.
4. Las **mejoras** (índices, `CHECK`, trigger de `updated_at`) **no existen todavía** en migraciones
   ni en la DB. Deberán agregarse como migraciones nuevas (`0004_...`).

---

## 9. Resumen de hallazgos de esta auditoría

| # | Severidad | Hallazgo |
|---|---|---|
| 1 | ✅ | UI permitía a `gerente` editar `settings`; **decisión Fase 1:** solo `master` (UI alineada). |
| 2 | 🟠 | Sin índices para filtros/orden del catálogo. |
| 3 | 🟠 | Sin `CHECK` de precios ni de reglas de activación (≥5 imágenes). |
| 4 | 🟠 | `updated_at` no se actualiza automáticamente (falta trigger). |
| 5 | 🟡 | `profiles_update_master` sin `WITH CHECK`. |
| 6 | 🔵 | Índice `properties_pkey` con nombre desactualizado (cosmético). |
| 7 | 🔵 | Precisión de `numeric` sin verificar (revisar). |

El detalle, priorización e impacto están en [`05-deuda-tecnica-y-riesgos.md`](./05-deuda-tecnica-y-riesgos.md).

---

## 10. Actualización 2026-09-23 — Catálogo enriquecido

Se aplicó la migración **`0005_catalogo_enriquecido.sql`**. Cambios respecto a la auditoría del
22/09:

**Tablas nuevas**

| Tabla | Filas (seed) | Notas |
|---|---|---|
| `tipos_inmueble` | 6 | Administrable (Edge Function `catalogos`). |
| `estados` | 3 | Distrito Capital, La Guaira, Miranda. Solo lectura. |
| `municipios` | 23 | UNIQUE(estado_id, nombre). |
| `parroquias` | 88 | UNIQUE(municipio_id, nombre). |

**`public.propiedades` — columnas nuevas**

`tipo_id`, `estado_id`, `municipio_id`, `parroquia_id` (FK), y `habitaciones`, `banos`,
`puestos_estacionamiento`, `metros_construccion`, `metros_terreno` (con `CHECK >= 0`).

- `tipo_id` quedó backfilled desde el `enum tipo`; la columna `tipo` pasa a **nullable**.
- La columna text `parroquia` se conserva (el servidor escribe el nombre oficial).
- Índices parciales nuevos: `propiedades_tipo_id_idx`, `propiedades_estado_id_idx`,
  `propiedades_municipio_id_idx`, `propiedades_parroquia_id_idx` (todos `where is_active = true`).

**Edge Functions:** nueva `catalogos`; `propiedades` extendida (valida tipo y coherencia
territorial en servidor). Detalle en [`09-catalogo-enriquecido.md`](./09-catalogo-enriquecido.md).

**Pendiente:** ejecutar `0006_drop_property_type_enum.sql` (elimina `tipo`, su índice y el enum
`property_type`). Tras ello, la sección 1 de este documento (columna `tipo`) quedará obsoleta.
