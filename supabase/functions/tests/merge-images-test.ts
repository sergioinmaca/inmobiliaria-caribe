// Tests de la lógica pura de fusión de imágenes.
// Ejecutar con Deno (requiere tener Deno instalado):
//   deno test supabase/functions/tests/merge-images-test.ts
// No forma parte de `npm test` (vitest), que cubre solo el frontend.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { mergeImages, type ImageRecord } from '../drive/mergeImages.ts'

const existing: ImageRecord[] = [
  { id: 'a', name: 'a.jpg', url: 'u/a', order: 0 },
  { id: 'b', name: 'b.jpg', url: 'u/b', order: 1 },
]

Deno.test('conserva el orden existente y anexa las fotos nuevas', () => {
  const result = mergeImages(existing, [
    { id: 'b', name: 'b.jpg', url: 'u/b' },
    { id: 'a', name: 'a2.jpg', url: 'u/a2' },
    { id: 'c', name: 'c.jpg', url: 'u/c' },
  ])
  assertEquals(
    result.map((img) => img.id),
    ['a', 'b', 'c'],
  )
  assertEquals(
    result.map((img) => img.order),
    [0, 1, 2],
  )
  assertEquals(result.find((img) => img.id === 'a')?.name, 'a2.jpg')
})

Deno.test('descarta las fotos que ya no están en Drive y renumera', () => {
  const result = mergeImages(existing, [{ id: 'b', name: 'b.jpg', url: 'u/b' }])
  assertEquals(result, [{ id: 'b', name: 'b.jpg', url: 'u/b', order: 0 }])
})
