import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Audience } from '../announcements/api'
import { api } from '../../http'

export interface PollOption {
  id: number
  label: string
  /** null tant que les résultats sont masqués (pas encore répondu). */
  votes: number | null
}

export interface Poll {
  id: number
  question: string
  audience: Audience
  closesOn: string | null
  open: boolean
  authorName: string | null
  canManage: boolean
  myChoice: number | null
  totalVotes: number | null
  options: PollOption[]
}

export interface PollInput {
  question: string
  audience: Audience
  closesOn?: string
  options: string[]
}

const pollKeys = { all: ['polls'] as const }

export const pollsQueryOptions = queryOptions({ queryKey: pollKeys.all, queryFn: () => api<Poll[]>('/polls') })

function usePollMutation<TVariables, TData>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: pollKeys.all }) })
}

export const useCreatePoll = () => usePollMutation((input: PollInput) => api<Poll>('/polls', { method: 'POST', body: input }))
export const useVote = () =>
  usePollMutation(({ pollId, optionId }: { pollId: number; optionId: number }) =>
    api<Poll>(`/polls/${pollId}/vote`, { method: 'POST', body: { optionId } }))
export const useClosePoll = () => usePollMutation((id: number) => api<Poll>(`/polls/${id}/close`, { method: 'POST' }))
export const useDeletePoll = () => usePollMutation((id: number) => api<void>(`/polls/${id}`, { method: 'DELETE' }))
