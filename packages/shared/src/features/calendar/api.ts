import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type EventKind = 'EVENT' | 'EXAM' | 'MEETING' | 'HOLIDAY'

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  EVENT: 'Événement',
  EXAM: 'Contrôle',
  MEETING: 'Réunion',
  HOLIDAY: 'Vacances / férié',
}

export interface SchoolEvent {
  id: number
  title: string
  description: string | null
  kind: EventKind
  startsAt: string
  endsAt: string | null
  classroomId: number | null
  classroomName: string | null
  authorId: number
  authorName: string
}

export interface EventInput {
  title: string
  description?: string
  kind: EventKind
  startsAt: string
  endsAt?: string
  classroomId?: number
}

const eventKeys = {
  all: ['events'] as const,
  range: (from: string, to: string) => [...eventKeys.all, from, to] as const,
}

export const eventsQueryOptions = (from: Date, to: Date) =>
  queryOptions({
    queryKey: eventKeys.range(from.toISOString(), to.toISOString()),
    queryFn: () => api<SchoolEvent[]>('/events', { query: { from: from.toISOString(), to: to.toISOString() } }),
  })

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EventInput) => api<SchoolEvent>('/events', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
  })
}
