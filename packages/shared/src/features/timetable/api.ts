import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export interface Slot {
  id: number
  classroomId: number
  classroomName: string
  teacherId: number | null
  teacherName: string | null
  dayOfWeek: number
  startTime: string
  endTime: string
  subject: string
  room: string | null
}

export interface SlotInput {
  classroomId: number
  teacherId?: number
  dayOfWeek: number
  startTime: string
  endTime: string
  subject: string
  room?: string
}

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export type TimetableFilter = { classroomId?: number; teacherId?: number }

const timetableKeys = {
  all: ['timetable'] as const,
  list: (filter: TimetableFilter) => [...timetableKeys.all, filter] as const,
}

export const timetableQueryOptions = (filter: TimetableFilter) =>
  queryOptions({ queryKey: timetableKeys.list(filter), queryFn: () => api<Slot[]>('/timetable', { query: filter }) })

export function useCreateSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SlotInput) => api<Slot>('/timetable', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
  })
}

export function useDeleteSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/timetable/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
  })
}

/** « 08:30:00 » → « 08:30 » */
export const hhmm = (time: string) => time.slice(0, 5)
