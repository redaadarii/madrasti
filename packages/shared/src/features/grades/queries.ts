import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { gradesApi } from './api'

export const gradeKeys = {
  all: ['grades'] as const,
  student: (studentId: number) => [...gradeKeys.all, studentId] as const,
}

export const studentGradesQueryOptions = (studentId: number) =>
  queryOptions({ queryKey: gradeKeys.student(studentId), queryFn: () => gradesApi.forStudent(studentId) })

export function useCreateGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gradesApi.create,
    onSuccess: (grade) => queryClient.invalidateQueries({ queryKey: gradeKeys.student(grade.studentId) }),
  })
}

export function useDeleteGrade(studentId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gradesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gradeKeys.student(studentId) }),
  })
}
