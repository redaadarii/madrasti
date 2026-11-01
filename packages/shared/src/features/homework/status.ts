import type { Assignment } from './api'

export type HomeworkStatus = 'TODO' | 'LATE' | 'SUBMITTED' | 'REVIEWED'

export const HOMEWORK_STATUS_LABELS: Record<HomeworkStatus, string> = {
  TODO: 'À rendre',
  LATE: 'En retard',
  SUBMITTED: 'Rendu',
  REVIEWED: 'Corrigé',
}

/** Statut d'un devoir du point de vue de l'élève, à la date du jour (AAAA-MM-JJ). */
export function homeworkStatus(assignment: Pick<Assignment, 'dueDate' | 'submission'>, today: string): HomeworkStatus {
  const { submission } = assignment
  if (submission?.score != null) return 'REVIEWED'
  if (submission) return 'SUBMITTED'
  return assignment.dueDate < today ? 'LATE' : 'TODO'
}

export const todayIso = () => new Date().toLocaleDateString('sv-SE')
