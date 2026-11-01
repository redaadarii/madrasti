import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../http'

export type SmsAudience = 'CLASS_PARENTS' | 'ALL_PARENTS' | 'ALL_TEACHERS'
export type SmsStatus = 'SENT' | 'FAILED' | 'SKIPPED'

export const SMS_AUDIENCE_LABELS: Record<SmsAudience, string> = {
  CLASS_PARENTS: "Parents d'une classe",
  ALL_PARENTS: 'Tous les parents',
  ALL_TEACHERS: 'Tous les enseignants',
}

export const SMS_STATUS_LABELS: Record<SmsStatus, string> = {
  SENT: 'Envoyé',
  FAILED: 'Échec',
  SKIPPED: 'Sans numéro',
}

export interface SmsView {
  id: number
  toPhone: string | null
  recipientName: string
  body: string
  status: SmsStatus
  createdAt: string
}

export interface BroadcastResult {
  sent: number
  skipped: number
  failed: number
}

const smsKeys = { all: ['sms'] as const }

export const smsHistoryQueryOptions = queryOptions({ queryKey: smsKeys.all, queryFn: () => api<SmsView[]>('/sms') })

export function useBroadcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { audience: SmsAudience; classroomId?: number; message: string }) =>
      api<BroadcastResult>('/sms/broadcast', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: smsKeys.all }),
  })
}

/** Un SMS fait 160 caractères (70 si accents hors GSM ou arabe) ; au-delà il est découpé. */
export function smsSegments(text: string) {
  const unicode = /[^\x20-\x7E\n\r£¥èéùìòÇØøÅåΔΦΓΛΩΠΨΣΘΞÆæßÉÄÖÑÜ§¿äöñüà€]/.test(text)
  const single = unicode ? 70 : 160
  const multi = unicode ? 67 : 153
  return text.length <= single ? 1 : Math.ceil(text.length / multi)
}
