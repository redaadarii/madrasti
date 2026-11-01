import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiForm } from '../../http'

export interface Album {
  id: number
  title: string
  description: string | null
  classroomId: number | null
  classroomName: string | null
  authorName: string
  createdAt: string
  photos: { id: number; fileId: string; caption: string | null }[]
}

const albumKeys = { all: ['albums'] as const }

export const albumsQueryOptions = queryOptions({ queryKey: albumKeys.all, queryFn: () => api<Album[]>('/albums') })

function useAlbumMutation<V, D>(mutationFn: (v: V) => Promise<D>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: albumKeys.all }) })
}

export const useCreateAlbum = () =>
  useAlbumMutation((input: { title: string; description?: string; classroomId?: number }) =>
    api<Album>('/albums', { method: 'POST', body: input }))

export const useUploadPhotos = () =>
  useAlbumMutation(({ albumId, files }: { albumId: number; files: File[] }) => {
    const form = new FormData()
    files.forEach((file) => form.append('files', file))
    return apiForm<Album>(`/albums/${albumId}/photos`, form)
  })

export const useDeletePhoto = () => useAlbumMutation((id: number) => api<void>(`/albums/photos/${id}`, { method: 'DELETE' }))

export const useDeleteAlbum = () => useAlbumMutation((id: number) => api<void>(`/albums/${id}`, { method: 'DELETE' }))
