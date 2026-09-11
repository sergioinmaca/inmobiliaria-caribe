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
