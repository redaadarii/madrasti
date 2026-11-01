import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type AppointmentMode = 'IN_PERSON' | 'VISIO' | 'PHONE'

export const MODE_LABELS: Record<AppointmentMode, string> = {
  IN_PERSON: 'Sur place',
  VISIO: 'Visioconférence',
  PHONE: 'Téléphone',
}

export interface Slot {
  id: number
  teacherId: number
  teacherName: string
  /** Date-heure locale de l'école (sans fuseau). */
  startsAt: string
  durationMinutes: number
  mode: AppointmentMode
  location: string | null
  booked: boolean
  mine: boolean
  parentName: string | null
  studentId: number | null
  studentName: string | null
  classroomName: string | null
  topic: string | null
}

export interface SlotsInput {
  date: string
  startTime: string
  count: number
  durationMinutes: number
  mode: AppointmentMode
  location?: string
}

const appointmentKeys = { all: ['appointments'] as const }

export const slotsQueryOptions = queryOptions({ queryKey: appointmentKeys.all, queryFn: () => api<Slot[]>('/appointments') })

function useSlotMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all }) })
}

export const usePublishSlots = () =>
  useSlotMutation((input: SlotsInput) => api<Slot[]>('/appointments/slots', { method: 'POST', body: input }))
export const useBookSlot = () =>
  useSlotMutation(({ id, studentId, topic }: { id: number; studentId: number; topic?: string }) =>
    api<Slot>(`/appointments/slots/${id}/book`, { method: 'POST', body: { studentId, topic } }))
export const useCancelSlot = () => useSlotMutation((id: number) => api<Slot>(`/appointments/slots/${id}/cancel`, { method: 'POST' }))
export const useDeleteSlot = () => useSlotMutation((id: number) => api<void>(`/appointments/slots/${id}`, { method: 'DELETE' }))

/** Regroupe des créneaux triés par jour (clé AAAA-MM-JJ). */
export function groupByDay<T extends { startsAt: string }>(slots: T[]): [string, T[]][] {
  const days = new Map<string, T[]>()
  for (const slot of slots) {
    const day = slot.startsAt.slice(0, 10)
    days.set(day, [...(days.get(day) ?? []), slot])
  }
  return [...days.entries()]
}
