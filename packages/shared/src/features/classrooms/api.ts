import { api } from '../../http'

export interface Classroom {
  id: number
  schoolId: number
  schoolName: string
  name: string
  level: string
  academicYear: string
  mainTeacherId: number | null
  mainTeacherName: string | null
  studentCount: number
}

export interface ClassroomInput {
  schoolId: number
  name: string
  level: string
  academicYear: string
  mainTeacherId?: number
}

export const classroomsApi = {
  list: () => api<Classroom[]>('/classrooms'),
  save: (input: ClassroomInput, id?: number) =>
    id
      ? api<Classroom>(`/classrooms/${id}`, { method: 'PUT', body: input })
      : api<Classroom>('/classrooms', { method: 'POST', body: input }),
  remove: (id: number) => api<void>(`/classrooms/${id}`, { method: 'DELETE' }),
}
