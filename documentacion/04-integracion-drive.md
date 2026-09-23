# 04 — Integración con Google Drive + Apps Script

- **Estado:** Diagnóstico y plan de correcciones aprobado (implementación pendiente)
- **Decisión:** se mantiene Google Drive + Apps Script como almacén de imágenes.

---

## 1. Cómo funciona hoy

```
Admin (navegador)
  │  resizeImage(file, 1600px, q0.85)     → src/lib/imageResize.ts
  ▼
src/lib/drive.ts  ──functions.invoke('drive')──▶  Edge Function `drive`
  │                                                   │
  │                                                   ▼
  │                                        Google Apps Script (Web App)
  │                                                   │
  │                                                   ▼
  │                                        Google Drive (carpeta del inmueble)
  ▼
Supabase guarda SOLO URLs en `propiedades.images` (jsonb)
```

- La carpeta raíz `catalogo_inmuebles/` contiene una subcarpeta por inmueble.
- `propiedades.images` es un arreglo `[{id, url, name, order}]`; el **orden 0 es la portada**.
- URLs usadas: `https://lh3.googleusercontent.com/d/<fileId>`.

---

## 2. ¿Soportan las correcciones 20–30 inmuebles con 10 imágenes cada uno?

**Sí, con holgura.** Los números:

| Métrica | Cálculo | Resultado | Límite | Margen |
|---|---|---|---|---|
| Archivos totales | 30 inmuebles × 10 fotos | **300** | — | — |
| Archivos por carpeta | 10 | **10** | el Apps Script itera por carpeta | amplio |
| Peso total (post-resize ~0.6 MB) | 300 × 0.6 MB | **~180 MB** | 15 GB (Google) | <2% |
| Llamadas Apps Script por sesión | 10 upload + 1 list + 1 sync | **~12** | 20.000/día | enorme |
| Llamadas en 50 sesiones/día | 50 × 12 | **600/día** | 20.000/día | 33× |

Puntos clave:
- **Lo que importa no es el total (300), sino los archivos por carpeta (~10).** Las operaciones del
  Apps Script son por carpeta, no globales.
- La **cuota diaria de Apps Script** (20.000 URL-fetch/día) está a órdenes de magnitud del uso real.
- El **almacenamiento** (15 GB en cuenta Google estándar) es excesivo para este volumen.

### ¿Es sólido a mediano–largo plazo?

**A esta escala (20–30 inmuebles): sí, es sólido.** Las correcciones de la sección 3 eliminan los
problemas reales (falsos "desincronizado", llamadas redundantes, subidas lentas).

**Riesgos estructurales** que las correcciones **no** eliminan (no son de volumen, son de
arquitectura):

1. 🟠 Dependencia de una **cuenta Google personal**: si se apaga/cambia/suspende, se pierde el acceso.
2. 🟠 Uso de un dominio **no oficial** (`lh3.googleusercontent.com/d/`) que Google podría restringir.
3. 🟡 **Sin tiempo real**: la sincronización es bajo demanda (por diseño, correcto).
4. 🟡 El Apps Script **no permite webhooks** sin Google Cloud; no se puede detectar cambios al instante.

**Conclusión:** para 20–30 inmuebles, mantener Drive es una decisión **válida y sostenible**. Si el
proyecto creciera a cientos de inmuebles o a varios operadores simultáneos, la opción robusta sería
**Supabase Storage** (bucket + RLS + URLs firmadas). Se recomienda **abstraer la capa de storage**
(una interfaz `StorageProvider`) para que esa migración futura no toque la UI. *(Decisión futura.)*

### ¿Se reduce el tiempo de carga respecto a hoy?

Depende de **qué** carga:

| Operación | ¿Toca Drive? | Hoy | Con correcciones |
|---|---|---|---|
| Catálogo público / detalle | **No** (usa URLs de Supabase) | Ya es rápido (CDN de Google) | **Igual** |
| Abrir inmueble en admin | Sí (1 `list`) | 1–3 s cada vez | **Casi instantáneo** (caché TTL) |
| Subir 8 fotos | Sí (8 llamadas secuenciales) | 8–24 s | **~3× más rápido** (concurrencia) |
| Activar/desactivar | Sí (1 llamada por foto) | N llamadas | **1 llamada** (lote) |

> Aclaración didáctica: el **catálogo público no era el problema** y no mejora con estas
> correcciones; ya se sirve por CDN de Google. Lo que mejora es la **experiencia del admin**.

---

## 3. Correcciones propuestas (una por una)

### 3.1 Subida secuencial → concurrencia limitada

- **Qué pasa:** `src/features/admin/PropertyImagesSection.tsx:74` usa un `for` con `await`; una foto
  por vez.
- **Por qué importa:** N fotos = N viajes encadenados (Apps Script es lento, ~1–3 s c/u).
- **Corrección:**
```ts
async function mapLimit<T>(items: T[], limit: number, fn: (x: T) => Promise<unknown>) {
  const pool = new Set<Promise<unknown>>()
  for (const item of items) {
    const p = fn(item).finally(() => pool.delete(p))
    pool.add(p)
    if (pool.size >= limit) await Promise.race(pool)
  }
  await Promise.all(pool)
}
await mapLimit(fileList, 3, uploadOne)
```

### 3.2 `getFiles()` incluye archivos en la papelera 🔴

- **Qué pasa:** `supabase/functions/drive/apps-script.gs:137-144` usa `folder.getFiles()`, que
  **también devuelve archivos en papelera**.
- **Por qué importa:** al eliminar una foto (va a papelera), `list` la sigue contando → **falso
  "desincronizado" permanente**. Es un **bug de corrección**, no solo de eficiencia.
- **Corrección:**
```js
function getFiles(folderId) {
  const files = []
  const it = DriveApp.getFolderById(folderId).searchFiles('trashed = false')
  while (it.hasNext()) { const f = it.next(); files.push({ id: f.getId(), name: f.getName() }) }
  return files
}
```

### 3.3 Chequeo de desincronización en cada render → caché con TTL

- **Qué pasa:** `PropertyImagesSection.tsx:42-56` llama a `list` en un `useEffect` que depende de
  `images`; cada cambio dispara una llamada.
- **Por qué importa:** multiplica llamadas y hace lenta la UI.
- **Corrección:** chequear al abrir y cachear por carpeta, invalidando solo tras subir/eliminar/sync.
```ts
const cache = new Map<string, { at: number; ids: Set<string> }>()
const TTL = 60_000 // 1 min
```

### 3.4 Base64 y límites de payload

- **Qué pasa:** la imagen viaja como base64 (≈ +33%) en el cuerpo JSON Edge → Apps Script.
- **Por qué importa:** hay límites de tamaño de payload y de tiempo de ejecución.
- **Corrección:** mantener el redimensionado cliente (`imageResize.ts`, 1600px/q0.85) y **bajar el
  tope** a 1280px/q0.8 si aparecen fallos. Documentar el límite vigente.

### 3.5 Deduplicación por `description` (escaneo lineal)

- **Qué pasa:** `apps-script.gs:186-199` busca el `uploadKey` recorriendo **todos** los archivos.
- **Por qué importa:** O(n) por subida.
- **Corrección:** incluir el `uploadKey` en el **nombre** y usar
  `searchFiles('title contains "..." and trashed = false')` (usa el índice de Drive), o guardar el
  mapa `uploadKey → fileId` en `PropertiesService`.

### 3.6 Reintentos con espera fija → backoff exponencial + jitter

- **Qué pasa:** `supabase/functions/drive/index.ts:89` reintenta con espera **lineal** de 400 ms.
- **Por qué importa:** ante 429/500 por picos, la espera lineal no ayuda.
- **Corrección:**
```ts
const wait = Math.min(2 ** attempt * 300, 5000) + Math.random() * 250
await new Promise((r) => setTimeout(r, wait))
```

### 3.7 `setVisibility` archivo por archivo → una sola ejecución

- **Qué pasa:** `supabase/functions/drive/index.ts:226-232` hace una llamada al Apps Script **por
  imagen**.
- **Por qué importa:** activar con 10 fotos = 10 viajes lentos.
- **Corrección:** una acción `setVisibilityFolder` que recorra la carpeta en **una** ejecución
  (reutilizar `applyVisibility`, `apps-script.gs:150-157`).

### 3.8 Secreto estático y CORS abierto 🔴

- **Qué pasa:** `SCRIPT_SECRET` está **hardcodeado** (`apps-script.gs:17`); las funciones usan
  `Access-Control-Allow-Origin: *`.
- **Por qué importa:** si el código se comparte, el secreto se filtra; CORS `*` permite invocar las
  funciones desde cualquier sitio.
- **Corrección:** leer el secreto desde `PropertiesService.getScriptProperties()`; restringir CORS al
  dominio real (`https://inmobiliaria-caribe.com`) y a `http://localhost:5173` en desarrollo (cambio
  centralizado en `_shared/cors.ts`).

### 3.9 Sin paginación / sin orden explícito

- **Qué pasa:** la iteración de `DriveApp` es lenta y sin control de página.
- **Por qué importa:** con carpetas grandes se alarga la sincronización.
- **Corrección:** `searchFiles` con `orderBy`; si algún día crece, **Advanced Drive Service** con
  `pageToken`. Para 10 fotos por carpeta **no es urgente**.

---

## 4. Priorización de correcciones

| Prioridad | Corrección | Tipo |
|---|---|---|
| 🔴 1 | 3.2 `trashed = false` | Bug de corrección |
| 🔴 2 | 3.8 Secreto + CORS | Seguridad |
| 🟠 3 | 3.1 Concurrencia | Rendimiento |
| 🟠 4 | 3.3 Caché de desync | Rendimiento |
| 🟠 5 | 3.7 Visibilidad en lote | Rendimiento |
| 🟡 6 | 3.6 Backoff con jitter | Robustez |
| 🟡 7 | 3.5 Dedupe indexado | Eficiencia |
| 🔵 8 | 3.4 Tope de resize | Robustez |
| 🔵 9 | 3.9 Paginación | Escalabilidad |

---

## 5. Recomendación de encuadre

Aplicar **primero** las correcciones 🔴 y 🟠 (bug, seguridad y rendimiento percibido) y dejar 🔵
para cuando el volumen lo justifique. Con eso, el sistema es **sólido y sostenible** para 20–30
inmuebles con 10 fotos, y queda preparado para una eventual migración a Supabase Storage mediante
una capa de abstracción.
