import { api, apiForm } from '../../http'

export type AbsenceKind = 'ABSENCE' | 'LATE'
export type JustificationStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface Absence {
  id: number
  studentId: number
  studentName: string
  classroomName: string
  day: string
  kind: AbsenceKind
  justified: boolean
  reason: string | null
  justificationStatus: JustificationStatus
  justificationNote: string | null
  justificationFileId: string | null
  justificationFileName: string | null
}

export interface AbsenceInput {
  studentId: number
  day: string
  kind: AbsenceKind
  reason?: string
}

export const attendanceApi = {
  list: (studentId?: number) => api<Absence[]>('/absences', { query: { studentId } }),
  record: (input: AbsenceInput) => api<Absence>('/absences', { method: 'POST', body: input }),
  justify: (id: number, reason: string) => api<Absence>(`/absences/${id}/justify`, { method: 'PATCH', body: { reason } }),
  remove: (id: number) => api<void>(`/absences/${id}`, { method: 'DELETE' }),
  pendingJustifications: () => api<Absence[]>('/absences/justifications'),
  /** {@code file} : un File sur le web ; sur mobile, l'objet { uri, name, type } attendu par React Native. */
  submitJustification: (id: number, note: string, file?: Blob) => {
    const form = new FormData()
    form.append('note', note)
    if (file) form.append('file', file)
    return apiForm<Absence>(`/absences/${id}/justification`, form)
  },
  reviewJustification: (id: number, accepted: boolean) =>
    api<Absence>(`/absences/${id}/justification`, { method: 'PATCH', body: { accepted } }),
}
