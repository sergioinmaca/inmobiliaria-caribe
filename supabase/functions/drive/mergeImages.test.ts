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
