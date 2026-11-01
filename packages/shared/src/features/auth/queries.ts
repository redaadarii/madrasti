import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { api } from '../../http'
import { authApi } from './api'

export const meQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: authApi.me,
  staleTime: Infinity,
  retry: false,
})

/** Utilisateur connecté — garanti présent sous les routes protégées (chargé dans beforeLoad). */
export const useCurrentUser = () => useSuspenseQuery(meQueryOptions).data

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    // Le jeton est posé par l'API dans un cookie HttpOnly : seule l'identité est gardée en cache.
    onSuccess: ({ user }) => queryClient.setQueryData(meQueryOptions.queryKey, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return async () => {
    await api<void>('/auth/logout', { method: 'POST' }).catch(() => undefined)
    queryClient.clear()
  }
}
