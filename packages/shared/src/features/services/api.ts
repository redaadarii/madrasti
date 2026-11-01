import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentKeys } from '../payments/queries'
import { api } from '../../http'

export type ServiceKind = 'TRANSPORT' | 'CANTEEN' | 'ACTIVITY'

export const SERVICE_KIND_LABELS: Record<ServiceKind, string> = {
  TRANSPORT: 'Transport scolaire',
  CANTEEN: 'Cantine & garde',
  ACTIVITY: 'Activités extra-scolaires',
}

export interface CampusService {
  id: number
  kind: ServiceKind
  name: string
  description: string | null
  schedule: string | null
  monthlyFee: number
  capacity: number | null
  subscribers: number
  active: boolean
  /** Renseigné quand la liste est demandée pour un élève. */
  subscribed: boolean | null
}

export interface ServiceInput {
  kind: ServiceKind
  name: string
  description?: string
  schedule?: string
  monthlyFee: number
  capacity?: number
  active: boolean
}

export interface Subscriber {
  studentId: number
  studentName: string
  classroomName: string
}

const serviceKeys = {
  all: ['services'] as const,
  list: (studentId?: number) => [...serviceKeys.all, 'list', studentId ?? null] as const,
  subscribers: (id: number) => [...serviceKeys.all, 'subscribers', id] as const,
}

export const servicesQueryOptions = (studentId?: number) =>
  queryOptions({ queryKey: serviceKeys.list(studentId), queryFn: () => api<CampusService[]>('/services', { query: { studentId } }) })

export const subscribersQueryOptions = (id: number) =>
  queryOptions({ queryKey: serviceKeys.subscribers(id), queryFn: () => api<Subscriber[]>(`/services/${id}/subscriptions`) })

function useServiceMutation<V, D>(mutationFn: (v: V) => Promise<D>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all })
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
    },
  })
}

export const useSaveService = () =>
  useServiceMutation(({ id, input }: { id?: number; input: ServiceInput }) =>
    id ? api<CampusService>(`/services/${id}`, { method: 'PUT', body: input })
      : api<CampusService>('/services', { method: 'POST', body: input }))

export const useToggleSubscription = () =>
  useServiceMutation(async ({ serviceId, studentId, subscribe }: { serviceId: number; studentId: number; subscribe: boolean }) => {
    if (subscribe) await api<Subscriber>(`/services/${serviceId}/subscriptions`, { method: 'POST', body: { studentId } })
    else await api<void>(`/services/${serviceId}/subscriptions/${studentId}`, { method: 'DELETE' })
  })
