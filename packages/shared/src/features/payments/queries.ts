import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { type PaymentMethod, paymentsApi } from './api'

export const paymentKeys = {
  all: ['payments'] as const,
  list: () => [...paymentKeys.all, 'list'] as const,
  student: (studentId: number) => [...paymentKeys.all, 'student', studentId] as const,
}

export const paymentsQueryOptions = queryOptions({ queryKey: paymentKeys.list(), queryFn: paymentsApi.list })

export const studentPaymentsQueryOptions = (studentId: number) =>
  queryOptions({ queryKey: paymentKeys.student(studentId), queryFn: () => paymentsApi.forStudent(studentId) })

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  })
}

export function useMarkPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, method }: { id: number; method: PaymentMethod }) => paymentsApi.pay(id, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
