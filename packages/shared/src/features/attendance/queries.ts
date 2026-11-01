import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { type AbsenceInput, attendanceApi } from './api'

export const absenceKeys = {
  all: ['absences'] as const,
  list: (studentId?: number) => [...absenceKeys.all, studentId ?? 'recent'] as const,
  pending: () => [...absenceKeys.all, 'pending-justifications'] as const,
}

export const absencesQueryOptions = (studentId?: number) =>
  queryOptions({ queryKey: absenceKeys.list(studentId), queryFn: () => attendanceApi.list(studentId) })

function useAbsenceMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: absenceKeys.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useRecordAbsence = () => useAbsenceMutation((input: AbsenceInput) => attendanceApi.record(input))

export const useJustifyAbsence = () =>
  useAbsenceMutation(({ id, reason }: { id: number; reason: string }) => attendanceApi.justify(id, reason))

export const pendingJustificationsQueryOptions = queryOptions({
  queryKey: absenceKeys.pending(),
  queryFn: attendanceApi.pendingJustifications,
})

export const useSubmitJustification = () =>
  useAbsenceMutation(({ id, note, file }: { id: number; note: string; file?: Blob }) =>
    attendanceApi.submitJustification(id, note, file))

export const useReviewJustification = () =>
  useAbsenceMutation(({ id, accepted }: { id: number; accepted: boolean }) => attendanceApi.reviewJustification(id, accepted))

export const useDeleteAbsence = () => useAbsenceMutation(attendanceApi.remove)
