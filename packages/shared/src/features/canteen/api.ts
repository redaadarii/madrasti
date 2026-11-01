import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export interface Menu {
  date: string
  starter: string | null
  mainCourse: string
  side: string | null
  dessert: string | null
  vegetarian: string | null
  allergens: string | null
}

export type MenuInput = Omit<Menu, 'date'>

export interface Week {
  monday: string
  menus: Menu[]
}

const canteenKeys = { all: ['canteen'] as const, week: (date: string) => ['canteen', date] as const }

export const weekQueryOptions = (date: string) =>
  queryOptions({ queryKey: canteenKeys.week(date), queryFn: () => api<Week>('/canteen', { query: { date } }) })

export function useSaveMenu() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ date, input }: { date: string; input: MenuInput }) => api<Menu>(`/canteen/${date}`, { method: 'PUT', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: canteenKeys.all }),
  })
}

export function useDeleteMenu() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (date: string) => api<void>(`/canteen/${date}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: canteenKeys.all }),
  })
}

/** Date ISO (AAAA-MM-JJ) décalée de {@code days} jours, sans dépendre du fuseau. */
export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
