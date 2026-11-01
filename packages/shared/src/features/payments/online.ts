import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'
import type { Payment } from './api'

export interface OnlineSession {
  session: string
  provider: 'simulated' | 'stripe' | 'cmi'
  status: 'PENDING' | 'PAID'
  label: string
  amount: number
  studentName: string
  studentId: number
}

export interface Confirmation {
  status: 'PENDING' | 'PAID'
  studentId: number
  payment: Payment
}

export const onlineProviderQueryOptions = queryOptions({
  queryKey: ['payments', 'online-provider'],
  queryFn: () => api<{ provider: string }>('/payments/online'),
  staleTime: Infinity,
})

export const onlineSessionQueryOptions = (session: string) =>
  queryOptions({ queryKey: ['payments', 'online-session', session], queryFn: () => api<OnlineSession>(`/payments/online/sessions/${session}`) })

export interface CheckoutResponse {
  /** Identifiant de la session chez le prestataire (confirmation au retour, sur mobile). */
  session: string
  redirectUrl: string
  /** CMI : champs signés à poster vers {@code redirectUrl} ; absent pour une simple redirection (Stripe, démo). */
  formFields: Record<string, string> | null
}

/** Ouvre une session de paiement chez le prestataire ; l'application se charge ensuite de la redirection. */
export const startCheckout = (paymentId: number, client?: 'mobile') =>
  api<CheckoutResponse>(`/payments/${paymentId}/checkout`, { method: 'POST', query: { client } })

export const simulatePayment = (session: string) =>
  api<OnlineSession>(`/payments/online/sessions/${session}/simulate`, { method: 'POST' })

export function useConfirmPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (session: string) => api<Confirmation>('/payments/online/confirm', { method: 'POST', body: { session } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  })
}
