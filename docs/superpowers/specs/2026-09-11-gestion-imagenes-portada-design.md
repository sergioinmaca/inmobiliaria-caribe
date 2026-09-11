# Diseño — Gestión de imágenes y portada en el admin

- Fecha: 2026-09-11
- Estado: Para revisión

## 1. Resumen y alcance

Extiende el panel administrativo para que las fotos de un inmueble se gestionen **desde el formulario de crear/editar**, sin salir a Google Drive. Además permite **elegir la portada del catálogo** reordenando las fotos (la primera posición es la portada).

**Incluye:**

- Subida de fotos desde el formulario (múltiples, secuencial) hacia la carpeta de Drive del inmueble.
- Reordenar las fotos con botones **subir/bajar**.
- Eliminar fotos (borra el archivo de Drive y la entrada en Supabase).
- Portada = primera foto del orden; se refleja en la card del catálogo y en el arranque de la galería.
- Sincronización con Drive que **preserva el orden** elegido por el usuario.

**Excluye:**

- Subida arrastrando y soltando (drag-and-drop): se usa subir/bajar.
- Reordenar dentro del catálogo público (es de solo lectura).
- Edición de metadatos de la imagen (nombre, pie de foto).

## 2. Arquitectura

Mantiene la arquitectura actual: **Google Drive guarda los archivos, Supabase guarda solo URLs**. La subida viaja así:

```
Navegador → (redimensiona la imagen en cliente) → Edge Function `drive` → Google Apps Script → Drive
```

- El frontend redimensiona cada imagen (canvas, máx 1600px, JPEG ~0.85) antes de subir, para respetar el límite de tamaño del cuerpo de la Edge Function/Apps Script y ahorrar espacio.
- La Edge Function `drive` valida JWT + rol (`gerente`/`master`) igual que hoy.
- El Apps Script recibe base64, lo decodifica con `Utilities.base64Decode`, crea el archivo con `folder.createFile(blob)` y fija la visibilidad según `is_active`.

## 3. Modelo de datos (sin migración)

No se requiere migración. `properties.images` sigue siendo `jsonb` con elementos `{id, url, name, order}`.

**Semántica del campo `order`:**

- Es la fuente de verdad del orden de visualización.
- `images[]` se guarda **siempre ordenado por `order`**.
- **La primera imagen (`images[0]`) es la portada** del catálogo.
- `order` es un entero secuencial a partir de 0, sin huecos tras cada operación.

Reglas del orden:

- Subir: la nueva foto se anexa al final (`order = max + 1`).
- Subir/bajar: intercambia `order` entre dos fotos contiguas.
- Eliminar: quita la foto y renumera el resto (0..n-1).

## 4. Roles

Sin cambios respecto al spec del MVP. Gestión de imágenes (subir, reordenar, eliminar, sincronizar) solo para **Gerente y Master**. Supervisor ve la lista de imágenes en solo-lectura.

## 5. Integración Google Drive

### 5.1 Acciones nuevas del Apps Script

Se agregan dos acciones al switch de `doPost`:

- **`upload`** `{ folderId, name, mimeType, data (base64), isActive }`:
  1. `Utilities.base64Decode(data)` → `Utilities.newBlob(bytes, mimeType, name)`.
  2. `DriveApp.getFolderById(folderId).createFile(blob)`.
  3. Fija el compartir del archivo según `isActive` (`ANYONE_WITH_LINK` si activo, `PRIVATE` si no).
  4. Devuelve `{ id, name, url }` con `url = 'https://lh3.googleusercontent.com/d/' + id`.
- **`delete`** `{ folderId, fileId }`:
  1. `DriveApp.getFileById(fileId)` (valida que pertenezca a la carpeta) → `setTrashed(true)`.
  2. Devuelve `{ ok: true }`.

### 5.2 Acciones nuevas de la Edge Function `drive`

- **`upload`** `{ folderId, name, mimeType, data, isActive }`: valida rol, reenvía al Apps Script y devuelve `{ id, name, url }`.
- **`delete`** `{ folderId, fileId }`: valida rol, reenvía al Apps Script y devuelve `{ ok: true }`.

### 5.3 Sincronización que preserva el orden (cambio)

Hoy `sync` **sobrescribe** `images[]` con el orden del listado de Drive (arbitrario), lo que destruiría el reordenamiento del usuario. Se cambia la Edge Function para que **fusione**:

1. Lee el `images` actual de `properties`.
2. Pide `list` a Drive (id + name) y aplica visibilidad (como hoy).
3. Construye el nuevo array:
   - Foto ya conocida (misma `id`) → conserva su `order` y actualiza `name`/`url`.
   - Foto nueva → `order = max + 1` (se anexa al final).
   - Foto que ya no está en Drive → se descarta.
4. Ordena por `order` y guarda.

### 5.4 Flujo de creación

En modo creación aún no existe la carpeta de Drive. Cambio:

1. La primera subida dispara la acción `createFolder` existente y guarda el `folderId` en estado local del formulario.
2. Las siguientes subidas usan ese `folderId`.
3. Al guardar el formulario, se inserta el inmueble con `drive_folder_id` (el ya creado) e `images[]` (el orden actual).
4. Si el usuario guarda sin subir fotos, se mantiene el comportamiento actual (crea la carpeta en el submit).

## 6. Formulario crear/editar (`/admin/inmueble/:id?`)

Reemplaza `ImageSyncSection` por `PropertyImagesSection`, visible en **crear y editar** (mutaciones solo Gerente/Master):

- Lista de miniaturas con el orden actual (portada marcada con una insignia "Portada" en la primera).
- Por foto: botón **subir**, botón **bajar** (deshabilitados en los extremos) y botón **eliminar**.
- Selector de archivos (`<input type="file" multiple accept="image/*">`) + botón "Agregar fotos".
- Progreso por foto durante la subida (estado "Subiendo…" por archivo).
- Aviso de desincronización + botón "Sincronizar imágenes" (como hoy), que ahora **preserva el orden**.

Cada mutación persiste `images[]` en Supabase de inmediato (no espera al submit del formulario).

## 7. Componentes públicos

- `PropertyCard` y `PropertyGallery` ordenan por `order` antes de renderizar (helper compartido `sortImages`). Así la portada es la primera foto en la card y en el arranque de la galería.
- Sin imágenes → placeholder existente.

## 8. Manejo de errores

- Subida por archivo: si una foto falla (red, tamaño, Drive), se muestra el error de esa foto y las demás siguen.
- `createFolder` falla al subir en creación → mensaje claro y reintento en la siguiente subida.
- Redimensionado: si el `FileReader`/canvas falla, se sube el archivo original como respaldo.
- Eliminar: si falla el borrado en Drive, se avisa y no se quita de la lista.

## 9. Testing

- Unitarios (vitest) en `src/lib/images.ts`: `sortImages`, `moveImage` (subir/bajar en extremos y en medio), re-numerado tras eliminar, `coverImage`.
- Componentes: `PropertyImagesSection` (subir llama a `uploadDriveFile`, reordenar actualiza el orden, eliminar llama a `deleteDriveFile`, portada = primera), actualizar `PropertyCard.test` si cambia el consumo de imágenes.
- La fusión del sync (Edge Function) se extrae a un helper puro `mergeImages(existing, incoming)` para poder testearla.
