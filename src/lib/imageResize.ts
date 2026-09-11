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
