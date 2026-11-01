import { useQuery } from '@tanstack/react-query'
import type { Absence } from '@madrasti/shared/features/attendance/api'
import { absencesQueryOptions } from '@madrasti/shared/features/attendance/queries'
import { formatDate } from '@madrasti/shared/format'
import { router } from 'expo-router'
import { Badge, Card, ChildPicker, EmptyState, ListRow, Loading, Screen, type Tone } from '@/components/ui'
import { useUser } from '@/lib/auth'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'

function status(absence: Absence): { label: string; tone: Tone } {
  if (absence.justified) return { label: t('Justifiée'), tone: 'mint' }
  if (absence.justificationStatus === 'PENDING') return { label: t('Justificatif en attente'), tone: 'sun' }
  if (absence.justificationStatus === 'REJECTED') return { label: t('Justificatif refusé'), tone: 'danger' }
  return { label: t('Non justifiée'), tone: 'danger' }
}

export default function AbsencesScreen() {
  const user = useUser()
  const { student } = useFamily()
  const { data: absences, isPending } = useQuery({ ...absencesQueryOptions(student?.id), enabled: !!student })
  if (!student || isPending) return <Loading />
  const canJustify = (a: Absence) => user.role === 'PARENT' && !a.justified && a.justificationStatus !== 'PENDING'

  return (
    <Screen>
      <ChildPicker />
      {!absences?.length ? <EmptyState icon="happy-outline" title={t('Aucune absence 🎉')} /> : (
        <Card style={{ paddingVertical: 4 }}>
          {absences.map((a, i) => {
            const s = status(a)
            return (
              <ListRow key={a.id} icon={a.kind === 'LATE' ? 'alarm-outline' : 'calendar-clear-outline'} tone={s.tone}
                title={`${a.kind === 'LATE' ? t('Retard') : t('Absence')} · ${formatDate(a.day)}`}
                subtitle={a.reason ?? a.justificationNote ?? (canJustify(a) ? t('Touchez pour justifier') : t('Sans motif'))}
                trailing={<Badge label={s.label} tone={s.tone} />} last={i === absences.length - 1}
                onPress={canJustify(a) ? () => router.push({ pathname: '/absences/[id]', params: { id: a.id } }) : undefined} />
            )
          })}
        </Card>
      )}
    </Screen>
  )
}
