import { queryOptions } from '@tanstack/react-query'
import { api } from '../../http'

export interface SubjectLine {
  subject: string
  average: number
  classAverage: number
  min: number
  max: number
  gradeCount: number
}

export interface ReportCard {
  studentId: number
  studentName: string
  registrationNumber: string
  classroomName: string
  schoolName: string
  term: string
  subjects: SubjectLine[]
  overallAverage: number | null
  classAverage: number | null
  rank: number | null
  classSize: number
  mention: string | null
  absences: number
  lates: number
  unjustified: number
  councilDecision: string | null
  councilAppreciation: string | null
}

export const reportCardQueryOptions = (studentId: number, term: string) =>
  queryOptions({
    queryKey: ['report-card', studentId, term],
    queryFn: () => api<ReportCard>(`/students/${studentId}/report-card`, { query: { term } }),
  })
