import { queryOptions } from '@tanstack/react-query'
import { api } from '../../http'

export interface DashboardStats {
  schools: number
  classrooms: number
  students: number
  teachers: number
  parents: number
  absencesLast30Days: number
  unjustifiedAbsences: number
  averageGrade: number | null
  collected: number
  outstanding: number
  pendingPreRegistrations: number
  openComplaints: number
  activeLoans: number
}

export const dashboardQueryOptions = queryOptions({
  queryKey: ['dashboard'],
  queryFn: () => api<DashboardStats>('/dashboard'),
})
