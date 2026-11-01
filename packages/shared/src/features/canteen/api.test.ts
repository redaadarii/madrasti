import { describe, expect, it } from 'vitest'
import { addDays } from './api'

describe('addDays', () => {
  it('franchit les fins de mois et d\'année', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
    expect(addDays('2026-11-02', -7)).toBe('2026-10-26')
  })
})
