import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { classroomKeys } from '../classrooms/queries'
import { type StudentFilters, type StudentInput, studentsApi } from './api'

export const studentKeys = {
  all: ['students'] as const,
  list: (filters: StudentFilters) => [...studentKeys.all, 'list', filters] as const,
  mine: () => [...studentKeys.all, 'mine'] as const,
  me: () => [...studentKeys.all, 'me'] as const,
  detail: (id: number) => [...studentKeys.all, 'detail', id] as const,
}

export const studentsQueryOptions = (filters: StudentFilters) =>
  queryOptions({
    queryKey: studentKeys.list(filters),
    queryFn: () => studentsApi.search(filters),
    placeholderData: keepPreviousData,
  })

export const myChildrenQueryOptions = queryOptions({ queryKey: studentKeys.mine(), queryFn: studentsApi.mine })

/** Fiche de l'élève connecté (espace élève). */
export const myProfileQueryOptions = queryOptions({ queryKey: studentKeys.me(), queryFn: studentsApi.me, staleTime: 5 * 60_000 })

export const studentQueryOptions = (id: number) =>
  queryOptions({ queryKey: studentKeys.detail(id), queryFn: () => studentsApi.get(id) })

export function useSaveStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: StudentInput }) => studentsApi.save(input, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all })
      queryClient.invalidateQueries({ queryKey: classroomKeys.all })
    },
  })
}

export function useDeleteStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: studentsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  })
}
