import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpenCheck, CalendarX2, TrendingUp, Video } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { absencesQueryOptions } from '@madrasti/shared/features/attendance/queries'
import { studentGradesQueryOptions } from '@madrasti/shared/features/grades/queries'
import { HomeworkStatusBadge } from '@/features/homework/homework-status-badge'
import { assignmentsQueryOptions } from '@madrasti/shared/features/homework/queries'
import { homeworkStatus, todayIso } from '@madrasti/shared/features/homework/status'
import { JoinButton } from '@/features/live/join-button'
import { liveSessionsQueryOptions } from '@madrasti/shared/features/live/queries'
import { myProfileQueryOptions } from '@madrasti/shared/features/students/queries'
import { dateFormat, formatDate, scoreOutOf20 } from '@madrasti/shared/format'
import { AnnouncementsCard } from './dashboard-page'
import { t } from '@/i18n'

const hour = () => dateFormat({ weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function StudentDashboard() {
  const { data: me } = useSuspenseQuery(myProfileQueryOptions)
  const { data: grades = [] } = useQuery(studentGradesQueryOptions(me.id))
  const { data: absences = [] } = useQuery(absencesQueryOptions(me.id))
  const { data: assignments = [] } = useQuery(assignmentsQueryOptions())
  const { data: sessions = [] } = useQuery(liveSessionsQueryOptions)

  const today = todayIso()
  const todo = assignments
    .map((a) => ({ assignment: a, status: homeworkStatus(a, today) }))
    .filter(({ status }) => status === 'TODO' || status === 'LATE')
    .sort((a, b) => a.assignment.dueDate.localeCompare(b.assignment.dueDate))
  const average = grades.length ? grades.reduce((sum, g) => sum + scoreOutOf20(g.score, g.maxScore), 0) / grades.length : null
  const nextSessions = sessions.filter((s) => s.status !== 'ENDED').slice(0, 3)

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-sidebar p-6 text-sidebar-foreground sm:p-8">
        <div aria-hidden className="absolute -top-16 -end-10 size-56 rounded-full bg-coral/30 blur-3xl" />
        <p className="text-sm text-sidebar-foreground/70">{me.classroomName} · {me.schoolName}</p>
        <h1 className="mt-1 text-3xl font-semibold text-sidebar-accent-foreground sm:text-4xl">{t('Salut {{name}} !', { name: me.firstName })} 👋</h1>
        <p className="mt-2 text-sidebar-foreground/80">
          {todo.length === 0 ? t('Aucun devoir en attente, profite-en !') : t('Tu as {{count}} devoirs à rendre.', { count: todo.length })}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('Ma moyenne')} value={average?.toFixed(2) ?? '—'} hint={t('sur 20')} icon={TrendingUp} tone="sun" />
        <StatCard label={t('Devoirs à rendre')} value={todo.length} icon={BookOpenCheck} tone="coral" />
        <StatCard label={t('Absences')} value={absences.length} icon={CalendarX2} tone="mint" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Video className="size-4 text-coral" /> {t('Prochains cours en direct')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {nextSessions.length === 0 && <p className="text-sm text-muted-foreground">{t('Aucun cours en direct prévu.')}</p>}
            {nextSessions.map((session) => (
              <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{session.title}</p>
                  <p className="text-xs text-muted-foreground first-letter:uppercase">
                    {session.status === 'LIVE' ? `🔴 ${t('En direct maintenant')}` : hour().format(new Date(session.startsAt))} · {session.subject}
                  </p>
                </div>
                <JoinButton session={session} size="sm" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpenCheck className="size-4 text-primary" /> {t('Devoirs à faire')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todo.length === 0 ? (
              <EmptyState icon={BookOpenCheck} title={`${t('Tout est rendu')} 🎉`} />
            ) : (
              todo.slice(0, 4).map(({ assignment, status }) => (
                <div key={assignment.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{assignment.title}</p>
                    <p className="text-xs text-muted-foreground">{assignment.subject} · {t('pour le {{date}}', { date: formatDate(assignment.dueDate) })}</p>
                  </div>
                  <HomeworkStatusBadge status={status} />
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full" nativeButton={false} render={<Link to="/homework" />}>
              {t('Tous mes devoirs')} <ArrowRight className="rtl:-scale-x-100" />
            </Button>
          </CardContent>
        </Card>

        <AnnouncementsCard />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('Mes dernières notes')}</CardTitle>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/students/$studentId/report-card" params={{ studentId: me.id }} />}>
            {t('Mon bulletin')} <ArrowRight className="rtl:-scale-x-100" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {grades.slice(0, 8).map((grade) => (
            <Badge key={grade.id} variant="outline" className="h-auto gap-2 py-1.5">
              {grade.subject} <strong>{grade.score}/{grade.maxScore}</strong>
            </Badge>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
