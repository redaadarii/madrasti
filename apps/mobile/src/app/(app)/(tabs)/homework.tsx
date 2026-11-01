import { useQuery } from '@tanstack/react-query'
import { assignmentsQueryOptions } from '@madrasti/shared/features/homework/queries'
import { HOMEWORK_STATUS_LABELS, homeworkStatus, todayIso } from '@madrasti/shared/features/homework/status'
import { formatDate } from '@madrasti/shared/format'
import { router } from 'expo-router'
import { Badge, Card, ChildPicker, EmptyState, ListRow, Loading, Screen, Section } from '@/components/ui'
import { HOMEWORK_TONES } from '@/lib/tones'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'

export default function HomeworkScreen() {
  const { student } = useFamily()
  const { data: assignments, isPending } = useQuery({ ...assignmentsQueryOptions({ studentId: student?.id }), enabled: !!student })
  const today = todayIso()
  if (!student || isPending) return <Screen><ChildPicker /><Loading /></Screen>

  const withStatus = (assignments ?? []).map((a) => ({ ...a, status: homeworkStatus(a, today) }))
  const open = withStatus.filter((a) => a.status === 'TODO' || a.status === 'LATE')
  const done = withStatus.filter((a) => a.status === 'SUBMITTED' || a.status === 'REVIEWED')

  const list = (items: typeof withStatus) => (
    <Card style={{ paddingVertical: 4 }}>
      {items.map((a, i) => (
        <ListRow key={a.id} icon="book-outline" tone={HOMEWORK_TONES[a.status]} title={a.title} last={i === items.length - 1}
          subtitle={`${a.subject} · ${t('pour le {{date}}', { date: formatDate(a.dueDate) })}`}
          trailing={<Badge label={a.submission?.score != null ? `${a.submission.score}/20` : t(HOMEWORK_STATUS_LABELS[a.status])} tone={HOMEWORK_TONES[a.status]} />}
          onPress={() => router.push({ pathname: '/homework/[id]', params: { id: a.id } })} />
      ))}
    </Card>
  )

  return (
    <Screen>
      <ChildPicker />
      {withStatus.length === 0 && <EmptyState icon="book-outline" title={t('Aucun devoir')} />}
      {open.length > 0 && <Section title={t('À rendre')}>{list(open)}</Section>}
      {done.length > 0 && <Section title={t('Rendus')}>{list(done)}</Section>}
    </Screen>
  )
}
