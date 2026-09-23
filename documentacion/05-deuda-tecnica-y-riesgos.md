# 05 — Deuda técnica y riesgos

- **Estado:** Diagnóstico vigente
- **Base:** auditoría de `01-estado-actual.md` + revisión del código en `src/` y `supabase/`.

---

## 1. Hallazgos priorizados

Severidad: 🔴 Crítico · 🟠 Alto · 🟡 Medio · 🔵 Bajo

| # | Sev | Hallazgo | Ubicación | Impacto | Remediación |
|---|---|---|---|---|---|
| 1 | ✅ | Un `gerente` podía editar la tasa en la UI, pero RLS solo lo permite a `master` | `src/features/admin/AdminListPage.tsx:31` vs `0001_initial.sql:81` | **Resuelto:** decisión Fase 1 = solo `master`; UI alineada | Alinear UI a master | 
| 2 | 🔴 | Reglas de negocio (activación, `price_usd`) solo en el cliente | `AdminListPage.tsx:92-103`, `PropertyFormPage.tsx:133-173` | Se pueden saltar por API directa | Mover a Edge Function `propiedades` (Escenario B) |
| 3 | 🔴 | Secreto del Apps Script hardcodeado y CORS `*` | `apps-script.gs:17`, `drive/index.ts:38` | Fuga de secreto / invocación no autorizada | `PropertiesService` + CORS restringido |
| 4 | 🟠 | `getFiles()` incluye archivos en papelera | `apps-script.gs:137-144` | Falso "desincronizado" tras eliminar | Filtrar `trashed = false` |
| 5 | 🟠 | Sin índices para filtros/orden del catálogo | DB (solo PKs) | Degradación al crecer | Índices en `0004` |
| 6 | 🟠 | Sin `CHECK` de precios ni de activación | DB (solo PK/FK) | Datos inválidos posibles | `CHECK` en `0004` |
| 7 | 🟠 | `updated_at` no se actualiza solo | DB (sin trigger) | Fechas de modificación falsas | Trigger `BEFORE UPDATE` |
| 8 | 🟠 | Código duplicado entre Edge Functions | `admin/index.ts`, `drive/index.ts` | Mantenimiento y deriva | `_shared/` (doc 03) |
| 9 | 🟡 | `profiles_update_master` sin `WITH CHECK` | `0001_initial.sql:70` | Master puede reasignar roles sin límite | Acotar política |
| 10 | 🟡 | Tipos de DB duplicados a mano en TS | `src/types/index.ts` | Desincronización silenciosa | Tipos compartidos / generados |
| 11 | 🟡 | `.env.example` desactualizado | `.env.example` | Confusión de configuración | Actualizar a secretos reales |
| 12 | 🟡 | Sin auditoría (quién/cuándo) ni `created_by` | Esquema | No hay trazabilidad | Columnas + logging en Edge |
| 13 | 🟡 | Borrado físico de inmuebles | `PropertyFormPage.tsx:188` | Pérdida irreversible | Evaluar soft delete |
| 14 | 🔵 | Índice `properties_pkey` con nombre desactualizado | DB | Cosmético | Renombrar índice |
| 15 | 🔵 | Sin tests de Edge Functions | `supabase/functions/` | Regresiones | Tests en `tests/` |
| 16 | 🔵 | URLs `lh3.googleusercontent.com/d/` no oficiales | `apps-script.gs` | Google podría restringir | Aceptar el riesgo / plan Storage |

---

## 2. Detalle de los hallazgos más importantes

### 2.1 🔴 Incoherencia de permisos sobre `settings`
La UI calcula `canManageRate = ['master','gerente'].includes(role)` (`AdminListPage.tsx:31`), pero la
política `settings_update_master` exige `role = 'master'` (`0001_initial.sql:81`). Un gerente ve el
campo, pulsa "Guardar" y el `UPDATE` es rechazado por RLS sin mensaje claro.

**Decisión pendiente:** ¿la tasa la edita solo `master` o también `gerente`? Si es lo segundo, hay
que ajustar la política RLS.

### 2.2 🔴 Reglas de negocio en el cliente
`MIN_IMAGES_TO_ACTIVATE` es **1** (`src/lib/constants.ts:19`) mientras el spec dice **5**
(`PROYECTO_INMOBILIARIA_CARIBE.md`, sección 5). Además, la validación de activación vive en React; un
`gerente` autenticado puede activar un inmueble sin fotos llamando la API directamente. El Escenario B
mueve esa validación al servidor.

### 2.3 🔴 Seguridad de la integración Drive
- `SCRIPT_SECRET = 'CAMBIA_ESTE_SECRETO'` está en el código versionado (`apps-script.gs:17`). Debe
  moverse a `PropertiesService` del script.
- CORS `Access-Control-Allow-Origin: *` en las dos funciones (`admin/index.ts:9`, `drive/index.ts:39`)
  permite que cualquier origen las invoque. Restringir a los dominios reales.

### 2.4 🟠 Integridad de datos
Sin `CHECK` ni trigger:
- `price_usd`/`price_original` aceptan negativos.
- `is_active = true` es posible con `images = '[]'`.
- `updated_at` nunca cambia (`0001_initial.sql:32`).

Se corrigen con la migración `0004`.

### 2.5 🟡 Configuración
`.env.example` menciona `DRIVE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` y
`VITE_FIREBASE_*`, que **no se usan**. Los secretos reales de la Edge Function `drive` son
`APPS_SCRIPT_URL` y `APPS_SCRIPT_SECRET`. Conviene alinear el archivo.

---

## 3. Matriz de riesgos

| Riesgo | Probabilidad | Impacto | Exposición | Mitigación |
|---|---|---|---|---|
| Reglas de negocio saltables | Media | Alto | 🔴 | Edge Function `propiedades` |
| Fuga del secreto de Apps Script | Media | Alto | 🔴 | `PropertiesService` + CORS |
| Incoherencia `settings` gerente/master | Alta | Medio | 🔴 | Alinear UI + RLS |
| Degradación por falta de índices | Baja (hoy) | Medio | 🟠 | Índices en `0004` |
| Datos inválidos (precios/activación) | Media | Medio | 🟠 | `CHECK` + trigger |
| Dependencia de cuenta Google personal | Baja | Alto | 🟠 | Plan de migración a Storage |
| Deriva por despliegue manual | Media | Medio | 🟠 | Documentar cada cambio |

---

## 4. Lo que NO es deuda (está bien)

- RLS es la barrera real de lectura y funciona.
- `get_user_role()` con `security definer` evita recursión: correcto.
- El patrón de merge de imágenes (`mergeImages`) preserva el orden: correcto.
- La separación "Drive guarda archivos, Supabase guarda URLs": correcta y económica.
- La detección de desincronización bajo demanda (no global) evita *rate limits*: correcto.
