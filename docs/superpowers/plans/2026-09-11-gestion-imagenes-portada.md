# Gestión de imágenes y portada en el admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir subir, reordenar y eliminar las fotos de un inmueble desde el formulario de crear/editar, y que la primera foto del orden sea la portada del catálogo.

**Architecture:** Las fotos se suben del navegador (redimensionadas en cliente) a Google Drive vía Edge Function `drive` → Google Apps Script. Supabase sigue guardando solo URLs en `properties.images[]` (jsonb), ordenadas por `order`; la primera posición es la portada. La sincronización con Drive ahora fusiona y preserva el orden elegido por el usuario.

**Tech Stack:** React 19 + TypeScript + Vite + TailwindCSS, Supabase (Edge Functions + Postgres), Google Apps Script, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-11-gestion-imagenes-portada-design.md`

## Global Constraints

- Mobile-First: clases Tailwind arrancan sin prefijo y escalan con `sm:`/`md:`/`lg:`.
- Nada de colores hex hardcodeados: usar tokens (`text-primary`, `text-neutral-900`, `bg-surface`, `text-danger`, `text-success`, etc.).
- Idioma del código: inglés. Idioma de la UI: español (Venezuela).
- TypeScript estricto; `verbatimModuleSyntax` (usar `import type` para tipos). `noUnusedLocals`/`noUnusedParameters` activos.
- No agregar dependencias nuevas.
- `npm run lint` (oxlint) y `npm run test` (vitest run) deben pasar; `npm run build` (tsc -b && vite build) debe compilar.
- Comandos de test: `npx vitest run <archivo>` para un archivo, `npx vitest run` para todos.
- El `SCRIPT_SECRET` real NO se versiona: `supabase/functions/drive/apps-script.gs` mantiene el placeholder `CAMBIA_ESTE_SECRETO`.

---

### Task 1: Helpers puros de imágenes (`src/lib/images.ts`)

**Files:**
- Create: `src/lib/images.ts`
- Test: `src/lib/images.test.ts`

**Interfaces:**
- Consumes: `PropertyImage` de `src/types/index.ts` (`{ id: string; url: string; name: string; order: number }`).
- Produces:
  - `sortImages(images: PropertyImage[]): PropertyImage[]`
  - `renumberImages(images: PropertyImage[]): PropertyImage[]`
  - `moveImage(images: PropertyImage[], index: number, direction: -1 | 1): PropertyImage[]`
  - `removeImage(images: PropertyImage[], index: number): PropertyImage[]`
  - `coverImage(images: PropertyImage[]): PropertyImage | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/images.test.ts
import { describe, expect, it } from 'vitest'
import { coverImage, moveImage, removeImage, renumberImages, sortImages } from './images'
import type { PropertyImage } from '../types'

const img = (id: string, order: number): PropertyImage => ({ id, url: `u/${id}`, name: `${id}.jpg`, order })

describe('sortImages', () => {
  it('ordena por order', () => {
    expect(sortImages([img('b', 1), img('a', 0)])).toEqual([img('a', 0), img('b', 1)])
  })
})

describe('renumberImages', () => {
  it('renumera secuencialmente desde 0', () => {
    expect(renumberImages([img('a', 5), img('b', 9)])).toEqual([img('a', 0), img('b', 1)])
  })
})

describe('moveImage', () => {
  it('mueve hacia abajo (direction 1)', () => {
    expect(moveImage([img('a', 0), img('b', 1)], 0, 1)).toEqual([img('b', 0), img('a', 1)])
  })

  it('mueve hacia arriba (direction -1)', () => {
    expect(moveImage([img('a', 0), img('b', 1)], 1, -1)).toEqual([img('b', 0), img('a', 1)])
  })

  it('no mueve si ya está en el extremo', () => {
    expect(moveImage([img('a', 0), img('b', 1)], 0, -1)).toEqual([img('a', 0), img('b', 1)])
    expect(moveImage([img('a', 0), img('b', 1)], 1, 1)).toEqual([img('a', 0), img('b', 1)])
  })
})

describe('removeImage', () => {
  it('quita la foto y renumera', () => {
    expect(removeImage([img('a', 0), img('b', 1), img('c', 2)], 1)).toEqual([img('a', 0), img('c', 1)])
  })
})

describe('coverImage', () => {
  it('devuelve la primera por order', () => {
    expect(coverImage([img('b', 1), img('a', 0)])).toEqual(img('a', 0))
  })

  it('devuelve undefined si no hay imágenes', () => {
    expect(coverImage([])).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/images.test.ts`
Expected: FAIL — cannot find module `./images`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/images.ts
import type { PropertyImage } from '../types'

export function sortImages(images: PropertyImage[]): PropertyImage[] {
  return [...images].sort((a, b) => a.order - b.order)
}

export function renumberImages(images: PropertyImage[]): PropertyImage[] {
  return images.map((img, i) => ({ ...img, order: i }))
}

export function moveImage(
  images: PropertyImage[],
  index: number,
  direction: -1 | 1,
): PropertyImage[] {
  const sorted = sortImages(images)
  const target = index + direction
  if (target < 0 || target >= sorted.length) return sorted
  const next = [...sorted]
  ;[next[index], next[target]] = [next[target], next[index]]
  return renumberImages(next)
}

export function removeImage(images: PropertyImage[], index: number): PropertyImage[] {
  const sorted = sortImages(images)
  const next = sorted.filter((_, i) => i !== index)
  return renumberImages(next)
}

export function coverImage(images: PropertyImage[]): PropertyImage | undefined {
  return sortImages(images)[0]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/images.test.ts`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/images.ts src/lib/images.test.ts
git commit -m "feat: helpers puros para ordenar, reordenar y portada de imágenes"
```

---

### Task 2: Redimensionado en cliente (`src/lib/imageResize.ts`)

**Files:**
- Create: `src/lib/imageResize.ts`
- Test: `src/lib/imageResize.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `toJpegName(name: string): string`
  - `resizeImage(file: File, maxSide?: number, quality?: number): Promise<{ base64: string; mimeType: string; name: string }>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/imageResize.test.ts
import { describe, expect, it } from 'vitest'
import { toJpegName } from './imageResize'

describe('toJpegName', () => {
  it('cambia la extensión a .jpg', () => {
    expect(toJpegName('foto.png')).toBe('foto.jpg')
    expect(toJpegName('foto')).toBe('foto.jpg')
    expect(toJpegName('a.b.c.webp')).toBe('a.b.c.jpg')
  })
})
```

> `resizeImage` depende del `<canvas>` (no disponible en jsdom), por eso no se testea en unit; se cubre de forma manual/integración.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/imageResize.test.ts`
Expected: FAIL — cannot find module `./imageResize`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/imageResize.ts
export interface ResizedImage {
  base64: string
  mimeType: string
  name: string
}

export function toJpegName(name: string): string {
  return `${name.replace(/\.[^.]+$/, '')}.jpg`
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}

export async function resizeImage(file: File, maxSide = 1600, quality = 0.85): Promise<ResizedImage> {
  const dataUrl = await readAsDataUrl(file)
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { base64: dataUrl.split(',')[1] ?? '', mimeType: file.type || 'image/jpeg', name: file.name }
  }
  ctx.drawImage(img, 0, 0, width, height)
  const out = canvas.toDataURL('image/jpeg', quality)
  return { base64: out.split(',')[1] ?? '', mimeType: 'image/jpeg', name: toJpegName(file.name) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/imageResize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageResize.ts src/lib/imageResize.test.ts
git commit -m "feat: redimensionado de imágenes en cliente antes de subir"
```

---

### Task 3: Acciones nuevas en `src/lib/drive.ts`

**Files:**
- Modify: `src/lib/drive.ts`

**Interfaces:**
- Consumes: `supabase` de `./supabase`.
- Produces (usadas por Task 7 y Task 8):
  - `createDriveFolder(name: string): Promise<string | null>`
  - `uploadDriveFile(params: { folderId: string; name: string; mimeType: string; data: string; isActive: boolean }): Promise<{ id: string; name: string; url: string } | null>`
  - `deleteDriveFile(folderId: string, fileId: string): Promise<boolean>`

- [ ] **Step 1: Add the functions**

Append to `src/lib/drive.ts` (after the existing functions):

```ts
export interface UploadedDriveFile {
  id: string
  name: string
  url: string
}

export async function createDriveFolder(name: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('drive', {
    body: { action: 'createFolder', name },
  })
  if (error || !data?.folderId) return null
  return data.folderId as string
}

export async function uploadDriveFile(params: {
  folderId: string
  name: string
  mimeType: string
  data: string
  isActive: boolean
}): Promise<UploadedDriveFile | null> {
  const { data, error } = await supabase.functions.invoke('drive', {
    body: { action: 'upload', ...params },
  })
  if (error || !data?.id) return null
  return data as UploadedDriveFile
}

export async function deleteDriveFile(folderId: string, fileId: string): Promise<boolean> {
  const { error } = await supabase.functions.invoke('drive', {
    body: { action: 'delete', folderId, fileId },
  })
  return !error
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors (the new functions are type-safe against the supabase client).

- [ ] **Step 3: Commit**

```bash
git add src/lib/drive.ts
git commit -m "feat: acciones createFolder/upload/delete del cliente Drive"
```

---

### Task 4: Helper de fusión para el sync (`supabase/functions/drive/mergeImages.ts`)

**Files:**
- Create: `supabase/functions/drive/mergeImages.ts`
- Test: `supabase/functions/drive/mergeImages.test.ts`

**Interfaces:**
- Consumes: nada (puro, sin imports de Deno ni de `src`).
- Produces (usada por Task 6):
  - `mergeImages(existing: ImageRecord[], incoming: IncomingFile[]): ImageRecord[]`
  - `type ImageRecord = { id: string; name: string; url: string; order: number }`
  - `type IncomingFile = { id: string; name: string; url: string }`

- [ ] **Step 1: Write the failing test**

```ts
// supabase/functions/drive/mergeImages.test.ts
import { describe, expect, it } from 'vitest'
import { mergeImages } from './mergeImages'

const rec = (id: string, order: number) => ({ id, name: `${id}.jpg`, url: `u/${id}`, order })

describe('mergeImages', () => {
  it('preserva el orden relativo de las fotos ya conocidas', () => {
    const existing = [rec('a', 1), rec('b', 0)]
    const incoming = [
      { id: 'b', name: 'b2.jpg', url: 'u/b2' },
      { id: 'a', name: 'a2.jpg', url: 'u/a2' },
    ]
    expect(mergeImages(existing, incoming)).toEqual([
      { id: 'b', name: 'b2.jpg', url: 'u/b2', order: 0 },
      { id: 'a', name: 'a2.jpg', url: 'u/a2', order: 1 },
    ])
  })

  it('anexa las fotos nuevas al final', () => {
    const existing = [rec('a', 0)]
    const incoming = [
      { id: 'a', name: 'a.jpg', url: 'u/a' },
      { id: 'c', name: 'c.jpg', url: 'u/c' },
    ]
    expect(mergeImages(existing, incoming)).toEqual([
      { id: 'a', name: 'a.jpg', url: 'u/a', order: 0 },
      { id: 'c', name: 'c.jpg', url: 'u/c', order: 1 },
    ])
  })

  it('descarta las fotos que ya no están en Drive y renumera', () => {
    const existing = [rec('a', 0), rec('b', 1)]
    const incoming = [{ id: 'b', name: 'b.jpg', url: 'u/b' }]
    expect(mergeImages(existing, incoming)).toEqual([
      { id: 'b', name: 'b.jpg', url: 'u/b', order: 0 },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/drive/mergeImages.test.ts`
Expected: FAIL — cannot find module `./mergeImages`.

- [ ] **Step 3: Write minimal implementation**

```ts
// supabase/functions/drive/mergeImages.ts
export interface ImageRecord {
  id: string
  name: string
  url: string
  order: number
}

export interface IncomingFile {
  id: string
  name: string
  url: string
}

export function mergeImages(existing: ImageRecord[], incoming: IncomingFile[]): ImageRecord[] {
  const byId = new Map(existing.map((img) => [img.id, img]))
  let nextOrder = existing.reduce((max, img) => Math.max(max, img.order), -1) + 1
  const merged = incoming.map((f) => {
    const prev = byId.get(f.id)
    return prev
      ? { id: f.id, name: f.name, url: f.url, order: prev.order }
      : { id: f.id, name: f.name, url: f.url, order: nextOrder++ }
  })
  return merged.sort((a, b) => a.order - b.order).map((img, i) => ({ ...img, order: i }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/drive/mergeImages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/drive/mergeImages.ts supabase/functions/drive/mergeImages.test.ts
git commit -m "feat: helper mergeImages que preserva el orden en el sync de Drive"
```

---

### Task 5: Acciones `upload` y `delete` en el Apps Script

**Files:**
- Modify: `supabase/functions/drive/apps-script.gs`

**Interfaces:**
- Consumes: nada.
- Produces (endpoints del Web App, llamados por Task 6):
  - `upload` `{ folderId, name, mimeType, data, isActive }` → `{ id, name, url }`
  - `delete` `{ folderId, fileId }` → `{ ok: true }` o `{ error }`

- [ ] **Step 1: Add the new cases to `doPost`**

In `supabase/functions/drive/apps-script.gs`, inside the `switch (body.action)` block, after `case 'setVisibility':` add:

```js
        case 'upload':
          result = uploadFile(body.folderId, body.name, body.mimeType, body.data, Boolean(body.isActive));
          break;
        case 'delete':
          result = deleteFile(body.folderId, body.fileId);
          break;
```

- [ ] **Step 2: Add the `uploadFile` and `deleteFile` functions**

Append at the end of the file (after `setVisibility`):

```js
function uploadFile(folderId, name, mimeType, data, isActive) {
  const bytes = Utilities.base64Decode(String(data || ''));
  const blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', name);
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);
  const access = isActive ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE;
  file.setSharing(access, DriveApp.Permission.VIEW);
  return {
    id: file.getId(),
    name: file.getName(),
    url: 'https://lh3.googleusercontent.com/d/' + file.getId(),
  };
}

function deleteFile(folderId, fileId) {
  const folder = DriveApp.getFolderById(folderId);
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getId() === fileId) {
      f.setTrashed(true);
      return { ok: true };
    }
  }
  return { error: 'archivo no encontrado en la carpeta' };
}
```

- [ ] **Step 3: Verify the secret placeholder is intact**

Run: `Select-String -Path supabase/functions/drive/apps-script.gs -Pattern "SCRIPT_SECRET"`
Expected: the line `const SCRIPT_SECRET = 'CAMBIA_ESTE_SECRETO';` (NOT the real secret). The real secret must never be committed.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/drive/apps-script.gs
git commit -m "feat: acciones upload y delete en el Apps Script de Drive"
```

> Nota de despliegue manual (fuera del repo): pegar el archivo completo en el proyecto de Apps Script existente, conservando el `SCRIPT_SECRET` real que ya está en producción.

---

### Task 6: Acciones `upload`/`delete` y sync con fusión en la Edge Function

**Files:**
- Modify: `supabase/functions/drive/index.ts`

**Interfaces:**
- Consumes: `mergeImages`, `ImageRecord`, `IncomingFile` de `./mergeImages.ts` (Task 4).
- Produces (endpoints HTTP llamados por `src/lib/drive.ts`): acciones `upload` y `delete`; la acción `sync` ahora fusiona preservando orden.

- [ ] **Step 1: Import the merge helper**

At the top of `supabase/functions/drive/index.ts`, after the `createClient` import, add:

```ts
import { mergeImages, type ImageRecord, type IncomingFile } from './mergeImages.ts'
```

- [ ] **Step 2: Widen the body type and read `images` on sync**

Replace the `const body = (await req.json()) as { ... }` block with:

```ts
  const body = (await req.json()) as {
    action: string
    name?: string
    folderId?: string
    fileId?: string
    propertyId?: string
    mimeType?: string
    data?: string
    isActive?: boolean
  }
```

And in the `sync`/`setVisibility` branch, replace the `select('is_active, drive_folder_id')` line and the property type with:

```ts
    const { data: prop } = await supabase
      .from('properties')
      .select('is_active, drive_folder_id, images')
      .eq('id', body.propertyId)
      .single()
    const property = prop as {
      is_active: boolean
      drive_folder_id: string | null
      images: ImageRecord[]
    } | null
```

- [ ] **Step 3: Add the `upload` and `delete` actions**

After the `createFolder` branch and before the `list` branch, add:

```ts
  if (body.action === 'upload') {
    const { folderId, name, mimeType, data, isActive } = body
    if (!folderId || !data) return json({ error: 'faltan datos' }, 400)
    const result = await callScript({
      action: 'upload',
      folderId,
      name,
      mimeType,
      data,
      isActive: Boolean(isActive),
    })
    if ('error' in result) return json(result, 400)
    return json(result)
  }

  if (body.action === 'delete') {
    const { folderId, fileId } = body
    if (!folderId || !fileId) return json({ error: 'faltan datos' }, 400)
    const result = await callScript({ action: 'delete', folderId, fileId })
    if ('error' in result) return json(result, 400)
    return json(result)
  }
```

- [ ] **Step 4: Merge on sync instead of overwrite**

Replace this block:

```ts
    if (body.action === 'sync' && 'files' in result) {
      await supabase
        .from('properties')
        .update({ images: (result as { files: unknown[] }).files })
        .eq('id', body.propertyId)
    }
```

with:

```ts
    if (body.action === 'sync' && 'files' in result) {
      const existing = property?.images ?? []
      const incoming = (result as { files: IncomingFile[] }).files
      const merged = mergeImages(existing, incoming)
      await supabase.from('properties').update({ images: merged }).eq('id', body.propertyId)
    }
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/drive/index.ts
git commit -m "feat: subir/eliminar fotos y sync con fusión de orden en la Edge Function drive"
```

> Nota de despliegue manual: redesplegar la Edge Function `drive` en Supabase.

---

### Task 7: Componente `PropertyImagesSection` (reemplaza `ImageSyncSection`)

**Files:**
- Create: `src/features/admin/PropertyImagesSection.tsx`
- Delete: `src/features/admin/ImageSyncSection.tsx`
- Delete: `src/features/admin/ImageSyncSection.test.tsx`
- Test: `src/features/admin/PropertyImagesSection.test.tsx`

**Interfaces:**
- Consumes: `useSession` (`../../hooks/useSession`), `uploadDriveFile`/`deleteDriveFile`/`listDriveFiles`/`syncDriveFolder` (`../../lib/drive`), `resizeImage` (`../../lib/imageResize`), `sortImages`/`moveImage`/`removeImage` (`../../lib/images`), `Button`/`Badge` (`../../components/ui`), `PropertyImage` (`../../types`).
- Produces (usada por Task 8):
  ```ts
  interface PropertyImagesSectionProps {
    images: PropertyImage[]
    driveFolderId: string | null
    propertyId?: string
    isActive: boolean
    onChange: (images: PropertyImage[]) => void
    ensureFolder: () => Promise<string | null>
    onSynced?: () => void
  }
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/admin/PropertyImagesSection.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PropertyImagesSection } from './PropertyImagesSection'
import { useSession } from '../../hooks/useSession'
import { listDriveFiles, uploadDriveFile, deleteDriveFile } from '../../lib/drive'
import { resizeImage } from '../../lib/imageResize'
import type { PropertyImage } from '../../types'

vi.mock('../../hooks/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../lib/drive', () => ({
  listDriveFiles: vi.fn(),
  syncDriveFolder: vi.fn(),
  uploadDriveFile: vi.fn(),
  deleteDriveFile: vi.fn(),
}))
vi.mock('../../lib/imageResize', () => ({ resizeImage: vi.fn() }))

const mockedUseSession = vi.mocked(useSession)
const mockedListDriveFiles = vi.mocked(listDriveFiles)
const mockedUploadDriveFile = vi.mocked(uploadDriveFile)
const mockedDeleteDriveFile = vi.mocked(deleteDriveFile)
const mockedResizeImage = vi.mocked(resizeImage)

const img = (id: string, order: number): PropertyImage => ({ id, url: `u/${id}`, name: `${id}.jpg`, order })

function renderSection(overrides: Partial<Parameters<typeof PropertyImagesSection>[0]> = {}) {
  const props = {
    images: [] as PropertyImage[],
    driveFolderId: 'folder-1' as string | null,
    propertyId: 'p1' as string | undefined,
    isActive: false,
    onChange: vi.fn(),
    ensureFolder: vi.fn().mockResolvedValue('folder-1'),
    ...overrides,
  }
  render(<PropertyImagesSection {...props} />)
  return props
}

describe('PropertyImagesSection', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      profile: { id: '1', full_name: 'Ana', role: 'gerente', is_active: true, created_at: '' },
      loading: false,
      signOut: vi.fn(),
    })
    mockedListDriveFiles.mockReset().mockResolvedValue([])
    mockedUploadDriveFile.mockReset()
    mockedDeleteDriveFile.mockReset()
    mockedResizeImage.mockReset()
  })

  it('muestra aviso cuando Drive tiene archivos que no están en Supabase', async () => {
    mockedListDriveFiles.mockResolvedValue([{ id: 'f1', name: 'foto1.jpg' }])
    renderSection()
    expect(await screen.findByText(/desincronizadas con Drive/)).toBeInTheDocument()
  })

  it('no muestra aviso cuando no hay desincronización', async () => {
    renderSection({ images: [] })
    await screen.findByText(/imágenes registradas/)
    expect(screen.queryByText(/desincronizadas con Drive/)).not.toBeInTheDocument()
  })

  it('sube una foto y la agrega al final', async () => {
    const user = userEvent.setup()
    const props = renderSection({ images: [] })
    mockedResizeImage.mockResolvedValue({ base64: 'abc', mimeType: 'image/jpeg', name: 'foto.jpg' })
    mockedUploadDriveFile.mockResolvedValue({ id: 'f1', name: 'foto.jpg', url: 'u/f1' })

    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Agregar fotos'), file)

    expect(props.onChange).toHaveBeenCalledWith([
      { id: 'f1', name: 'foto.jpg', url: 'u/f1', order: 0 },
    ])
  })

  it('reordena con el botón subir', async () => {
    const user = userEvent.setup()
    const props = renderSection({ images: [img('a', 0), img('b', 1)] })

    const upButtons = screen.getAllByRole('button', { name: 'Subir' })
    await user.click(upButtons[1])

    expect(props.onChange).toHaveBeenCalledWith([
      { id: 'b', name: 'b.jpg', url: 'u/b', order: 0 },
      { id: 'a', name: 'a.jpg', url: 'u/a', order: 1 },
    ])
  })

  it('elimina una foto de Drive y de la lista', async () => {
    const user = userEvent.setup()
    mockedDeleteDriveFile.mockResolvedValue(true)
    const props = renderSection({ images: [img('a', 0)] })

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(mockedDeleteDriveFile).toHaveBeenCalledWith('folder-1', 'a')
    expect(props.onChange).toHaveBeenCalledWith([])
  })

  it('marca la primera foto como portada', () => {
    renderSection({ images: [img('a', 0), img('b', 1)] })
    expect(screen.getAllByText('Portada')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/admin/PropertyImagesSection.test.tsx`
Expected: FAIL — cannot find module `./PropertyImagesSection`.

- [ ] **Step 3: Write the component**

```tsx
// src/features/admin/PropertyImagesSection.tsx
import { useEffect, useRef, useState } from 'react'
import { useSession } from '../../hooks/useSession'
import { uploadDriveFile, deleteDriveFile, listDriveFiles, syncDriveFolder } from '../../lib/drive'
import { resizeImage } from '../../lib/imageResize'
import { sortImages, moveImage, removeImage } from '../../lib/images'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { PropertyImage } from '../../types'

interface PropertyImagesSectionProps {
  images: PropertyImage[]
  driveFolderId: string | null
  propertyId?: string
  isActive: boolean
  onChange: (images: PropertyImage[]) => void
  ensureFolder: () => Promise<string | null>
  onSynced?: () => void
}

export function PropertyImagesSection({
  images,
  driveFolderId,
  propertyId,
  isActive,
  onChange,
  ensureFolder,
  onSynced,
}: PropertyImagesSectionProps) {
  const { profile } = useSession()
  const [desynced, setDesynced] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const imagesRef = useRef(images)

  const canManage = profile?.role === 'gerente' || profile?.role === 'master'

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    if (!canManage || !driveFolderId || !propertyId) return
    let active = true
    listDriveFiles(driveFolderId).then((files) => {
      if (!active) return
      const storedIds = new Set(images.map((img) => img.id))
      const driveIds = new Set(files.map((f) => f.id))
      const same =
        storedIds.size === driveIds.size && [...driveIds].every((id) => storedIds.has(id))
      setDesynced(!same)
    })
    return () => {
      active = false
    }
  }, [canManage, driveFolderId, propertyId, images])

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    let folderId = driveFolderId
    if (!folderId) {
      folderId = await ensureFolder()
      if (!folderId) {
        setMessage('No se pudo crear la carpeta de Drive.')
        return
      }
    }
    for (const file of Array.from(files)) {
      setUploading(file.name)
      setMessage(null)
      try {
        const resized = await resizeImage(file)
        const uploaded = await uploadDriveFile({
          folderId,
          name: resized.name,
          mimeType: resized.mimeType,
          data: resized.base64,
          isActive,
        })
        if (!uploaded) throw new Error('sin respuesta')
        const next = [
          ...imagesRef.current,
          { id: uploaded.id, url: uploaded.url, name: uploaded.name, order: imagesRef.current.length },
        ]
        onChange(next)
      } catch {
        setMessage(`No se pudo subir ${file.name}.`)
      } finally {
        setUploading(null)
      }
    }
  }

  const onMove = (index: number, direction: -1 | 1) => {
    onChange(moveImage(images, index, direction))
  }

  const onDelete = async (img: PropertyImage, index: number) => {
    if (!driveFolderId) return
    setMessage(null)
    const ok = await deleteDriveFile(driveFolderId, img.id)
    if (!ok) {
      setMessage('No se pudo eliminar la foto.')
      return
    }
    onChange(removeImage(images, index))
  }

  const sync = async () => {
    if (!driveFolderId || !propertyId) return
    setSyncing(true)
    setMessage(null)
    const ok = await syncDriveFolder(driveFolderId, propertyId)
    setSyncing(false)
    if (ok) {
      setDesynced(false)
      onSynced?.()
    } else {
      setMessage('No se pudo sincronizar.')
    }
  }

  const sorted = sortImages(images)

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-300 bg-white p-4">
      <h3 className="text-h3 font-semibold text-neutral-900">Imágenes</h3>
      <p className="text-small text-neutral-500">{images.length} imágenes registradas.</p>

      {canManage && !driveFolderId && (
        <p className="text-small text-neutral-500">Sube la primera foto para crear la carpeta de Drive.</p>
      )}
      {!canManage && !driveFolderId && (
        <p className="text-small text-neutral-500">Sin carpeta de Drive asociada.</p>
      )}

      {canManage && (
        <div>
          <label
            htmlFor="image-upload"
            className="inline-flex cursor-pointer items-center justify-center rounded-sm bg-primary px-4 py-2 text-body font-medium text-white"
          >
            Agregar fotos
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => void onFiles(e.target.files)}
          />
        </div>
      )}

      {uploading && <p className="text-small text-neutral-500">Subiendo {uploading}…</p>}

      {desynced && canManage && (
        <p className="text-small text-warning">
          Las imágenes de este inmueble están desincronizadas con Drive.
        </p>
      )}
      {message && <p className="text-small text-danger">{message}</p>}

      {canManage && driveFolderId && propertyId && (
        <Button type="button" variant="secondary" onClick={sync} disabled={syncing}>
          {syncing ? 'Sincronizando...' : 'Sincronizar imágenes'}
        </Button>
      )}

      {sorted.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sorted.map((img, i) => (
            <li key={img.id} className="flex items-center gap-3">
              <img src={img.url} alt={img.name} className="h-14 w-14 rounded-sm object-cover" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-small text-neutral-900">{img.name}</span>
                {i === 0 && <Badge variant="success">Portada</Badge>}
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" aria-label="Subir" disabled={i === 0} onClick={() => onMove(i, -1)}>
                    ↑
                  </Button>
                  <Button type="button" variant="ghost" aria-label="Bajar" disabled={i === sorted.length - 1} onClick={() => onMove(i, 1)}>
                    ↓
                  </Button>
                  <Button type="button" variant="ghost" aria-label="Eliminar" onClick={() => void onDelete(img, i)}>
                    ✕
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Delete the old files**

Run: `Remove-Item -LiteralPath "src/features/admin/ImageSyncSection.tsx", "src/features/admin/ImageSyncSection.test.tsx"`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/admin/PropertyImagesSection.test.tsx`
Expected: PASS (all 6 green).

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: no errors in `PropertyImagesSection.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/features/admin/PropertyImagesSection.tsx src/features/admin/PropertyImagesSection.test.tsx
git rm src/features/admin/ImageSyncSection.tsx src/features/admin/ImageSyncSection.test.tsx
git commit -m "feat: sección de imágenes con subir, reordenar, eliminar y portada"
```

---

### Task 8: Integrar en `PropertyFormPage`

**Files:**
- Modify: `src/features/admin/PropertyFormPage.tsx`

**Interfaces:**
- Consumes: `PropertyImagesSection` (Task 7), `createDriveFolder` (`../../lib/drive`), `PropertyImage` (`../../types`).
- Produces: el formulario ahora persiste `images` y `drive_folder_id` en creación, y pasa las imágenes a la sección en ambos modos.

- [ ] **Step 1: Update imports and add state**

In `src/features/admin/PropertyFormPage.tsx`, replace:

```tsx
import { supabase } from '../../lib/supabase'
import { normalizePriceUsd } from '../../lib/price'
import { PROPERTY_TYPES, ZONES } from '../../lib/constants'
import { ImageSyncSection } from './ImageSyncSection'
```

with:

```tsx
import { supabase } from '../../lib/supabase'
import { createDriveFolder } from '../../lib/drive'
import { normalizePriceUsd } from '../../lib/price'
import { PROPERTY_TYPES, ZONES } from '../../lib/constants'
import { PropertyImagesSection } from './PropertyImagesSection'
```

And change the `Property` import line to also import `PropertyImage`:

```tsx
import type { Property, PropertyImage } from '../../types'
```

- [ ] **Step 2: Add state and getValues**

Replace:

```tsx
  const [rate, setRate] = useState(0)
  const [property, setProperty] = useState<Property | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({ resolver: zodResolver(propertySchema), defaultValues })
```

with:

```tsx
  const [rate, setRate] = useState(0)
  const [property, setProperty] = useState<Property | null>(null)
  const [images, setImages] = useState<PropertyImage[]>([])
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({ resolver: zodResolver(propertySchema), defaultValues })
```

- [ ] **Step 3: Populate images and folder on edit load**

In the edit `useEffect` (the one that fetches by `id`), inside the `if (p) { ... }` block, add two lines after `reset({...})`:

```tsx
          setImages(p.images)
          setDriveFolderId(p.drive_folder_id)
```

- [ ] **Step 4: Update `reloadProperty` to refresh images**

Replace the `reloadProperty` callback with:

```tsx
  const reloadProperty = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('properties').select('*').eq('id', id).single()
    if (data) {
      const p = data as Property
      setProperty(p)
      setImages(p.images)
      setDriveFolderId(p.drive_folder_id)
    }
  }, [id])
```

- [ ] **Step 5: Add `ensureFolder` and `handleImagesChange` callbacks**

After `reloadProperty`, add:

```tsx
  const ensureFolder = useCallback(async () => {
    if (driveFolderId) return driveFolderId
    const name = `${getValues('type')}-${getValues('zone')}`
    const folderId = await createDriveFolder(name)
    if (folderId) setDriveFolderId(folderId)
    return folderId
  }, [driveFolderId, getValues])

  const handleImagesChange = useCallback(
    async (next: PropertyImage[]) => {
      setImages(next)
      if (isEdit && id) {
        await supabase.from('properties').update({ images: next }).eq('id', id)
      }
    },
    [isEdit, id],
  )
```

- [ ] **Step 6: Rewrite the create branch of `onSubmit`**

Replace this block:

```tsx
    let driveFolderId: string | null = null
    try {
      const { data } = await supabase.functions.invoke('drive', {
        body: { action: 'createFolder', name: `${values.type}-${values.zone}` },
      })
      driveFolderId = data?.folderId ?? null
    } catch {
      driveFolderId = null
    }

    const { error } = await supabase
      .from('properties')
      .insert({ ...payload, drive_folder_id: driveFolderId })
```

with:

```tsx
    let folderId = driveFolderId
    if (!folderId) {
      folderId = await createDriveFolder(`${values.type}-${values.zone}`)
    }

    const { error } = await supabase
      .from('properties')
      .insert({ ...payload, drive_folder_id: folderId, images })
```

> Note: `driveFolderId` is now a state variable, so use the local `folderId` inside `onSubmit` to avoid shadowing.

- [ ] **Step 7: Render the new section in both modes**

Replace:

```tsx
      {isEdit && property && <ImageSyncSection property={property} onSynced={reloadProperty} />}
```

with:

```tsx
      <PropertyImagesSection
        images={images}
        driveFolderId={driveFolderId}
        propertyId={id}
        isActive={property?.is_active ?? false}
        onChange={handleImagesChange}
        ensureFolder={ensureFolder}
        onSynced={reloadProperty}
      />
```

- [ ] **Step 8: Typecheck and run full tests**

Run: `npx tsc -b`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass (including the new `PropertyImagesSection` and the untouched suites).

- [ ] **Step 9: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/features/admin/PropertyFormPage.tsx
git commit -m "feat: integrar gestión de imágenes en crear/editar de inmueble"
```

---

### Task 9: Consumir la portada en el catálogo y el admin

**Files:**
- Modify: `src/components/catalog/PropertyCard.tsx`
- Modify: `src/components/catalog/PropertyGallery.tsx`
- Modify: `src/features/admin/AdminListPage.tsx`
- Test: `src/components/catalog/PropertyCard.test.tsx` (add case)
- Test: `src/components/catalog/PropertyGallery.test.tsx` (new)

**Interfaces:**
- Consumes: `coverImage`, `sortImages` de `../../lib/images` (Task 1).

- [ ] **Step 1: Update `PropertyCard`**

In `src/components/catalog/PropertyCard.tsx`, replace the import line:

```tsx
import type { Property } from '../../types'
```

with:

```tsx
import { coverImage } from '../../lib/images'
import type { Property } from '../../types'
```

And replace:

```tsx
  const cover = property.images[0]?.url ?? '/brand/placeholder-property.svg'
```

with:

```tsx
  const cover = coverImage(property.images)?.url ?? '/brand/placeholder-property.svg'
```

- [ ] **Step 2: Update `PropertyGallery`**

In `src/components/catalog/PropertyGallery.tsx`, add the import:

```tsx
import { sortImages } from '../../lib/images'
```

And replace:

```tsx
export function PropertyGallery({ images }: { images: PropertyImage[] }) {
  const [index, setIndex] = useState(0)

  if (images.length === 0) {
```

with:

```tsx
export function PropertyGallery({ images }: { images: PropertyImage[] }) {
  const [index, setIndex] = useState(0)
  const sorted = sortImages(images)

  if (sorted.length === 0) {
```

And change the remaining references inside the component from `images` to `sorted` (`current = sorted[index]`, `prev`/`next` use `sorted.length`, and the empty case).

- [ ] **Step 3: Update `AdminListPage` thumbnail**

In `src/features/admin/AdminListPage.tsx`, add the import:

```tsx
import { coverImage } from '../../lib/images'
```

And replace:

```tsx
                src={p.images[0]?.url ?? '/brand/placeholder-property.svg'}
```

with:

```tsx
                src={coverImage(p.images)?.url ?? '/brand/placeholder-property.svg'}
```

- [ ] **Step 4: Add a cover test to `PropertyCard.test.tsx`**

Append a new test to `src/components/catalog/PropertyCard.test.tsx`:

```tsx
  it('usa la primera foto por order como portada', () => {
    const withImages = {
      ...property,
      images: [
        { id: 'b', url: '/second.jpg', name: 'segunda', order: 1 },
        { id: 'a', url: '/first.jpg', name: 'primera', order: 0 },
      ],
    }
    render(
      <MemoryRouter>
        <PropertyCard property={withImages} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', '/first.jpg')
  })
```

- [ ] **Step 5: Write `PropertyGallery.test.tsx`**

```tsx
// src/components/catalog/PropertyGallery.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PropertyGallery } from './PropertyGallery'

describe('PropertyGallery', () => {
  it('arranca en la foto con order 0 (portada)', () => {
    render(
      <PropertyGallery
        images={[
          { id: 'b', url: '/second.jpg', name: 'segunda', order: 1 },
          { id: 'a', url: '/first.jpg', name: 'primera', order: 0 },
        ]}
      />,
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', '/first.jpg')
  })

  it('muestra placeholder si no hay imágenes', () => {
    render(<PropertyGallery images={[]} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/brand/placeholder-property.svg')
  })
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/catalog/PropertyCard.test.tsx src/components/catalog/PropertyGallery.test.tsx`
Expected: PASS.

- [ ] **Step 7: Run full suite, lint, and build**

Run: `npx vitest run`
Expected: all pass.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: compiles.

- [ ] **Step 8: Commit**

```bash
git add src/components/catalog/PropertyCard.tsx src/components/catalog/PropertyGallery.tsx src/features/admin/AdminListPage.tsx src/components/catalog/PropertyCard.test.tsx src/components/catalog/PropertyGallery.test.tsx
git commit -m "feat: usar la primera foto del orden como portada en catálogo y admin"
```

---

## Self-Review

**Spec coverage:**
- Subida desde el formulario → Task 7 (componente) + Task 5/6 (Apps Script + Edge Function).
- Reordenar subir/bajar → Task 1 (moveImage) + Task 7.
- Eliminar → Task 5/6 + Task 7.
- Portada = primera posición → Task 1 (coverImage/sortImages) + Task 9.
- Sync preservando orden → Task 4 (mergeImages) + Task 6.
- Redimensionado en cliente → Task 2.
- Crear carpeta al subir en creación → Task 3 (createDriveFolder) + Task 8 (ensureFolder).
- Permisos gerente/master → Task 7 (canManage).

**Placeholder scan:** ninguno.

**Type consistency:** `moveImage`/`removeImage`/`coverImage`/`sortImages`/`renumberImages` (Task 1) usan `PropertyImage`; `resizeImage` (Task 2) devuelve `{ base64, mimeType, name }` y Task 7 lo consume con esos nombres; `mergeImages` (Task 4) usa `ImageRecord`/`IncomingFile` y Task 6 los importa; `PropertyImagesSectionProps` (Task 7) coincide con el uso en Task 8.
