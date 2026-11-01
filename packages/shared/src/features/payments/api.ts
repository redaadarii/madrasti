import { api } from '../../http'

export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE'
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'ONLINE'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  TRANSFER: 'Virement',
  CHECK: 'Chèque',
  ONLINE: 'En ligne',
}

/** Moyens saisis au guichet ; « en ligne » n'est posé que par le paiement de la famille. */
export const COUNTER_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'CHECK']

export interface Payment {
  id: number
  studentId: number
  studentName: string
  classroomName: string
  label: string
  amount: number
  dueDate: string
  paidAt: string | null
  method: PaymentMethod | null
  status: PaymentStatus
}

export interface PaymentInput {
  studentId: number
  label: string
  amount: number
  dueDate: string
}

export const paymentsApi = {
  list: () => api<Payment[]>('/payments'),
  forStudent: (studentId: number) => api<Payment[]>(`/payments/student/${studentId}`),
  create: (input: PaymentInput) => api<Payment>('/payments', { method: 'POST', body: input }),
  pay: (id: number, method: PaymentMethod) => api<Payment>(`/payments/${id}/pay`, { method: 'PUT', body: { method } }),
}
