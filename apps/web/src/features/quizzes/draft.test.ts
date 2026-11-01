import { describe, expect, it } from 'vitest'
import { quizDraftError } from './draft'

describe('quizDraftError', () => {
  it('signale la première question incomplète', () => {
    expect(quizDraftError([{ prompt: 'Q1', choices: ['a', 'b'], correctIndex: 0 }, { prompt: '', choices: ['a', 'b'], correctIndex: 1 }]))
      .toBe('Question 2 : énoncé manquant')
    expect(quizDraftError([{ prompt: 'Q1', choices: ['a', ' '], correctIndex: 0 }])).toBe('Question 1 : un choix est vide')
  })

  it('accepte un brouillon complet', () => {
    expect(quizDraftError([{ prompt: 'Q1', choices: ['a', 'b'], correctIndex: 1 }])).toBeNull()
  })
})
