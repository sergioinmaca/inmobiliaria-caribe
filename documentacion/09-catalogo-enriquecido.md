# 09 — Catálogo enriquecido (tipos, territorio y métricas)

- **Fecha:** 2026-09-23
- **Estado:** Implementado, desplegado y limpio (`0005` y `0006` aplicadas).
- **Alcance:** catálogo administrable de tipos de inmueble, división territorial
  Estado → Municipio → Parroquia, y métricas del inmueble.

---

## 1. Objetivo

1. **Tipos de inmueble administrables.** Antes eran un `enum` hardcodeado
   (`apartamento|casa|local`) replicado en 5 sitios. Ahora viven en una tabla con CRUD.
2. **Territorio real.** Antes `propiedades.parroquia` era texto con una lista ficticia.
   Ahora existe la división político-territorial de los 3 estados de jurisdicción
   (Distrito Capital, La Guaira, Miranda).
3. **Métricas estructuradas.** `habitaciones`, `banos`, `puestos_estacionamiento`,
   `metros_construccion`, `metros_terreno`.

---

## 2. Modelo de datos

### 2.1 `public.tipos_inmueble`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| nombre | text | UNIQUE |
| orden | integer | default 0 |
| is_active | boolean | default true |
| created_at / updated_at | timestamptz | trigger `set_updated_at` |

Seed: Apartamento, Casa, Local Comercial, Galpón, Terreno, Oficina.

### 2.2 División territorial (solo lectura / seed)

| Tabla | Columnas clave | Restricción |
|---|---|---|
| `estados` | id, nombre, is_active | UNIQUE(nombre) |
| `municipios` | id, estado_id → estados, nombre | UNIQUE(estado_id, nombre) |
| `parroquias` | id, municipio_id → municipios, nombre | UNIQUE(municipio_id, nombre) |

**Seed** (fuente: `siretravi/src/lib/geografia.ts`, normalizada a Title Case):

- 3 estados: Distrito Capital, La Guaira, Miranda.
- 23 municipios.
- **88 parroquias** (22 + 11 + 55).
- Se corrigió la colisión de nombre del municipio **Sucre** (existe en Distrito Capital y
  en Miranda) indexando por `(estado, municipio)`.

> Nota: `PARROQUIAS_POR_MUNICIPIO` de `geografia.ts` se indexaba solo por nombre de
> municipio; ese defecto no se arrastra al quedar normalizado en tablas.

### 2.3 `public.propiedades` — columnas nuevas

| Columna | Tipo | Notas |
|---|---|---|
| tipo_id | uuid FK → tipos_inmueble | backfill desde el `enum tipo` |
| estado_id | uuid FK → estados | derivado de la parroquia |
| municipio_id | uuid FK → municipios | derivado de la parroquia |
| parroquia_id | uuid FK → parroquias | |
| habitaciones | smallint | CHECK ≥ 0 |
| banos | smallint | CHECK ≥ 0 |
| puestos_estacionamiento | smallint | CHECK ≥ 0 |
| metros_construccion | numeric(10,2) | CHECK ≥ 0 |
| metros_terreno | numeric(10,2) | CHECK ≥ 0 |

Se conserva la columna text `parroquia` (compatibilidad). La Edge Function escribe en ella
el **nombre oficial** de la parroquia seleccionada.

Índices parciales (`where is_active = true`): `(tipo_id)`, `(estado_id)`, `(municipio_id)`,
`(parroquia_id)`.

---

## 3. RLS

| Tabla | SELECT | Escritura |
|---|---|---|
| `tipos_inmueble` | público ve `is_active`; internos ven todo | `master`/`gerente` |
| `estados` / `municipios` / `parroquias` | todos | solo `service_role` (seed; sin CRUD) |

---

## 4. Edge Functions

### 4.1 Nueva `catalogos`

`supabase/functions/catalogos/index.ts` — acciones `create` / `update` / `setActive` /
`delete` sobre `tipos_inmueble`, roles `gerente`/`master`. `delete` se rechaza si el tipo
está en uso (sugiere desactivarlo). Reutiliza `_shared/`.

### 4.2 `propiedades` (extendida)

- `PropertyInput` usa `tipo_id` + 3 FK territoriales + 5 métricas.
- Validación en servidor: `tipo_id` existe y está activo; la **parroquia define municipio y
  estado** (coherencia territorial garantizada en el servidor); métricas ≥ 0.
- Escribe el nombre oficial en `parroquia` (text).
- Durante la transición aceptó el nombre legado `tipo`; **retirado** tras ejecutar `0006`.

---

## 5. Frontend

- `src/hooks/useTiposInmueble.ts` y `src/hooks/useTerritorio.ts` (carga con embeds).
- `src/lib/catalogApi.ts` (cliente de `catalogos`); `propertiesApi.ts` actualizado.
- `Filters.tsx`: cascada Estado→Municipio→Parroquia, tipo por catálogo y filtros de
  habitaciones/baños. `useProperties.ts` filtra por `tipo_id` y FKs.
- `PropertyFormPage.tsx`: selects territoriales, tipo desde catálogo y botón **`+`** que abre
  `TypeManagerModal.tsx` (CRUD de tipos).
- `PropertyDetailPage.tsx` y `AdminListPage.tsx`: muestran tipo, ubicación completa y métricas.
- `constants.ts`: se retiraron `PROPERTY_TYPES` y `PARROQUIAS`.
- `propertySchema.ts`: `tipo_id`, ubicación y métricas.

---

## 6. Migraciones y orden de ejecución

1. `0005_catalogo_enriquecido.sql` — aditiva (tablas, seed, columnas, backfill, RLS).
   - `tipo` pasa a `NULL` (no se borra).
2. Desplegar `catalogos` y `propiedades`.
3. Desplegar frontend.
4. Verificación E2E.
5. `0006_drop_property_type_enum.sql` — destructiva: elimina `tipo`, su índice y el enum
   `property_type`. Guarda previa: aborta si algún inmueble no tiene `tipo_id`.

---

## 7. Verificación realizada

| Comprobación | Resultado |
|---|---|
| `npm run lint` | ✅ (1 warning preexistente de `react-hook-form`) |
| `npm test` | ✅ 16 archivos, 61 tests |
| `npm run build` | ✅ |
| Seed vía API | `tipos=6`, `estados=3`, `municipios=23`, `parroquias=88` |
| Columnas nuevas vía API | ✅ |
| Embed `tipo:tipos_inmueble(nombre)` | ✅ (sobrescribe la columna legada `tipo`) |
| E2E producción | ✅ (crear/editar/filtros/detalle/modal de tipos/activar/eliminar) |

Despliegues: `catalogos` v1 ACTIVE, `propiedades` v4 ACTIVE; frontend en Firebase Hosting.

---

## 8. Deuda / pendientes

- ✅ Fallback de transición por `tipo` retirado de `propiedades` (post `0006`).
- 🔵 `tipos_inmueble.orden` no tiene UI de reordenamiento (solo se asigna al crear).
- 🔵 La columna text `parroquia` se conserva por compatibilidad; evaluar su retiro futuro.
- 🟠 `properties_update_admin` sigue permitiendo a `supervisor` tocar la fila completa vía
  API directa (pendiente preexistente, ver `05`).
