// src/lib/userSchema.test.ts
import { describe, expect, it } from 'vitest'
import { buildEmail, userSchema } from './userSchema'

describe('userSchema', () => {
  it('valida un usuario correcto', () => {
    const r = userSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '',
      emailLocal: 'ana.perez',
      password: '123456',
      role: 'gerente',
    })
    expect(r.success).toBe(true)
  })

  it('rechaza si falta nombre o apellido', () => {
    expect(
      userSchema.safeParse({
        firstName: '',
        lastName: '',
        phone: '',
        emailLocal: 'a',
        password: '123456',
        role: 'invitado',
      }).success,
    ).toBe(false)
  })

  it('rechaza contraseña menor a 6', () => {
    expect(
      userSchema.safeParse({
        firstName: 'A',
        lastName: 'B',
        phone: '',
        emailLocal: 'a',
        password: '12345',
        role: 'invitado',
      }).success,
    ).toBe(false)
  })

  it('rechaza parte local con caracteres inválidos', () => {
    expect(
      userSchema.safeParse({
        firstName: 'A',
        lastName: 'B',
        phone: '',
        emailLocal: 'ana@x',
        password: '123456',
        role: 'invitado',
      }).success,
    ).toBe(false)
  })

  it('permite teléfono vacío (opcional)', () => {
    const r = userSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      phone: undefined,
      emailLocal: 'a',
      password: '123456',
      role: 'invitado',
    })
    expect(r.success).toBe(true)
  })
})

describe('buildEmail', () => {
  it('arma el correo con @inmaca.com', () => {
    expect(buildEmail('ana.perez')).toBe('ana.perez@inmaca.com')
  })
})
