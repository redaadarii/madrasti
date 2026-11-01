import { api } from '../../http'
import type { Page } from '../../types'

export interface Student {
  id: number
  registrationNumber: string
  firstName: string
  lastName: string
  birthDate: string | null
  massarCode: string | null
  classroomId: number
  classroomName: string
  schoolName: string
  parentId: number | null
  parentName: string | null
  accountId: number | null
  accountEmail: string | null
}

export interface StudentFilters {
  q?: string
  classroomId?: number
  page: number
  size?: number
}

export interface StudentInput {
  registrationNumber: string
  firstName: string
  lastName: string
  birthDate?: string
  massarCode?: string
  classroomId: number
  parentId?: number
  accountId?: number
}

export const studentsApi = {
  search: ({ q, classroomId, page, size = 10 }: StudentFilters) =>
    api<Page<Student>>('/students', { query: { q, classroomId, page, size } }),
  mine: () => api<Student[]>('/students/mine'),
  me: () => api<Student>('/students/me'),
  get: (id: number) => api<Student>(`/students/${id}`),
  save: (input: StudentInput, id?: number) =>
    id
      ? api<Student>(`/students/${id}`, { method: 'PUT', body: input })
      : api<Student>('/students', { method: 'POST', body: input }),
  remove: (id: number) => api<void>(`/students/${id}`, { method: 'DELETE' }),
}
