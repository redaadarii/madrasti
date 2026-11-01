import { api } from '../../http'

export type LiveProvider = 'JITSI' | 'EXTERNAL'
export type LiveStatus = 'UPCOMING' | 'LIVE' | 'ENDED'

export interface LiveSession {
  id: number
  classroomId: number
  classroomName: string
  teacherId: number
  teacherName: string
  subject: string
  title: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  provider: LiveProvider
  meetingUrl: string
  status: LiveStatus
}

export interface LiveSessionInput {
  classroomId: number
  subject: string
  title: string
  startsAt: string
  durationMinutes: number
  provider: LiveProvider
  meetingUrl?: string
}

export const liveApi = {
  list: () => api<LiveSession[]>('/live-sessions'),
  get: (id: number) => api<LiveSession>(`/live-sessions/${id}`),
  schedule: (input: LiveSessionInput) => api<LiveSession>('/live-sessions', { method: 'POST', body: input }),
  cancel: (id: number) => api<void>(`/live-sessions/${id}`, { method: 'DELETE' }),
}
