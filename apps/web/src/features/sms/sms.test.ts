import { describe, expect, it } from 'vitest'
import { smsSegments } from '@madrasti/shared/features/sms/api'

describe('smsSegments', () => {
  it('compte 160 caractères GSM ou 70 en arabe par SMS', () => {
    expect(smsSegments('a'.repeat(160))).toBe(1)
    expect(smsSegments('a'.repeat(161))).toBe(2)
    expect(smsSegments('م'.repeat(70))).toBe(1)
    expect(smsSegments('م'.repeat(71))).toBe(2)
  })
})
