# 08 — Pasos que dependen de ti (despliegue)

- **Objetivo:** poner en producción los cambios de las Fases 4–7.
- **Orden obligatorio:** respeta la secuencia. El front ya llama a `propiedades`; hasta completar el
  paso **B** esa llamada fallará.
- Marca cada casilla al completarla.

## Estado actual (2026-09-22)

| Paso | Estado |
|---|---|
| A · Instalar CLI | ✅ hecho (v2.117.0 vía npm) |
| A · Login | ✅ hecho (por ti) |
| A · Link | ⏭️ omitido (no es necesario; se usa `--project-ref`) |
| B · Desplegar funciones | ✅ hecho (admin v8, drive v18, propiedades v1) |
| C · Secretos | ✅ ya existían (`APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`, Supabase) — `ALLOWED_ORIGINS` opcional |
| D · Apps Script | ✅ hecho y verificado (secreto OK, nueva versión; `APPS_SCRIPT_URL` actualizada) |
| E · Migración `0004` | ✅ aplicada ("Success. No rows returned") |
| F · Verificar esquema | ✅ verificado (índices 4/4, checks 3/3, trigger 1, función 1) |
| G · Prueba E2E | ✅ todos los puntos verificados |

> **Despliegue completado el 2026-09-22.** El backend del Escenario B está en producción.

---

## A. Instalar y enlazar la Supabase CLI (una sola vez)

`winget` **no** distribuye la CLI (`Supabase.CLI` no existe allí). La CLI está declarada como
devDependency en `package.json`, así que se instala con npm (no requiere Docker).

- [x] **CLI instalada** (2026-09-22) con `npm.cmd install`. Verificado: `supabase --version` → `2.117.0`.
      Queda en `node_modules/` y se usa con `npm.cmd exec supabase -- <comando>`.

Falta **enlazar** el proyecto. El login abre el navegador, por lo que **debes ejecutarlo tú**:

```powershell
npm.cmd exec supabase -- login
```

> **El `link` no es necesario** para desplegar: se pasa `--project-ref` en cada comando.
> (El `link` no persistió en `.temp/project-ref`, pero es irrelevante para este flujo.)

Verificación:
```powershell
npm.cmd exec supabase -- functions list --project-ref kkiikthczuaevobddkja
```
- [x] Login completado y `--project-ref` funcionando.

> En PowerShell, usa siempre `npm.cmd exec supabase -- <comando>` (el `npx` de PowerShell está
> bloqueado por la directiva de ejecución de scripts). Alternativa directa:
> `.\node_modules\.bin\supabase.cmd <comando>`.
> No necesitas Docker: desplegamos con `--use-api`.

---

## B. Desplegar las tres Edge Functions ✅ (hecho 2026-09-22)

```powershell
npm.cmd exec supabase -- functions deploy admin --project-ref kkiikthczuaevobddkja --use-api
npm.cmd exec supabase -- functions deploy drive --project-ref kkiikthczuaevobddkja --use-api
npm.cmd exec supabase -- functions deploy propiedades --project-ref kkiikthczuaevobddkja --use-api
```

Resultado: `admin` v8, `drive` v18, `propiedades` v1 — todas ACTIVE.

- [x] `admin` desplegada.
- [x] `drive` desplegada.
- [x] `propiedades` desplegada.

> Nota: el código compartido importa `npm:@supabase/supabase-js@2` con especificador `npm:` directo
> (no depende del import map, que el bundler server-side no aplicaba).

---

## C. Secretos de las Edge Functions

Dashboard → **Edge Functions → Secrets** (o `supabase secrets set`). Confirma/crea:

| Secreto | Valor | Obligatorio |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | automáticos | sí |
| `APPS_SCRIPT_URL` | URL del Web App de Apps Script | sí |
| `APPS_SCRIPT_SECRET` | mismo valor que `SCRIPT_SECRET` | sí |
| `ALLOWED_ORIGINS` | `https://inmobiliaria-caribe.com,http://localhost:5173` | opcional* |

\* Si no se define, CORS usa por defecto el dominio productivo + localhost.

- [x] Secretos confirmados.

---

## D. Actualizar el Google Apps Script ✅ (hecho y verificado)

1. Abre tu proyecto en https://script.google.com
2. Reemplaza **todo** el contenido por el nuevo archivo:
   `supabase/functions/drive/apps-script.gs`
3. Configura el secreto como propiedad:
   - Proyecto → **Configuración del proyecto** → **Propiedades de la secuencia de comandos**
   - Añade: `SCRIPT_SECRET` = *(el mismo valor de `APPS_SCRIPT_SECRET`)*
4. Guarda (Ctrl+S).
5. Implementa una nueva versión (se usó **Nueva implementación** para evitar el desplegable gris;
   la URL `/exec` resultante se registró en `APPS_SCRIPT_URL`).
6. Se actualizó `APPS_SCRIPT_URL` en Supabase y se verificó por digest (SHA-256).

- [x] `.gs` actualizado y nueva versión implementada.
- [x] Propiedad `SCRIPT_SECRET` configurada.
- [x] `APPS_SCRIPT_URL` sincronizada.

> **Verificación realizada:** un POST de prueba al Web App devolvió `{"error":"accion desconocida"}`
> (y no `no autorizado`), lo que confirma que el secreto compartido coincide.

---

## E. Aplicar la migración `0004`

1. Dashboard → **SQL Editor** → New query.
2. Pega el contenido de `supabase/migrations/0004_backend_hardening.sql`.
3. Ejecuta.

> Si aparece el error "Hay N inmueble(s) activo(s) que no cumplen la regla…", desactiva esos
> inmuebles (o agrégales 1 imagen) y vuelve a ejecutar. El propio script te dice cuántos son.

- [ ] Migración aplicada sin errores.

---

## F. Verificar el esquema ✅

Verificación ejecutada (consulta puntual): `indexes_ok = 4`, `checks_ok = 3`, `trigger_ok = 1`,
`fn_ok = 1`. También se confirmó por API que la propiedad de prueba tiene `drive_folder_id` y su
imagen responde `200 image/jpeg`.

- [x] Esquema verificado.

---

## G. Prueba de extremo a extremo ✅

Con sesión de `master` o `gerente`, todos los puntos verificados:

- [x] **Login** funciona.
- [x] **Crear inmueble** (crea carpeta de Drive y guarda).
- [x] **Subir fotos** (contador "Subiendo X de Y" avanza).
- [x] **Reordenar** (portada = primera) y **eliminar** una foto.
- [x] **Activar/Desactivar**: activar sin fotos → mensaje del servidor.
- [x] **Editar** título, precio (USD y Bs) y `price_usd` calculado.
- [x] **Eliminar** inmueble (borra fila y fotos de Drive).
- [x] **Sincronizar imágenes**: ya no queda "desincronizado" fantasma tras borrar.
- [x] **Usuarios** (solo master): crear usuario `@inmaca.com`.
- [x] **Tasa**: visible solo para master.

---

## H. Si algo falla (rollback rápido)

- **Función:** en el dashboard, abre la función → editor → pega la versión anterior → Deploy.
  (El código previo está en el historial de git: commit actual `fixweb`.)
- **Migración:** los `CHECK` e índices se pueden retirar:
  ```sql
  alter table public.propiedades drop constraint if exists propiedades_active_requires_data;
  alter table public.propiedades drop constraint if exists propiedades_price_usd_nonneg;
  alter table public.propiedades drop constraint if exists propiedades_price_original_nonneg;
  drop trigger if exists propiedades_set_updated_at on public.propiedades;
  drop index if exists public.propiedades_active_created_idx;
  drop index if exists public.propiedades_tipo_idx;
  drop index if exists public.propiedades_parroquia_idx;
  drop index if exists public.propiedades_price_usd_idx;
  ```
- **Apps Script:** Implementar → Gestionar implementaciones → restaurar versión anterior.

---

## Notas

- No se ha hecho `git commit`. Si quieres, puedo preparar el commit cuando lo pidas.
- Recordatorio: sin el paso **B**, la app fallará al guardar inmuebles (apunta a la función
  `propiedades`, aún no desplegada).
