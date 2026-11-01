import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiForm } from '../../http'

export type ResourceKind = 'FILE' | 'VIDEO' | 'LINK'

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  FILE: 'Document',
  VIDEO: 'Vidéo',
  LINK: 'Lien',
}

export interface CourseResource {
  id: number
  classroomId: number
  classroomName: string
  teacherId: number
  teacherName: string
  subject: string
  title: string
  description: string | null
  kind: ResourceKind
  url: string | null
  fileId: string | null
  fileName: string | null
  createdAt: string
}

export interface ResourceInput {
  classroomId: number
  subject: string
  title: string
  description?: string
  kind: ResourceKind
  url?: string
  file?: File
}

const resourceKeys = { all: ['resources'] as const }

export const resourcesQueryOptions = queryOptions({ queryKey: resourceKeys.all, queryFn: () => api<CourseResource[]>('/resources') })

function useResourceMutation<V, D>(mutationFn: (v: V) => Promise<D>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: resourceKeys.all }) })
}

export const useCreateResource = () =>
  useResourceMutation((input: ResourceInput) => {
    const form = new FormData()
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== '') form.append(key, value instanceof File ? value : String(value))
    }
    return apiForm<CourseResource>('/resources', form)
  })

export const useDeleteResource = () => useResourceMutation((id: number) => api<void>(`/resources/${id}`, { method: 'DELETE' }))
