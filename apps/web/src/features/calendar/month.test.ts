import { describe, expect, it } from 'vitest'
import { monthGrid, sameDay } from './month'

describe('monthGrid', () => {
  it('commence un lundi et couvre des semaines complètes', () => {
    const grid = monthGrid(2026, 10) // novembre 2026 : le 1er est un dimanche
    expect(grid[0].getDay()).toBe(1)
    expect(grid.length % 7).toBe(0)
    expect(sameDay(grid[6], new Date(2026, 10, 1))).toBe(true)
    expect(grid.at(-1)!.getDay()).toBe(0)
  })
})
