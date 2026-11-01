import type { AppNotification } from '@madrasti/shared/features/notifications/api'
import type { Href } from 'expo-router'

/** Liens des notifications (écrits pour le web) traduits en écrans de l'application mobile. */
export function mobileRoute(n: AppNotification): Href | undefined {
  const link = n.link ?? ''
  if (link.startsWith('/messages')) return '/messages'
  if (link.startsWith('/homework')) return '/homework'
  if (link.startsWith('/polls')) return '/polls'
  if (link.startsWith('/appointments')) return '/appointments'
  if (link.startsWith('/behavior')) return '/behavior'
  if (n.type === 'ABSENCE' || n.type === 'JUSTIFICATION') return '/absences'
  if (n.type === 'GRADE') return '/results'
  return undefined
}
