import { api } from '../../http'

export interface Submission {
  id: number
  assignmentId: number
  studentId: number
  studentName: string
  content: string
  submittedAt: string
  late: boolean
  score: number | null
  feedback: string | null
}

export interface Assignment {
  id: number
  classroomId: number
  classroomName: string
  teacherId: number
  teacherName: string
  subject: string
  title: string
  description: string
  dueDate: string
  createdAt: string
  submissionCount: number
  /** Copie de l'élève consulté (espace élève / parent). */
  submission: Submission | null
}

export interface AssignmentInput {
  classroomId: number
  subject: string
  title: string
  description: string
  dueDate: string
}

export const homeworkApi = {
  list: (params: { classroomId?: number; studentId?: number } = {}) => api<Assignment[]>('/assignments', { query: params }),
  create: (input: AssignmentInput) => api<Assignment>('/assignments', { method: 'POST', body: input }),
  remove: (id: number) => api<void>(`/assignments/${id}`, { method: 'DELETE' }),
  submit: (id: number, content: string) =>
    api<Submission>(`/assignments/${id}/submission`, { method: 'PUT', body: { content } }),
  submissions: (id: number) => api<Submission[]>(`/assignments/${id}/submissions`),
  review: (id: number, review: { score: number; feedback?: string }) =>
    api<Submission>(`/submissions/${id}/review`, { method: 'PUT', body: review }),
}
