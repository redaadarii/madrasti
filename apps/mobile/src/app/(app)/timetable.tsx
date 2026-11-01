import { useQuery } from '@tanstack/react-query'
import { DAYS, hhmm, timetableQueryOptions } from '@madrasti/shared/features/timetable/api'
import { Card, ChildPicker, EmptyState, Label, ListRow, Loading, Screen, Section } from '@/components/ui'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'

export default function TimetableScreen() {
  const { student } = useFamily()
  const { data: slots, isPending } = useQuery({ ...timetableQueryOptions({ classroomId: student?.classroomId }), enabled: !!student })
  if (!student || isPending) return <Loading />
  if (!slots?.length) return <Screen><ChildPicker /><EmptyState icon="time-outline" title={t('Aucun cours planifié')} /></Screen>
  // Lundi = 1 … samedi = 6 ; aujourd'hui en premier.
  const today = new Date().getDay()
  const days = DAYS.map((label, i) => ({ day: i + 1, label })).filter((d) => slots.some((s) => s.dayOfWeek === d.day))
  days.sort((a, b) => ((a.day - today + 7) % 7) - ((b.day - today + 7) % 7))
  return (
    <Screen>
      <ChildPicker />
      {days.map(({ day, label }) => {
        const list = slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
        return (
          <Section key={day} title={day === today ? `${t(label)} · ${t('Aujourd\'hui')}` : t(label)}>
            <Card style={{ paddingVertical: 4 }}>
              {list.map((s, i) => (
                <ListRow key={s.id} icon="book-outline" title={s.subject} last={i === list.length - 1}
                  subtitle={[s.teacherName, s.room].filter(Boolean).join(' · ')}
                  trailing={<Label style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{hhmm(s.startTime)}–{hhmm(s.endTime)}</Label>} />
              ))}
            </Card>
          </Section>
        )
      })}
    </Screen>
  )
}
