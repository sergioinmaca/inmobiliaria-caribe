# 06 — Hoja de ruta e implementación

- **Estado:** Plan aprobado; pendiente de ejecución.
- **Regla de oro:** cada fase se verifica **antes** de pasar a la siguiente.

Etiquetas de responsabilidad:
- **[YO]** lo hace el asistente (crea archivos, SQL, código).
- **[TÚ]** lo hace la persona (dashboard, CLI, Apps Script, decisiones, commits).
- **[AMBOS]** requiere colaboración.

---

## Fase 0 — Auditoría ✅ (completada)

| Quién | Tarea | Estado |
|---|---|---|
| [TÚ] | Ejecutar `sql/introspect.sql` y entregar JSON | ✅ Hecho |
| [YO] | Analizar esquema y comparar con migraciones | ✅ `01-estado-actual.md` |

---

## Fase 1 — Decisiones de negocio ✅ (completada 2026-09-22)

| Tema | Decisión |
|---|---|
| `MIN_IMAGES_TO_ACTIVATE` | **1** imagen |
| Edición de `usd_to_bs_rate` | **solo `master`** |
| Borrado de inmuebles | **físico** (se mantiene `DELETE` + borrado en Drive) |

**Criterio de salida:** ✅ las 3 decisiones están fijadas y reflejadas en `01`, `03`, `04`, `05`.

---

## Fase 2 — Documentación ✅ (completada)

| Quién | Tarea | Entregable |
|---|---|---|
| [YO] | Redactar carpeta `documentacion/` | `00`–`06` + `sql/introspect.sql` |

---

## Fase 3 — Preparación del entorno de Edge Functions ⬜

**Ejecutas tú primero** (instalación y autenticación; ninguna computadora puede hacerlo por ti).

| Orden | Quién | Tarea |
|---|---|---|
| 3.1 | [TÚ] | Instalar **Supabase CLI** (sin Docker). Ver comando abajo. |
| 3.2 | [TÚ] | `supabase login` (abre el navegador). |
| 3.3 | [TÚ] | `supabase link --project-ref <PROJECT_REF>` (el ref está en la URL del dashboard). |
| 3.4 | [YO] | Verificar que `supabase/functions/deno.json` sirve como import map único y documentar el flujo. |

```bash
# Windows (PowerShell / winget o scoop), una vez:
winget install Supabase.CLI
# o: scoop install supabase

supabase login
supabase link --project-ref <PROJECT_REF>
```

**Nota:** sin Docker **no** hay `supabase functions serve` local; la verificación de funciones será
contra el proyecto remoto (invocación real). Es el precio de no usar Docker.

**Criterio de salida:** `supabase projects list` muestra el proyecto y `supabase functions list`
lista `admin` y `drive`.

---

## Fase 4 — Código compartido + refactor de funciones ✅ (código listo; falta desplegar)

| Orden | Quién | Tarea |
|---|---|---|
| 4.1 | [YO] | Crear `supabase/functions/_shared/` (8 módulos, doc `03`). |
| 4.2 | [YO] | Refactorizar `admin/index.ts` y `drive/index.ts` para usar `_shared`. |
| 4.3 | [YO] | Extraer `appsScript.ts` y `mergeImages.ts` de `drive`; crear `tests/`. |
| 4.4 | [TÚ] | Revisar el diff (sin desplegar aún). |
| 4.5 | [AMBOS] | Desplegar: `supabase functions deploy admin --use-api` y `drive --use-api`. |
| 4.6 | [AMBOS] | Probar en el dashboard (botón **Test**) o con la app: login, crear usuario, listar/sincronizar. |

**Criterio de aceptación:** `admin` y `drive` responden igual que antes; el código ya no duplica
CORS/auth/json.

**Rollback:** volver a pegar la versión anterior de cada función en el editor del dashboard.

---

## Fase 5 — Nueva función `propiedades` (Escenario B) ✅ (código listo; falta desplegar)

| Orden | Quién | Tarea |
|---|---|---|
| 5.1 | [YO] | Crear `supabase/functions/propiedades/index.ts` (`create/update/setActive/delete`) con reglas en servidor. |
| 5.2 | [YO] | Crear `src/lib/propertiesApi.ts` (cliente). |
| 5.3 | [YO] | Adaptar `PropertyFormPage.tsx` y `AdminListPage.tsx` para usar la nueva API en escrituras. |
| 5.4 | [TÚ] | Revisar. |
| 5.5 | [AMBOS] | Desplegar `supabase functions deploy propiedades --use-api` y probar el flujo completo. |

**Criterio de aceptación:** activar un inmueble con < mínimo de imágenes falla con mensaje del
servidor; crear/editar/eliminar funcionan igual que hoy.

**Dependencia:** Fase 1 (decisión de `MIN_IMAGES_TO_ACTIVATE`).

---

## Fase 6 — Migración `0004` (endurecimiento de la DB) ✅ (SQL listo; falta ejecutar)

| Orden | Quién | Tarea |
|---|---|---|
| 6.1 | [YO] | Redactar `supabase/migrations/0004_backend_hardening.sql`. |
| 6.2 | [TÚ] | Revisar el SQL. |
| 6.3 | [TÚ] | Ejecutarlo en **Supabase → SQL Editor** (flujo manual vigente). |
| 6.4 | [TÚ] | Correr `sql/introspect.sql` otra vez y pasarme el JSON para confirmar. |

Contenido previsto de `0004`:
- Índices: `(is_active, created_at desc)`, `(tipo)`, `(parroquia)`, `(price_usd)` (parciales donde aplique).
- `CHECK` de no-negatividad en `price_usd` y `price_original`.
- `CHECK` de activación: `is_active = false OR (jsonb_array_length(images) >= N AND titulo <> '' AND parroquia <> '')`.
- Trigger `BEFORE UPDATE` para `updated_at`.
- Ajuste de la política de `settings` según Fase 1.
- (Opcional) renombrar `properties_pkey` → `propiedades_pkey`.

> ⚠️ Los `CHECK` de activación pueden fallar al crearse si ya existen inmuebles activos que no
> cumplen. Se valida antes con una `SELECT` de comprobación (incluida en el SQL).

---

## Fase 7 — Correcciones de Drive ✅ (código listo; falta aplicar en Google)

| Orden | Quién | Tarea |
|---|---|---|
| 7.1 | [YO] | Actualizar `supabase/functions/drive/apps-script.gs` (trashed=false, visibilidad en lote, secreto en `PropertiesService`, dedupe indexado). |
| 7.2 | [TÚ] | Pegar el `.gs` actualizado en `script.google.com` y configurar el secreto como *Script Property*. |
| 7.3 | [YO] | Aplicar concurrencia + caché en `PropertyImagesSection.tsx`. |
| 7.4 | [YO] | Backoff con jitter y `setVisibilityFolder` en `drive/index.ts`. |
| 7.5 | [TÚ] | Actualizar `APPS_SCRIPT_SECRET` en Supabase → Edge Functions → Secrets. |
| 7.6 | [AMBOS] | Probar subida, borrado, desincronización y activar/desactivar. |

**Criterio de aceptación:** tras eliminar una foto, no queda "desincronizado" fantasma; subir 8
fotos tarda notablemente menos; activar hace **una** llamada al script.

---

## Fase 8 — Verificación final ⚠️ (local OK; falta prueba E2E en remoto)

| Quién | Tarea |
|---|---|
| [YO] | `npm run lint`, `npm run build`, `npm test`. |
| [TÚ] | Prueba de extremo a extremo en el entorno real. |
| [AMBOS] | Confirmar criterios de aceptación de cada fase. |

---

## Fase 9 — Catálogo enriquecido ✅ (desplegado; falta `0006`)

Fecha: 2026-09-23. Detalle en [`09-catalogo-enriquecido.md`](./09-catalogo-enriquecido.md).

| Orden | Quién | Tarea | Estado |
|---|---|---|---|
| 9.1 | [YO] | Migración `0005_catalogo_enriquecido.sql` (tipos, territorio, métricas) | ✅ |
| 9.2 | [YO] | Edge Function `catalogos` + extensión de `propiedades` | ✅ |
| 9.3 | [YO] | Frontend: hooks, formulario, filtros, detalle, modal de tipos | ✅ |
| 9.4 | [TÚ] | Ejecutar `0005` en SQL Editor | ✅ |
| 9.5 | [YO/TÚ] | Desplegar `catalogos` y `propiedades` (`--use-api`) | ✅ v1 / v4 |
| 9.6 | [YO/TÚ] | Desplegar frontend (Firebase Hosting) | ✅ |
| 9.7 | [AMBOS] | Prueba E2E | ✅ |
| 9.8 | [TÚ] | Ejecutar `0006_drop_property_type_enum.sql` | ✅ |
| 9.9 | [YO] | Retirar fallback de transición por `tipo` + redeploy de `propiedades` | ✅ |

**Criterio de salida:** tipos administrables desde el modal `+`, territorio en cascada,
métricas visibles en catálogo/detalle y `tipo`/`property_type` eliminados de la DB.

---

## Resumen de orden de ejecución

```
Fase 1 (TÚ decide) ──▶ Fase 3 (TÚ instala/enlaza CLI)
        │                        │
        ▼                        ▼
Fase 4 (YO código) ──▶ Fase 5 (YO código) ──▶ Fase 6 (YO SQL / TÚ ejecuta)
        │                                            │
        └──────────────▶ Fase 7 (YO Apps Script / TÚ despliega) ──▶ Fase 8 (ambos)
```

**Bloqueante inmediato:** Fase 1. Sin esas tres decisiones no se puede escribir la validación de
servidor ni la migración `0004`.

---

## Notas de proceso

- **Commits:** no se hará `git commit`/`push` salvo que lo pidas explícitamente. Rama actual: `fixweb`.
- **Migraciones:** siempre manuales en el dashboard (decisión vigente); `0004` es incremental.
- **Nunca** subir secretos a git; `APPS_SCRIPT_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` viven en el
  dashboard / Apps Script.
