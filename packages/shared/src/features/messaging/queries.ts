import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagingApi } from './api'

export const messagingKeys = {
  all: ['messaging'] as const,
  inbox: () => [...messagingKeys.all, 'inbox'] as const,
  unread: () => [...messagingKeys.all, 'unread'] as const,
  contacts: (q: string) => [...messagingKeys.all, 'contacts', q] as const,
  thread: (id: number) => [...messagingKeys.all, 'thread', id] as const,
}

// Filet de sécurité : les nouveaux messages arrivent surtout par le flux temps réel des notifications.
const POLL_MS = 60_000

export const inboxQueryOptions = queryOptions({ queryKey: messagingKeys.inbox(), queryFn: messagingApi.inbox, refetchInterval: POLL_MS })

export const unreadCountQueryOptions = queryOptions({
  queryKey: messagingKeys.unread(),
  queryFn: messagingApi.unreadCount,
  refetchInterval: POLL_MS,
  select: (data) => data.count,
})

export const contactsQueryOptions = (q: string) =>
  queryOptions({ queryKey: messagingKeys.contacts(q), queryFn: () => messagingApi.contacts(q), staleTime: 60_000 })

/** Lire un fil le marque comme lu côté serveur : on rafraîchit ensuite boîte de réception et compteur. */
export const threadQueryOptions = (id: number) =>
  queryOptions({ queryKey: messagingKeys.thread(id), queryFn: () => messagingApi.read(id), refetchInterval: POLL_MS })

export function useStartConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: messagingApi.start,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagingKeys.inbox() }),
  })
}

export function useReply(conversationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => messagingApi.reply(conversationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.thread(conversationId) })
      queryClient.invalidateQueries({ queryKey: messagingKeys.inbox() })
    },
  })
}
