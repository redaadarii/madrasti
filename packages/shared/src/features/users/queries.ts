import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Role } from '../../types'
import { type UserFilters, type UserInput, usersApi } from './api'

export const userKeys = {
  all: ['users'] as const,
  list: (filters: UserFilters) => [...userKeys.all, 'list', filters] as const,
  byRole: (role: Role) => [...userKeys.all, 'role', role] as const,
}

export const usersQueryOptions = (filters: UserFilters) =>
  queryOptions({
    queryKey: userKeys.list(filters),
    queryFn: () => usersApi.search(filters),
    placeholderData: keepPreviousData,
  })

export const usersByRoleQueryOptions = (role: Role) =>
  queryOptions({ queryKey: userKeys.byRole(role), queryFn: () => usersApi.byRole(role), staleTime: 60_000 })

export function useSaveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: UserInput }) =>
      id ? usersApi.update(id, input) : usersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export const useResetPassword = () =>
  useMutation({ mutationFn: ({ id, password }: { id: number; password: string }) => usersApi.resetPassword(id, password) })
