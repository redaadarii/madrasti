import { useQuery } from '@tanstack/react-query'
import { type AppNotification, notificationsQueryOptions, useMarkAllRead } from '@madrasti/shared/features/notifications/api'
import { describeNotification } from '@madrasti/shared/features/notifications/describe'
import { dateFormat } from '@madrasti/shared/format'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Card, EmptyState, type IconName, ListRow, Loading, Screen } from '@/components/ui'
import { t } from '@/lib/i18n'
import { mobileRoute } from '@/lib/notification-routes'

const ICONS: Partial<Record<AppNotification['type'], IconName>> = {
  MESSAGE: 'chatbubble', ANNOUNCEMENT: 'megaphone', HOMEWORK: 'book', HOMEWORK_REVIEWED: 'checkmark-done', GRADE: 'ribbon',
  ABSENCE: 'calendar-clear', APPOINTMENT: 'calendar', POLL: 'stats-chart', BEHAVIOR: 'sparkles', JUSTIFICATION: 'document-text',
}

export default function NotificationsScreen() {
  const { data: notifications, isPending } = useQuery(notificationsQueryOptions)
  const markAll = useMarkAllRead()
  const when = dateFormat({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const hasUnread = notifications?.some((n) => !n.read)

  // Ouvrir la liste vaut lecture : le badge de l'accueil disparaît.
  useEffect(() => {
    if (hasUnread) markAll.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread])

  if (isPending) return <Loading />
  if (!notifications?.length) return <Screen><EmptyState icon="notifications-off-outline" title={t('Aucune notification')} /></Screen>
  return (
    <Screen>
      <Card style={{ paddingVertical: 4 }}>
        {notifications.map((n, i) => {
          const route = mobileRoute(n)
          return (
            <ListRow key={n.id} icon={ICONS[n.type] ?? 'notifications'} tone={n.read ? 'muted' : 'coral'} title={describeNotification(n)}
              subtitle={when.format(new Date(n.createdAt))} last={i === notifications.length - 1}
              onPress={route ? () => router.push(route) : undefined} />
          )
        })}
      </Card>
    </Screen>
  )
}
