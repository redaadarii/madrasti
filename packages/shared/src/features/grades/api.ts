import { api } from '../../http'

export interface Grade {
  id: number
  studentId: number
  subject: string
  title: string
  score: number
  maxScore: number
  term: string
  createdAt: string
}

export type GradeInput = Omit<Grade, 'id' | 'createdAt'>

export const gradesApi = {
  forStudent: (studentId: number) => api<Grade[]>('/grades', { query: { studentId } }),
  create: (input: GradeInput) => api<Grade>('/grades', { method: 'POST', body: input }),
  remove: (id: number) => api<void>(`/grades/${id}`, { method: 'DELETE' }),
}
