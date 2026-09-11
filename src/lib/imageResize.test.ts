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
