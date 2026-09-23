// Lógica pura de fusión de imágenes (sin dependencias de Deno).
// Conserva el orden existente, anexa las nuevas al final y descarta las que ya no están.

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

  const merged = incoming.map((file) => {
    const prev = byId.get(file.id)
    return prev
      ? { id: file.id, name: file.name, url: file.url, order: prev.order }
      : { id: file.id, name: file.name, url: file.url, order: nextOrder++ }
  })

  return merged.sort((a, b) => a.order - b.order).map((img, index) => ({ ...img, order: index }))
}
