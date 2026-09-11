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
