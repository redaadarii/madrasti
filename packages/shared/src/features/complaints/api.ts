import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type ComplaintCategory = 'PEDAGOGY' | 'ADMINISTRATION' | 'FINANCE' | 'TRANSPORT' | 'CANTEEN' | 'OTHER'
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  PEDAGOGY: 'Pédagogie',
  ADMINISTRATION: 'Administration',
  FINANCE: 'Finance',
  TRANSPORT: 'Transport',
  CANTEEN: 'Cantine',
  OTHER: 'Autre',
}

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: 'Ouverte',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolue',
}

export interface Complaint {
  id: number
  authorId: number
  authorName: string
  studentId: number | null
  studentName: string | null
  category: ComplaintCategory
  subject: string
  body: string
  status: ComplaintStatus
  response: string | null
  createdAt: string
  updatedAt: string
}

const complaintKeys = { all: ['complaints'] as const }

export const complaintsQueryOptions = queryOptions({
  queryKey: complaintKeys.all,
  queryFn: () => api<Complaint[]>('/complaints'),
})

export function useCreateComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { category: ComplaintCategory; subject: string; body: string; studentId?: number }) =>
      api<Complaint>('/complaints', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: complaintKeys.all }),
  })
}

export function useHandleComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; status: ComplaintStatus; response?: string }) =>
      api<Complaint>(`/complaints/${id}`, { method: 'PUT', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: complaintKeys.all }),
  })
}
