import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type AdmissionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface PreRegistration {
  id: number
  childFirstName: string
  childLastName: string
  birthDate: string
  desiredLevel: string
  parentName: string
  parentEmail: string
  parentPhone: string
  message: string | null
  status: AdmissionStatus
  createdAt: string
}

export type PreRegistrationInput = Omit<PreRegistration, 'id' | 'status' | 'createdAt' | 'message'> & { message?: string }

const admissionKeys = { all: ['admissions'] as const }

export const admissionsQueryOptions = queryOptions({
  queryKey: admissionKeys.all,
  queryFn: () => api<PreRegistration[]>('/pre-registrations'),
})

export const submitPreRegistration = (input: PreRegistrationInput) =>
  api<void>('/public/pre-registrations', { method: 'POST', body: input })

export function useDecideAdmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: AdmissionStatus }) =>
      api<PreRegistration>(`/pre-registrations/${id}/status`, { method: 'PUT', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: admissionKeys.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
