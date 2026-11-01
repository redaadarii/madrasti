import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { type AssignmentInput, homeworkApi } from './api'

export const homeworkKeys = {
  all: ['homework'] as const,
  list: (params: { classroomId?: number; studentId?: number }) => [...homeworkKeys.all, 'list', params] as const,
  submissions: (assignmentId: number) => [...homeworkKeys.all, 'submissions', assignmentId] as const,
}

export const assignmentsQueryOptions = (params: { classroomId?: number; studentId?: number } = {}) =>
  queryOptions({ queryKey: homeworkKeys.list(params), queryFn: () => homeworkApi.list(params) })

export const submissionsQueryOptions = (assignmentId: number) =>
  queryOptions({ queryKey: homeworkKeys.submissions(assignmentId), queryFn: () => homeworkApi.submissions(assignmentId) })

function useHomeworkMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: homeworkKeys.all }) })
}

export const useCreateAssignment = () => useHomeworkMutation((input: AssignmentInput) => homeworkApi.create(input))

export const useDeleteAssignment = () => useHomeworkMutation(homeworkApi.remove)

export const useSubmitHomework = () =>
  useHomeworkMutation(({ id, content }: { id: number; content: string }) => homeworkApi.submit(id, content))

export const useReviewSubmission = () =>
  useHomeworkMutation(({ id, score, feedback }: { id: number; score: number; feedback?: string }) =>
    homeworkApi.review(id, { score, feedback }))
