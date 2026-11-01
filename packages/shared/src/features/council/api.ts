import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiBlob } from '../../http'

export type CouncilDecision = 'CONGRATULATIONS' | 'COMPLIMENTS' | 'ENCOURAGEMENTS' | 'NONE' | 'WARNING'

export const COUNCIL_DECISION_LABELS: Record<CouncilDecision, string> = {
  CONGRATULATIONS: 'Félicitations du conseil',
  COMPLIMENTS: 'Compliments',
  ENCOURAGEMENTS: 'Encouragements',
  NONE: 'Sans mention',
  WARNING: 'Avertissement de travail',
}

export interface CouncilRow {
  studentId: number
  studentName: string
  average: number | null
  rank: number | null
  absences: number
  suggested: CouncilDecision | null
  decision: CouncilDecision | null
  appreciation: string | null
}

const councilKeys = {
  all: ['council'] as const,
  list: (classroomId: number, term: string) => [...councilKeys.all, classroomId, term] as const,
}

export const councilQueryOptions = (classroomId: number, term: string) =>
  queryOptions({
    queryKey: councilKeys.list(classroomId, term),
    queryFn: () => api<CouncilRow[]>(`/councils/${classroomId}`, { query: { term } }),
  })

export function useSaveDecision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { studentId: number; term: string; decision: CouncilDecision; appreciation?: string }) =>
      api<void>('/councils/decisions', { method: 'PUT', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: councilKeys.all })
      queryClient.invalidateQueries({ queryKey: ['report-card'] })
    },
  })
}

/** Export CSV des moyennes au format MASSAR (le téléchargement est laissé à l'application). */
export function massarExport(classroomId: number, term: string, subject: string) {
  return apiBlob('/exports/massar', { classroomId, term, subject })
}
