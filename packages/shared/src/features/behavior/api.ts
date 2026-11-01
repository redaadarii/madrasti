import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type BehaviorCategory =
  | 'PARTICIPATION' | 'HELPING' | 'TEAMWORK' | 'EFFORT' | 'RESPECT'
  | 'DISRUPTION' | 'FORGOTTEN_MATERIAL' | 'HOMEWORK_MISSING' | 'DISRESPECT' | 'CHEATING'

export type Sanction = 'WARNING' | 'DETENTION' | 'EXCLUSION'

/** Libellés (clés de traduction), barème et emoji : le barème réel est calculé par l'API. */
export const BEHAVIOR_CATEGORIES: { value: BehaviorCategory; label: string; points: number; emoji: string }[] = [
  { value: 'PARTICIPATION', label: 'Participation', points: 1, emoji: '🙋' },
  { value: 'HELPING', label: 'Entraide', points: 1, emoji: '🤝' },
  { value: 'TEAMWORK', label: 'Travail en équipe', points: 1, emoji: '🧩' },
  { value: 'EFFORT', label: 'Persévérance', points: 1, emoji: '💪' },
  { value: 'RESPECT', label: 'Respect et politesse', points: 1, emoji: '🌟' },
  { value: 'DISRUPTION', label: 'Bavardages / perturbation', points: -1, emoji: '🗣️' },
  { value: 'FORGOTTEN_MATERIAL', label: 'Matériel oublié', points: -1, emoji: '🎒' },
  { value: 'HOMEWORK_MISSING', label: 'Devoir non fait', points: -1, emoji: '📓' },
  { value: 'DISRESPECT', label: 'Manque de respect', points: -2, emoji: '⚠️' },
  { value: 'CHEATING', label: 'Fraude', points: -3, emoji: '🚫' },
]

export const categoryInfo = (category: BehaviorCategory) => BEHAVIOR_CATEGORIES.find((c) => c.value === category)!

export const SANCTION_LABELS: Record<Sanction, string> = {
  WARNING: 'Avertissement',
  DETENTION: 'Retenue',
  EXCLUSION: 'Exclusion temporaire',
}

export interface BehaviorRecord {
  id: number
  studentId: number
  studentName: string
  category: BehaviorCategory
  points: number
  positive: boolean
  sanction: Sanction | null
  note: string | null
  occurredOn: string
  authorName: string | null
}

export interface StudentBehavior {
  records: BehaviorRecord[]
  positives: number
  incidents: number
  balance: number
}

export interface ClassroomBehavior {
  students: { studentId: number; studentName: string; positives: number; incidents: number; balance: number }[]
  recent: BehaviorRecord[]
}

export interface BehaviorInput {
  studentId: number
  category: BehaviorCategory
  sanction?: Sanction
  note?: string
}

const behaviorKeys = {
  all: ['behavior'] as const,
  student: (id: number) => [...behaviorKeys.all, 'student', id] as const,
  classroom: (id: number) => [...behaviorKeys.all, 'classroom', id] as const,
}

export const studentBehaviorQueryOptions = (studentId: number) =>
  queryOptions({ queryKey: behaviorKeys.student(studentId), queryFn: () => api<StudentBehavior>('/behavior', { query: { studentId } }) })

export const classroomBehaviorQueryOptions = (classroomId: number) =>
  queryOptions({ queryKey: behaviorKeys.classroom(classroomId), queryFn: () => api<ClassroomBehavior>(`/behavior/classrooms/${classroomId}`) })

function useBehaviorMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: behaviorKeys.all }) })
}

export const useRecordBehavior = () =>
  useBehaviorMutation((input: BehaviorInput) => api<BehaviorRecord>('/behavior', { method: 'POST', body: input }))

export const useDeleteBehavior = () =>
  useBehaviorMutation((id: number) => api<void>(`/behavior/${id}`, { method: 'DELETE' }))
