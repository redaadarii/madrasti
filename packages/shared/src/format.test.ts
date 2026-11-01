import { describe, expect, it } from 'vitest'
import { initials, scoreOutOf20 } from './format'

describe('format', () => {
  it('ramène une note sur 20', () => {
    expect(scoreOutOf20(7.5, 10)).toBe(15)
    expect(scoreOutOf20(13, 20)).toBe(13)
  })

  it('calcule les initiales', () => {
    expect(initials('salma', 'benali')).toBe('SB')
  })
})
