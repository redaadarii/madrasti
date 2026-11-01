import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export interface Book {
  id: number
  title: string
  author: string
  isbn: string | null
  category: string
  copies: number
  available: number
}

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'RETURNED'

export interface Loan {
  id: number
  bookId: number
  bookTitle: string
  studentId: number
  studentName: string
  classroomName: string
  borrowedOn: string
  dueOn: string
  returnedOn: string | null
  status: LoanStatus
}

export interface BookInput {
  title: string
  author: string
  isbn?: string
  category: string
  copies: number
}

const libraryKeys = {
  all: ['library'] as const,
  books: (q: string) => [...libraryKeys.all, 'books', q] as const,
  loans: (studentId?: number) => [...libraryKeys.all, 'loans', studentId ?? 'active'] as const,
}

export const booksQueryOptions = (q: string) =>
  queryOptions({ queryKey: libraryKeys.books(q), queryFn: () => api<Book[]>('/books', { query: { q } }) })

export const loansQueryOptions = (studentId?: number) =>
  queryOptions({ queryKey: libraryKeys.loans(studentId), queryFn: () => api<Loan[]>('/loans', { query: { studentId } }) })

function useLibraryMutation<V, D>(mutationFn: (v: V) => Promise<D>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }) })
}

export const useSaveBook = () =>
  useLibraryMutation(({ id, input }: { id?: number; input: BookInput }) =>
    id ? api<Book>(`/books/${id}`, { method: 'PUT', body: input }) : api<Book>('/books', { method: 'POST', body: input }))

export const useLend = () =>
  useLibraryMutation((input: { bookId: number; studentId: number; days: number }) =>
    api<Loan>('/loans', { method: 'POST', body: input }))

export const useReturnLoan = () => useLibraryMutation((id: number) => api<Loan>(`/loans/${id}/return`, { method: 'PUT' }))
