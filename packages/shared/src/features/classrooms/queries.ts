import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ClassroomInput, classroomsApi } from './api'

export const classroomKeys = { all: ['classrooms'] as const }

export const classroomsQueryOptions = queryOptions({ queryKey: classroomKeys.all, queryFn: classroomsApi.list })

export function useSaveClassroom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ClassroomInput }) => classroomsApi.save(input, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classroomKeys.all }),
  })
}

export function useDeleteClassroom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: classroomsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classroomKeys.all }),
  })
}
