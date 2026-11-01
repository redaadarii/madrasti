import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type NotificationType =
  | 'MESSAGE' | 'ANNOUNCEMENT' | 'HOMEWORK' | 'HOMEWORK_REVIEWED' | 'GRADE' | 'ABSENCE'
  | 'COMPLAINT_UPDATED' | 'LIVE_SESSION' | 'QUIZ' | 'RESOURCE' | 'PHOTOS'
  | 'APPOINTMENT' | 'POLL' | 'BEHAVIOR' | 'JUSTIFICATION'

export interface AppNotification {
  id: number
  type: NotificationType
  params: Record<string, string>
  link: string | null
  read: boolean
  createdAt: string
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
}

export const notificationsQueryOptions = queryOptions({
  queryKey: notificationKeys.list(),
  queryFn: () => api<AppNotification[]>('/notifications', { query: { limit: 30 } }),
})

export const unreadNotificationsQueryOptions = queryOptions({
  queryKey: notificationKeys.unread(),
  queryFn: () => api<{ count: number }>('/notifications/unread-count'),
  select: (data) => data.count,
})

function useNotificationMutation<V>(mutationFn: (v: V) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }) })
}

export const useMarkRead = () => useNotificationMutation((id: number) => api<void>(`/notifications/${id}/read`, { method: 'POST' }))

export const useMarkAllRead = () => useNotificationMutation(() => api<void>('/notifications/read-all', { method: 'POST' }))
