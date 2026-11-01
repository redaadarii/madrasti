import { useSuspenseQuery } from '@tanstack/react-query'
import { Clock, Plus, Trash2, Video } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { STAFF_ROLES } from '@madrasti/shared/types'
import { dateFormat } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'
import type { LiveSession, LiveStatus } from '@madrasti/shared/features/live/api'
import { JoinButton } from './join-button'
import { liveSessionsQueryOptions, useCancelLive } from '@madrasti/shared/features/live/queries'
import { ScheduleLiveDialog } from './schedule-live-dialog'
import { t } from '@/i18n'

const SECTIONS: { status: LiveStatus; title: string }[] = [
  { status: 'LIVE', title: 'En direct' },
  { status: 'UPCOMING', title: 'À venir' },
  { status: 'ENDED', title: 'Cette semaine' },
]

const time = () => dateFormat({ weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function LivePage() {
  const user = useCurrentUser()
  const canSchedule = STAFF_ROLES.includes(user.role)
  const { data: sessions } = useSuspenseQuery(liveSessionsQueryOptions)
  const [scheduling, setScheduling] = useState(false)

  return (
    <>
      <PageHeader title={t('Classes en direct')} description={t('Cours en visioconférence avec ta classe.')}
        actions={canSchedule && <Button onClick={() => setScheduling(true)}><Plus /> {t('Planifier un cours')}</Button>} />
      {sessions.length === 0 && <EmptyState icon={Video} title={t('Aucun cours en direct prévu')} />}
      <div className="space-y-8">
        {SECTIONS.map(({ status, title }) => {
          const items = sessions.filter((s) => s.status === status)
          if (items.length === 0) return null
          return (
            <section key={status}>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                {status === 'LIVE' && <span className="size-2.5 animate-pulse rounded-full bg-coral" />} {t(title)}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {(status === 'ENDED' ? [...items].reverse() : items).map((session) => (
                  <LiveCard key={session.id} session={session} canCancel={canSchedule && (user.role !== 'TEACHER' || session.teacherId === user.id)} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <ScheduleLiveDialog open={scheduling} onOpenChange={setScheduling} />
    </>
  )
}

function LiveCard({ session, canCancel }: { session: LiveSession; canCancel: boolean }) {
  const cancel = useCancelLive()
  return (
    <Card className={cn(session.status === 'LIVE' && 'ring-2 ring-coral/50', session.status === 'ENDED' && 'opacity-70')}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl',
            session.status === 'LIVE' ? 'bg-coral text-coral-foreground' : 'bg-secondary text-primary')}>
            <Video className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{session.subject}</Badge>
              <Badge variant="outline">{session.classroomName}</Badge>
              {session.provider === 'EXTERNAL' && <Badge variant="outline">{t('Lien externe')}</Badge>}
            </div>
            <p className="mt-2 font-heading text-lg font-semibold">{session.title}</p>
            <p className="text-sm text-muted-foreground">{session.teacherName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="flex items-center gap-1.5 text-sm first-letter:uppercase">
            <Clock className="size-3.5" /> {time().format(new Date(session.startsAt))} · {t('{{minutes}} min', { minutes: session.durationMinutes })}
          </p>
          <div className="flex items-center gap-1">
            {canCancel && session.status !== 'ENDED' && (
              <Button size="icon-sm" variant="ghost" aria-label={t('Annuler « {{title}} »', { title: session.title })}
                onClick={() => cancel.mutate(session.id, { onSuccess: () => toast.success(t('Cours annulé')) })}>
                <Trash2 />
              </Button>
            )}
            <JoinButton session={session} size="sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
