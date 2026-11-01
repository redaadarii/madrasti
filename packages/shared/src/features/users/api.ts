import type { User } from '../auth/api'
import { api } from '../../http'
import type { Page, Role } from '../../types'

export type { User }

export interface UserFilters {
  q?: string
  role?: Role
  page: number
}

export interface UserInput {
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: Role
  schoolId?: number
  active: boolean
  password?: string
}

export const usersApi = {
  search: ({ q, role, page }: UserFilters) =>
    api<Page<User>>('/admin/users', { query: { q, role, page, size: 10 } }),
  byRole: (role: Role) => api<User[]>('/users', { query: { role } }),
  create: (input: UserInput) => api<User>('/admin/users', { method: 'POST', body: input }),
  update: (id: number, input: UserInput) => api<User>(`/admin/users/${id}`, { method: 'PUT', body: input }),
  resetPassword: (id: number, password: string) =>
    api<void>(`/admin/users/${id}/password`, { method: 'PUT', body: { password } }),
  remove: (id: number) => api<void>(`/admin/users/${id}`, { method: 'DELETE' }),
}
