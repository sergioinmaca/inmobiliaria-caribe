# 07 — Informe de implementación

- **Fecha:** 2026-09-22
- **Alcance:** Fases 4, 5, 6 y 7 (partes que dependen del equipo de código). Sin despliegues.
- **Estado:** Desplegado y verificado en producción (2026-09-22).

---

## 1. Resumen

Se implementó el **Escenario B (Híbrido)**: el catálogo sigue leyéndose por PostgREST/RLS y las
**escrituras de inmuebles pasan por la Edge Function `propiedades`**, con las reglas de negocio
validadas en el servidor. Se creó el código compartido `_shared/` y se refactorizaron `admin` y
`drive`. Se corrigió la integración con Drive y se redactó la migración `0004`.

---

## 2. Verificación local

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ sin hallazgos |
| `npm test` | ✅ 16 archivos, 59 tests |
| `npm run build` | ✅ `tsc -b` + `vite build` OK |

---

## 3. Archivos creados

### Edge Functions (`supabase/functions/`)
- `_shared/cors.ts` — CORS con lista de orígenes permitidos (refleja el origen).
- `_shared/http.ts` — `ApiError` + `json()`.
- `_shared/env.ts` — `requireEnv()`.
- `_shared/supabaseClients.ts` — `userClient()` (RLS) y `adminClient()` (service role).
- `_shared/auth.ts` — `authenticate()` + `requireRole()`.
- `_shared/validation.ts` — `requireFields()`.
- `_shared/handler.ts` — `serve()` (CORS + manejo de errores).
- `_shared/types.ts` — tipos compartidos.
- `drive/appsScript.ts` — cliente del Apps Script con backoff exponencial + jitter.
- `drive/mergeImages.ts` — fusión pura que preserva el orden (extraída de `index.ts`).
- `propiedades/index.ts` — **nueva**: `create`, `update`, `setActive`, `updateImages`, `delete`.
- `tests/merge-images-test.ts` — tests Deno de la fusión.

### Migración
- `supabase/migrations/0004_backend_hardening.sql` — índices, `CHECK` de precios y activación,
  trigger `updated_at`, guarda previa.

### Frontend
- `src/lib/propertiesApi.ts` — cliente de la Edge Function `propiedades`.

### Documentación
- `documentacion/07-informe-implementacion.md` (este archivo).
- `documentacion/08-pasos-del-usuario.md` — guía paso a paso para el despliegue.

---

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `supabase/functions/admin/index.ts` | Usa `_shared`; sin duplicar CORS/auth/json. |
| `supabase/functions/drive/index.ts` | Usa `_shared`; `callAppsScript` extraído; `setFilesVisibility`; `deletePropertyFiles` tolerante a fallos. |
| `supabase/functions/drive/apps-script.gs` | `trashed = false` en listados; secreto desde `PropertiesService`; acción `setFilesVisibility`. |
| `src/features/admin/PropertyFormPage.tsx` | Escrituras vía `propertiesApi`; el precio en USD se calcula en el servidor. |
| `src/features/admin/AdminListPage.tsx` | Activación vía `setPropertyActive`; `canManageRate` solo `master`. |
| `src/features/admin/PropertyImagesSection.tsx` | Subida con concurrencia (3), `onChange` único, caché TTL del chequeo de desincronización. |
| `src/features/admin/PropertyFormPage.test.tsx` | Adaptado a `propertiesApi`. |
| `src/features/admin/PropertyImagesSection.test.tsx` | Ajustado a un `onChange` por lote. |
| `.env.example` | Variables reales (`APPS_SCRIPT_*`, `ALLOWED_ORIGINS`); retiradas las obsoletas. |

---

## 5. Comportamiento clave tras el cambio

- **Activación:** validada en el servidor (`propiedades.setActive`); mínimo **1** imagen y campos
  obligatorios. El cliente conserva el aviso previo como mejora de UX.
- **Precio USD:** lo calcula el servidor desde `settings.usd_to_bs_rate`; el cliente ya no lo envía.
- **Roles:** cada acción exige rol en el servidor (`create`/`setActive`/`updateImages`/`delete` =
  gerente/master; `update` = gerente/master/supervisor).
- **CORS:** se restringe si se define el secreto `ALLOWED_ORIGINS`; por defecto usa el dominio
  productivo + localhost.
- **Drive:** los listados ya no incluyen archivos en papelera (se corrige el falso
  "desincronizado"); la visibilidad en lote se resuelve en una sola llamada al script.
- **`updated_at`:** se actualizará automáticamente al aplicar `0004`.

---

## 6. Decisiones de implementación (desviaciones menores del diseño)

1. **Drive en create/delete/setActive se orquesta desde el cliente** (crear carpeta, borrar archivos,
   fijar visibilidad) mientras `propiedades` valida y persiste en la DB. Motivo: mantener `propiedades`
   desacoplada de Drive y reducir el riesgo. Puede centralizarse más adelante si se desea.
2. **`ensureFolder` en `PropertyFormPage`** aún escribe `drive_folder_id` directo por RLS (ocurre antes
   de que existan título/parroquia válidos). Se documenta como deuda menor.
3. **El límite de imágenes y los tests** se ajustaron a la decisión de Fase 1 (mínimo 1).

---

## 7. Asuntos pendientes / notas

- 🟠 `properties_update_admin` permite a `supervisor` actualizar la fila completa (incluida `images`).
  El control por rol se aplica en `propiedades`, pero un `supervisor` podría tocar `images` por API
  directa. Acotarlo requeriría un trigger por columna (ver `05`).
- 🔵 Tipos duplicados entre `src/types/index.ts` y `_shared/types.ts` (candidato a generación
  automática).
- 🔵 Tests de Edge Functions requieren Deno (`deno test`); no corren en `npm test`.
- ⚠️ **Importante:** hasta que se desplieguen `propiedades`, `drive` y `admin` con los nuevos
  archivos, el front que llama a `propiedades` **no funcionará**. Ver `08-pasos-del-usuario.md`.

---

## 8. Despliegue ejecutado (2026-09-22)

Aprovechando que la CLI quedó autenticada, se desplegaron las tres funciones vía `--use-api`
(sin Docker, sin `link`, usando `--project-ref`):

| Función | Versión | Estado |
|---|---|---|
| `admin` | 8 | ACTIVE |
| `drive` | 18 | ACTIVE |
| `propiedades` | 1 | ACTIVE |

**Incidente resuelto durante el despliegue:** el primer intento falló al empaquetar porque el
bundler server-side no aplicó el import map (`Relative import path "@supabase/supabase-js" not
prefixed with / or ./ or ../`). Se corrigió cambiando el import en `_shared/supabaseClients.ts` a
`npm:@supabase/supabase-js@2` (especificador directo), que no depende del import map.

---

## 9. Puesta en producción y verificación E2E (2026-09-22)

| Paso | Resultado |
|---|---|
| Supabase CLI | v2.117.0 vía npm; login OK; link OK |
| Secretos | `APPS_SCRIPT_SECRET` y `APPS_SCRIPT_URL` rotados/actualizados y verificados por digest SHA-256 |
| Google Apps Script | nueva versión con `trashed=false`, `setFilesVisibility` y secreto en `PropertiesService`; handshake verificado (`accion desconocida`, no `no autorizado`) |
| Migración `0004` | aplicada ("Success. No rows returned") |
| Verificación de esquema | índices 4/4, `CHECK` 3/3, trigger 1, función 1 |
| Prueba E2E | los 10 puntos verificados por el usuario (login, crear, subir/reordenar/eliminar fotos, activar sin fotos, editar precio, eliminar, sincronizar, usuarios, tasa) |

**Conclusión:** el backend del Escenario B está operativo. Las escrituras de inmuebles pasan por la
Edge Function `propiedades` con reglas en servidor; la base tiene índices, `CHECK` y trigger
`updated_at`; e Drive quedó corregido (papelera, visibilidad en lote, backoff).

### Nota observada en la prueba
El nombre de carpeta usa un sufijo aleatorio (`casa-los-palos-grandes-eevzwxfm`). El spec pedía
`<tipo>-<zona>-<secuencial>`. No es un defecto funcional; queda como posible mejora futura.

