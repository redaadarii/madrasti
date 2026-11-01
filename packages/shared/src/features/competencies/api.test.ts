import { describe, expect, it } from 'vitest'
import { nextMastery } from './api'

describe('nextMastery', () => {
  it('fait défiler l\'échelle puis revient à une case vide', () => {
    expect(nextMastery(undefined)).toBe('NOT_ACQUIRED')
    expect(nextMastery('NOT_ACQUIRED')).toBe('IN_PROGRESS')
    expect(nextMastery('ACQUIRED')).toBe('EXCEEDED')
    expect(nextMastery('EXCEEDED')).toBeNull()
  })
})
