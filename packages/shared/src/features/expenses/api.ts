import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type ExpenseCategory = 'SALARIES' | 'SUPPLIES' | 'MAINTENANCE' | 'TRANSPORT' | 'CANTEEN' | 'UTILITIES' | 'OTHER'
export type ExpenseStatus = 'ORDERED' | 'INVOICED' | 'PAID'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SALARIES: 'Salaires',
  SUPPLIES: 'Fournitures',
  MAINTENANCE: 'Entretien',
  TRANSPORT: 'Transport',
  CANTEEN: 'Cantine',
  UTILITIES: 'Eau & électricité',
  OTHER: 'Autre',
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  ORDERED: 'Commandé',
  INVOICED: 'Facturé',
  PAID: 'Payé',
}

export interface Expense {
  id: number
  label: string
  category: ExpenseCategory
  supplier: string | null
  reference: string | null
  amount: number
  status: ExpenseStatus
  orderedOn: string
  paidOn: string | null
}

export type ExpenseInput = Omit<Expense, 'id' | 'status' | 'paidOn'>

export interface FinanceReport {
  year: number
  months: { month: number; income: number; expenses: number; balance: number }[]
  totalIncome: number
  totalExpenses: number
  balance: number
  outstanding: number
  expensesByCategory: Partial<Record<ExpenseCategory, number>>
}

const expenseKeys = {
  all: ['expenses'] as const,
  report: (year: number) => ['finance-report', year] as const,
}

export const expensesQueryOptions = queryOptions({ queryKey: expenseKeys.all, queryFn: () => api<Expense[]>('/expenses') })

export const financeReportQueryOptions = (year: number) =>
  queryOptions({ queryKey: expenseKeys.report(year), queryFn: () => api<FinanceReport>('/finance/report', { query: { year } }) })

function useExpenseMutation<V, D>(mutationFn: (v: V) => Promise<D>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      queryClient.invalidateQueries({ queryKey: ['finance-report'] })
    },
  })
}

export const useSaveExpense = () =>
  useExpenseMutation(({ id, input }: { id?: number; input: ExpenseInput }) =>
    id ? api<Expense>(`/expenses/${id}`, { method: 'PUT', body: input }) : api<Expense>('/expenses', { method: 'POST', body: input }))

export const useMoveExpense = () =>
  useExpenseMutation(({ id, status }: { id: number; status: ExpenseStatus }) =>
    api<Expense>(`/expenses/${id}/status`, { method: 'PUT', body: { status } }))

export const useDeleteExpense = () => useExpenseMutation((id: number) => api<void>(`/expenses/${id}`, { method: 'DELETE' }))
