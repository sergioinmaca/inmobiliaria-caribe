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
