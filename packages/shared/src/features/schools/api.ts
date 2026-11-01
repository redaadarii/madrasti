import { api } from '../../http'

export interface School {
  id: number
  name: string
  city: string
  address: string | null
  phone: string | null
  email: string | null
}

export type SchoolInput = Omit<School, 'id'>

export const schoolsApi = {
  list: () => api<School[]>('/schools'),
  save: (input: SchoolInput, id?: number) =>
    id ? api<School>(`/schools/${id}`, { method: 'PUT', body: input }) : api<School>('/schools', { method: 'POST', body: input }),
  remove: (id: number) => api<void>(`/schools/${id}`, { method: 'DELETE' }),
}
