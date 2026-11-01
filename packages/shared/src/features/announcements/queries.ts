import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsApi } from './api'

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (limit: number) => [...announcementKeys.all, limit] as const,
}

export const announcementsQueryOptions = (limit = 50) =>
  queryOptions({ queryKey: announcementKeys.list(limit), queryFn: () => announcementsApi.list(limit) })

export function usePublishAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: announcementsApi.publish,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementKeys.all }),
  })
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: announcementsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementKeys.all }),
  })
}
