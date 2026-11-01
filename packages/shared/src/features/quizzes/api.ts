import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export interface AttemptView {
  score: number
  total: number
  submittedAt: string
}

export interface QuizSummary {
  id: number
  classroomId: number
  classroomName: string
  teacherId: number
  teacherName: string
  subject: string
  title: string
  dueDate: string
  questionCount: number
  attemptCount: number
  averagePercent: number | null
  myAttempt: AttemptView | null
}

export interface QuestionView {
  id: number
  prompt: string
  choices: string[]
  /** Révélé au personnel, ou à l'élève après sa tentative. */
  correctIndex: number | null
  myAnswer: number | null
}

export interface QuizDetail {
  quiz: QuizSummary
  questions: QuestionView[]
}

export interface AttemptResult {
  id: number
  studentId: number
  studentName: string
  score: number
  total: number
  submittedAt: string
}

export interface QuizInput {
  classroomId: number
  subject: string
  title: string
  dueDate: string
  questions: { prompt: string; choices: string[]; correctIndex: number }[]
}

const quizKeys = {
  all: ['quizzes'] as const,
  list: (params: { studentId?: number }) => [...quizKeys.all, 'list', params] as const,
  detail: (id: number) => [...quizKeys.all, 'detail', id] as const,
  results: (id: number) => [...quizKeys.all, 'results', id] as const,
}

export const quizzesQueryOptions = (params: { studentId?: number } = {}) =>
  queryOptions({ queryKey: quizKeys.list(params), queryFn: () => api<QuizSummary[]>('/quizzes', { query: params }) })

export const quizQueryOptions = (id: number) =>
  queryOptions({ queryKey: quizKeys.detail(id), queryFn: () => api<QuizDetail>(`/quizzes/${id}`) })

export const quizResultsQueryOptions = (id: number) =>
  queryOptions({ queryKey: quizKeys.results(id), queryFn: () => api<AttemptResult[]>(`/quizzes/${id}/attempts`) })

function useQuizMutation<V, D>(mutationFn: (v: V) => Promise<D>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: quizKeys.all }) })
}

export const useCreateQuiz = () => useQuizMutation((input: QuizInput) => api<QuizSummary>('/quizzes', { method: 'POST', body: input }))

export const useDeleteQuiz = () => useQuizMutation((id: number) => api<void>(`/quizzes/${id}`, { method: 'DELETE' }))

export const useSubmitQuiz = (id: number) =>
  useQuizMutation((answers: number[]) => api<AttemptView>(`/quizzes/${id}/attempts`, { method: 'POST', body: { answers } }))
