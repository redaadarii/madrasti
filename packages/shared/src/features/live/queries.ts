import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { type LiveSessionInput, liveApi } from './api'

export const liveKeys = {
  all: ['live-sessions'] as const,
  detail: (id: number) => [...liveKeys.all, id] as const,
}

// Le statut (à venir / en direct / terminé) évolue avec l'heure : on rafraîchit chaque minute.
export const liveSessionsQueryOptions = queryOptions({
  queryKey: liveKeys.all,
  queryFn: liveApi.list,
  refetchInterval: 60_000,
})

export const liveSessionQueryOptions = (id: number) =>
  queryOptions({ queryKey: liveKeys.detail(id), queryFn: () => liveApi.get(id) })

export function useScheduleLive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LiveSessionInput) => liveApi.schedule(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: liveKeys.all }),
  })
}

export function useCancelLive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: liveApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: liveKeys.all }),
  })
}
