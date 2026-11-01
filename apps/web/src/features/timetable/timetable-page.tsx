import { useQuery } from '@tanstack/react-query'
import { Clock4, MapPin, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { useFamilyStudent } from '@/features/students/child-picker'
import { subjectTone } from '@/lib/subject-tone'
import { MANAGER_ROLES } from '@madrasti/shared/types'
import { cn } from '@/lib/utils'
import { DAYS, hhmm, type Slot, type TimetableFilter, timetableQueryOptions, useDeleteSlot } from '@madrasti/shared/features/timetable/api'
import { SlotDialog } from './slot-dialog'
import { t } from '@/i18n'

const MINE = 'mine'

export function TimetablePage() {
  const user = useCurrentUser()
  const isManager = MANAGER_ROLES.includes(user.role)
  const family = useFamilyStudent()
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: !family.isFamily })
  const [choice, setChoice] = useState<string>()
  const [adding, setAdding] = useState(false)

  const selection = choice ?? (user.role === 'TEACHER' ? MINE : classrooms[0] ? String(classrooms[0].id) : undefined)
  const filter: TimetableFilter | undefined = family.isFamily
    ? family.student && { classroomId: family.student.classroomId }
    : selection === MINE ? {} : selection ? { classroomId: Number(selection) } : undefined
  const { data: slots = [] } = useQuery({ ...timetableQueryOptions(filter ?? {}), enabled: !!filter })
  const showClass = selection === MINE && !family.isFamily

  return (
    <>
      <PageHeader
        title={t('Emploi du temps')}
        description={family.student ? `${t('Semaine type')} · ${family.student.classroomName}` : t('Semaine type par classe ou par enseignant.')}
        actions={
          <>
            {family.picker}
            {!family.isFamily && (
              <NativeSelect aria-label={t('Emploi du temps affiché')} value={selection ?? ''} onChange={(e) => setChoice(e.target.value)}>
                {user.role === 'TEACHER' && <NativeSelectOption value={MINE}>{t('Mon planning')}</NativeSelectOption>}
                {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{t('Classe {{name}}', { name: c.name })}</NativeSelectOption>)}
              </NativeSelect>
            )}
            {isManager && <Button onClick={() => setAdding(true)}><Plus /> {t('Créneau')}</Button>}
          </>
        }
      />
      {slots.length === 0 ? (
        <EmptyState icon={Clock4} title={t('Aucun cours planifié')} />
      ) : (
        <WeekGrid slots={slots} showClass={showClass} canDelete={isManager} />
      )}
      <SlotDialog open={adding} onOpenChange={setAdding} classroomId={filter?.classroomId} />
    </>
  )
}

function WeekGrid({ slots, showClass, canDelete }: { slots: Slot[]; showClass: boolean; canDelete: boolean }) {
  const remove = useDeleteSlot()
  const [today] = useState(() => ((new Date().getDay() + 6) % 7) + 1)
  const days = slots.some((s) => s.dayOfWeek === 6) ? 6 : 5

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:[grid-template-columns:repeat(var(--days),minmax(0,1fr))]"
      style={{ '--days': days } as React.CSSProperties}>
      {DAYS.slice(0, days).map((day, index) => {
        const daySlots = slots.filter((s) => s.dayOfWeek === index + 1)
        const isToday = today === index + 1
        return (
          <section key={day} aria-label={t(day)} className={cn('rounded-2xl border bg-card p-3', isToday && 'ring-2 ring-primary/40')}>
            <h2 className="mb-3 flex items-center justify-between font-sans text-sm font-semibold">
              {t(day)} {isToday && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{t('Aujourd\'hui')}</span>}
            </h2>
            <div className="space-y-2">
              {daySlots.length === 0 && <p className="text-xs text-muted-foreground">{t('Pas de cours')}</p>}
              {daySlots.map((slot) => (
                <article key={slot.id} className={cn('group relative rounded-xl border-s-4 p-2.5 text-sm', subjectTone(slot.subject))}>
                  <p className="text-xs font-medium text-muted-foreground tabular-nums">{hhmm(slot.startTime)} – {hhmm(slot.endTime)}</p>
                  <p className="font-semibold">{slot.subject}</p>
                  <p className="text-xs text-muted-foreground">{showClass ? slot.classroomName : slot.teacherName ?? '—'}</p>
                  {slot.room && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {slot.room}</p>}
                  {canDelete && (
                    <Button variant="ghost" size="icon-xs" className="absolute top-1.5 end-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={t('Supprimer {{subject}} du {{day}} {{time}}', { subject: slot.subject, day: t(day), time: hhmm(slot.startTime) })}
                      onClick={() => remove.mutate(slot.id, { onSuccess: () => toast.success(t('Créneau supprimé')) })}>
                      <Trash2 />
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
