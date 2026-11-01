import { describe, expect, it } from 'vitest'
import type { Submission } from './api'
import { homeworkStatus } from './status'

const copy = (score: number | null) => ({ id: 1, content: 'ok', score } as Submission)

describe('homeworkStatus', () => {
  const today = '2026-10-30'

  it('distingue à rendre et en retard selon la date limite', () => {
    expect(homeworkStatus({ dueDate: '2026-10-30', submission: null }, today)).toBe('TODO')
    expect(homeworkStatus({ dueDate: '2026-10-29', submission: null }, today)).toBe('LATE')
  })

  it('suit la copie rendue puis corrigée', () => {
    expect(homeworkStatus({ dueDate: '2026-10-01', submission: copy(null) }, today)).toBe('SUBMITTED')
    expect(homeworkStatus({ dueDate: '2026-10-01', submission: copy(14) }, today)).toBe('REVIEWED')
  })
})
