import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/api-client'
import { type AppNotification, notificationKeys, type NotificationType } from '@madrasti/shared/features/notifications/api'
import { describeNotification } from '@madrasti/shared/features/notifications/describe'
import { parseSse } from '@madrasti/shared/features/notifications/sse'

/** Données à rafraîchir quand une notification arrive (en plus de la cloche). */
const REFRESH: Partial<Record<NotificationType, string[][]>> = {
  MESSAGE: [['messaging']],
  ANNOUNCEMENT: [['announcements']],
  HOMEWORK: [['homework']],
  HOMEWORK_REVIEWED: [['homework']],
  GRADE: [['grades']],
  ABSENCE: [['absences']],
  COMPLAINT_UPDATED: [['complaints']],
  LIVE_SESSION: [['live-sessions']],
  QUIZ: [['quizzes']],
  RESOURCE: [['resources']],
  PHOTOS: [['albums']],
}

const MAX_RETRY_MS = 30_000

/**
 * Flux temps réel des notifications (Server-Sent Events lus via fetch, pour envoyer le jeton).
 * Se reconnecte avec un délai croissant ; s'arrête quand le composant est démonté.
 */
export function useNotificationStream(onNavigate: (link: string) => void) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const controller = new AbortController()
    let retry = 1_000
    let timer: ReturnType<typeof setTimeout> | undefined

    const connect = async () => {
      try {
        const response = await fetch('/api/notifications/stream', {
          headers: { ...authHeaders(), Accept: 'text/event-stream' },
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error(`SSE ${response.status}`)
        retry = 1_000
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
        let buffer = ''
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          const parsed = parseSse(buffer + value)
          buffer = parsed.rest
          for (const event of parsed.events) {
            // (Re)connexion : on resynchronise la cloche, rien n'est perdu pendant une coupure.
            if (event.event === 'ready') queryClient.invalidateQueries({ queryKey: notificationKeys.all })
            if (event.event !== 'notification') continue
            const notification = JSON.parse(event.data) as AppNotification
            queryClient.invalidateQueries({ queryKey: notificationKeys.all })
            REFRESH[notification.type]?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
            toast.info(describeNotification(notification), notification.link
              ? { action: { label: '→', onClick: () => onNavigate(notification.link!) } } : undefined)
          }
        }
      } catch {
        if (controller.signal.aborted) return
      }
      if (!controller.signal.aborted) {
        timer = setTimeout(connect, retry)
        retry = Math.min(retry * 2, MAX_RETRY_MS)
      }
    }

    void connect()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [queryClient, onNavigate])
}
