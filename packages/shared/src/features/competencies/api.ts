import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type Mastery = 'NOT_ACQUIRED' | 'IN_PROGRESS' | 'ACQUIRED' | 'EXCEEDED'

/** Échelle dans l'ordre de progression : un clic sur une case passe au niveau suivant. */
export const MASTERY_LEVELS: { value: Mastery; label: string; short: string; className: string }[] = [
  { value: 'NOT_ACQUIRED', label: 'Non acquis', short: 'NA', className: 'bg-destructive/15 text-destructive' },
  { value: 'IN_PROGRESS', label: 'En cours d\'acquisition', short: 'EC', className: 'bg-sun/40 text-sun-foreground' },
  { value: 'ACQUIRED', label: 'Acquis', short: 'A', className: 'bg-mint/30 text-mint-foreground dark:text-mint' },
  { value: 'EXCEEDED', label: 'Dépassé', short: 'D+', className: 'bg-primary/15 text-primary' },
]

export const masteryInfo = (mastery: Mastery) => MASTERY_LEVELS.find((m) => m.value === mastery)!

/** Niveau suivant dans le cycle vide → NA → EC → A → D+ → vide. */
export function nextMastery(current: Mastery | undefined): Mastery | null {
  if (!current) return MASTERY_LEVELS[0].value
  const index = MASTERY_LEVELS.findIndex((m) => m.value === current)
  return index === MASTERY_LEVELS.length - 1 ? null : MASTERY_LEVELS[index + 1].value
}

export interface Competency {
  id: number
  subject: string
  label: string
  level: string | null
}

export interface ClassroomGrid {
  competencies: Competency[]
  students: { studentId: number; studentName: string; levels: Record<string, Mastery> }[]
}

export interface SubjectBlock {
  subject: string
  competencies: { id: number; label: string; mastery: Mastery }[]
}

const competencyKeys = {
  all: ['competencies'] as const,
  grid: (classroomId: number, term: string) => [...competencyKeys.all, 'grid', classroomId, term] as const,
  student: (studentId: number, term: string) => [...competencyKeys.all, 'student', studentId, term] as const,
}

export const gridQueryOptions = (classroomId: number, term: string) =>
  queryOptions({
    queryKey: competencyKeys.grid(classroomId, term),
    queryFn: () => api<ClassroomGrid>(`/competencies/classrooms/${classroomId}`, { query: { term } }),
  })

export const studentCompetenciesQueryOptions = (studentId: number, term: string) =>
  queryOptions({
    queryKey: competencyKeys.student(studentId, term),
    queryFn: () => api<SubjectBlock[]>(`/competencies/students/${studentId}`, { query: { term } }),
  })

/** Saisie optimiste : la case change tout de suite, et revient en arrière si l'API refuse. */
export function useAssess(classroomId: number, term: string) {
  const queryClient = useQueryClient()
  const key = competencyKeys.grid(classroomId, term)
  return useMutation({
    mutationFn: (input: { studentId: number; competencyId: number; mastery: Mastery | null }) =>
      api<void>('/competencies/assessments', { method: 'PUT', body: { ...input, term } }),
    onMutate: async ({ studentId, competencyId, mastery }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ClassroomGrid>(key)
      queryClient.setQueryData<ClassroomGrid>(key, (grid) => grid && {
        ...grid,
        students: grid.students.map((s) => {
          if (s.studentId !== studentId) return s
          const levels = { ...s.levels }
          if (mastery) levels[competencyId] = mastery
          else delete levels[competencyId]
          return { ...s, levels }
        }),
      })
      return { previous }
    },
    onError: (_error, _input, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: competencyKeys.all }),
  })
}

export function useCreateCompetency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { subject: string; label: string; level?: string }) =>
      api<Competency>('/competencies', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: competencyKeys.all }),
  })
}
