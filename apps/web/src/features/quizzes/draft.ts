import { t } from '@/i18n'
export interface DraftQuestion {
  prompt: string
  choices: string[]
  correctIndex: number
}

export const emptyQuestion = (): DraftQuestion => ({ prompt: '', choices: ['', ''], correctIndex: 0 })

/** Première erreur bloquante du brouillon, ou null s'il est publiable. */
export function quizDraftError(questions: DraftQuestion[]): string | null {
  for (const [i, q] of questions.entries()) {
    if (!q.prompt.trim()) return t('Question {{n}} : énoncé manquant', { n: i + 1 })
    if (q.choices.some((c) => !c.trim())) return t('Question {{n}} : un choix est vide', { n: i + 1 })
  }
  return null
}
