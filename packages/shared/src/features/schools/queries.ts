import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { type SchoolInput, schoolsApi } from './api'

export const schoolKeys = { all: ['schools'] as const }

export const schoolsQueryOptions = queryOptions({ queryKey: schoolKeys.all, queryFn: schoolsApi.list })

export function useSaveSchool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: SchoolInput }) => schoolsApi.save(input, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolKeys.all }),
  })
}

export function useDeleteSchool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: schoolsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolKeys.all }),
  })
}
