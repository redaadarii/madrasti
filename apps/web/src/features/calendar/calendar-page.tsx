import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { STAFF_ROLES } from '@madrasti/shared/types'
import { dateFormat } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'
import { EVENT_KIND_LABELS, type EventKind, eventsQueryOptions, type SchoolEvent, useDeleteEvent } from '@madrasti/shared/features/calendar/api'
import { EventDialog } from './event-dialog'
import { monthGrid, sameDay } from './month'
import { t } from '@/i18n'

const KIND_TONES: Record<EventKind, string> = {
  EVENT: 'bg-secondary text-secondary-foreground',
  EXAM: 'bg-coral/15 text-coral',
  MEETING: 'bg-mint/25 text-mint-foreground',
  HOLIDAY: 'bg-sun/40 text-sun-foreground',
}
const monthTitle = () => dateFormat({ month: 'long', year: 'numeric' })
const dayTitle = () => dateFormat({ weekday: 'long', day: 'numeric', month: 'long' })
const hour = () => dateFormat({ hour: '2-digit', minute: '2-digit' })
const weekday = () => dateFormat({ weekday: 'short' })

export function CalendarPage() {
  const user = useCurrentUser()
  const canEdit = STAFF_ROLES.includes(user.role)
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selected, setSelected] = useState(() => new Date())
  const [creating, setCreating] = useState(false)
  const [today] = useState(() => new Date())
  const remove = useDeleteEvent()

  const days = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const rangeEnd = new Date(days.at(-1)!.getFullYear(), days.at(-1)!.getMonth(), days.at(-1)!.getDate() + 1)
  const { data: events = [] } = useQuery(eventsQueryOptions(days[0], rangeEnd))
  const eventsOn = (day: Date) => events.filter((e) => sameDay(new Date(e.startsAt), day))
  const dayEvents = eventsOn(selected)

  const move = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  return (
    <>
      <PageHeader title={t('Agenda')} description={t('Événements, contrôles, réunions et jours fériés.')}
        actions={canEdit && <Button onClick={() => setCreating(true)}><Plus /> {t('Événement')}</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <Button variant="ghost" size="icon-sm" aria-label={t('Mois précédent')} onClick={() => move(-1)}><ChevronLeft className="rtl:-scale-x-100" /></Button>
            <h2 className="text-lg font-semibold first-letter:uppercase">{monthTitle().format(cursor)}</h2>
            <Button variant="ghost" size="icon-sm" aria-label={t('Mois suivant')} onClick={() => move(1)}><ChevronRight className="rtl:-scale-x-100" /></Button>
          </div>
          <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
            {days.slice(0, 7).map((d) => <div key={d.toISOString()} className="py-2">{weekday().format(d)}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const items = eventsOn(day)
              const outside = day.getMonth() !== cursor.getMonth()
              const isSelected = sameDay(day, selected)
              return (
                <button key={day.toISOString()} type="button" onClick={() => setSelected(day)}
                  aria-label={`${dayTitle().format(day)}, ${t('{{count}} événements', { count: items.length })}`} aria-pressed={isSelected}
                  className={cn('min-h-16 border-e border-b p-1.5 text-start transition-colors hover:bg-muted/60 sm:min-h-24 [&:nth-child(7n)]:border-e-0',
                    outside && 'bg-muted/30 text-muted-foreground', isSelected && 'bg-secondary/60')}>
                  <span className={cn('grid size-6 place-items-center rounded-full text-xs font-semibold',
                    sameDay(day, today) && 'bg-primary text-primary-foreground')}>{day.getDate()}</span>
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {items.slice(0, 2).map((e) => (
                      <p key={e.id} className={cn('truncate rounded px-1 text-[0.68rem] font-medium', KIND_TONES[e.kind])}>{e.title}</p>
                    ))}
                    {items.length > 2 && <p className="px-1 text-[0.68rem] text-muted-foreground">+{items.length - 2}</p>}
                  </div>
                  {items.length > 0 && <span className="mt-1 block size-1.5 rounded-full bg-coral sm:hidden" />}
                </button>
              )
            })}
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle className="first-letter:uppercase">{dayTitle().format(selected)}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dayEvents.length === 0 && <EmptyState icon={CalendarDays} title={t('Rien de prévu ce jour-là')} />}
            {dayEvents.map((event) => (
              <EventItem key={event.id} event={event}
                canDelete={canEdit && (user.role !== 'TEACHER' || event.authorId === user.id)}
                onDelete={() => remove.mutate(event.id, { onSuccess: () => toast.success(t('Événement supprimé')) })} />
            ))}
          </CardContent>
        </Card>
      </div>
      <EventDialog open={creating} onOpenChange={setCreating} day={selected} />
    </>
  )
}

function EventItem({ event, canDelete, onDelete }: { event: SchoolEvent; canDelete: boolean; onDelete: () => void }) {
  const allDay = event.kind === 'HOLIDAY'
  return (
    <article className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Badge className={cn('border-0', KIND_TONES[event.kind])}>{t(EVENT_KIND_LABELS[event.kind])}</Badge>
          <p className="mt-1.5 font-semibold">{event.title}</p>
        </div>
        {canDelete && <Button variant="ghost" size="icon-xs" aria-label={t('Supprimer « {{title}} »', { title: event.title })} onClick={onDelete}><Trash2 /></Button>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {allDay ? t('Toute la journée') : `${hour().format(new Date(event.startsAt))}${event.endsAt ? ` – ${hour().format(new Date(event.endsAt))}` : ''}`}
        {' · '}{event.classroomName ? t('Classe {{name}}', { name: event.classroomName }) : t("Toute l'école")}
      </p>
      {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
    </article>
  )
}
