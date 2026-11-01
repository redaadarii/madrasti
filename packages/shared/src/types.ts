export type Role = 'ADMIN' | 'DIRECTOR' | 'TEACHER' | 'PARENT' | 'STUDENT'

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  DIRECTOR: 'Direction',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STUDENT: 'Élève',
}

export const STAFF_ROLES: Role[] = ['ADMIN', 'DIRECTOR', 'TEACHER']
export const MANAGER_ROLES: Role[] = ['ADMIN', 'DIRECTOR']
