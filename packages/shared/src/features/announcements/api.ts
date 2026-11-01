import { api } from '../../http'

export type Audience = 'ALL' | 'PARENTS' | 'TEACHERS' | 'STUDENTS'

export const AUDIENCE_LABELS: Record<Audience, string> = {
  ALL: 'Tout le monde',
  PARENTS: 'Parents',
  TEACHERS: 'Enseignants',
  STUDENTS: 'Élèves',
}

export interface Announcement {
  id: number
  title: string
  content: string
  audience: Audience
  pinned: boolean
  authorId: number
  authorName: string
  createdAt: string
}

export type AnnouncementInput = Pick<Announcement, 'title' | 'content' | 'audience' | 'pinned'>

export const announcementsApi = {
  list: (limit = 50) => api<Announcement[]>('/announcements', { query: { limit } }),
  publish: (input: AnnouncementInput) => api<Announcement>('/announcements', { method: 'POST', body: input }),
  remove: (id: number) => api<void>(`/announcements/${id}`, { method: 'DELETE' }),
}
