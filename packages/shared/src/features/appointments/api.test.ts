import { describe, expect, it } from 'vitest'
import { groupByDay } from './api'

describe('groupByDay', () => {
  it('regroupe les créneaux par jour en conservant leur ordre', () => {
    const groups = groupByDay([
      { id: 1, startsAt: '2026-11-05T16:30:00' },
      { id: 2, startsAt: '2026-11-05T16:45:00' },
      { id: 3, startsAt: '2026-11-07T10:00:00' },
    ])
    expect(groups.map(([day, slots]) => [day, slots.map((s) => s.id)])).toEqual([
      ['2026-11-05', [1, 2]],
      ['2026-11-07', [3]],
    ])
  })
})
