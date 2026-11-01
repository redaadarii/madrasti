import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Bell, CheckCheck } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { t } from '@/i18n'
import { dateFormat } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'
import { notificationsQueryOptions, unreadNotificationsQueryOptions, useMarkAllRead, useMarkRead } from '@madrasti/shared/features/notifications/api'
import { describeNotification } from '@madrasti/shared/features/notifications/describe'
import { useNotificationStream } from './use-notification-stream'

const when = () => dateFormat({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function NotificationBell() {
  const navigate = useNavigate()
  const go = useCallback((link: string) => void navigate({ to: link as never }), [navigate])
  useNotificationStream(go)

  const { data: unread = 0 } = useQuery(unreadNotificationsQueryOptions)
  const { data: notifications = [] } = useQuery(notificationsQueryOptions)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative"
        aria-label={unread > 0 ? t('{{count}} notifications non lues', { count: unread }) : t('Notifications')} />}>
        <Bell />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-coral px-1 text-[0.65rem] font-semibold text-coral-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            {t('Notifications')}
            {unread > 0 && (
              <Button variant="ghost" size="xs" onClick={() => markAll.mutate()}><CheckCheck /> {t('Tout marquer comme lu')}</Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t('Aucune notification')}</p>}
          {notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className="items-start gap-3 py-2.5"
              onClick={() => {
                if (!notification.read) markRead.mutate(notification.id)
                if (notification.link) go(notification.link)
              }}>
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', notification.read ? 'bg-transparent' : 'bg-coral')} />
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm whitespace-normal', !notification.read && 'font-semibold')}>{describeNotification(notification)}</span>
                <span className="text-xs text-muted-foreground">{when().format(new Date(notification.createdAt))}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
