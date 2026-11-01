import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Baby } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { absencesQueryOptions } from '@madrasti/shared/features/attendance/queries'
import { studentGradesQueryOptions } from '@madrasti/shared/features/grades/queries'
import { studentPaymentsQueryOptions } from '@madrasti/shared/features/payments/queries'
import type { Student } from '@madrasti/shared/features/students/api'
import { myChildrenQueryOptions } from '@madrasti/shared/features/students/queries'
import { formatCurrency, initials, scoreOutOf20 } from '@madrasti/shared/format'
import { AnnouncementsCard } from './dashboard-page'
import { t } from '@/i18n'

export function FamilyDashboard() {
  const { data: children } = useSuspenseQuery(myChildrenQueryOptions)

  return (
    <>
      <PageHeader title={t('Mes enfants')} description={t('Suivez la scolarité de vos enfants au quotidien.')} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {children.length === 0 ? (
            <EmptyState icon={Baby} title={t('Aucun enfant rattaché')}>{t("Contactez l'administration de l'école.")}</EmptyState>
          ) : (
            children.map((child) => <ChildCard key={child.id} child={child} />)
          )}
        </div>
        <AnnouncementsCard />
      </div>
    </>
  )
}

function ChildCard({ child }: { child: Student }) {
  const { data: grades = [] } = useQuery(studentGradesQueryOptions(child.id))
  const { data: absences = [] } = useQuery(absencesQueryOptions(child.id))
  const { data: payments = [] } = useQuery(studentPaymentsQueryOptions(child.id))

  const average = grades.length
    ? grades.reduce((sum, g) => sum + scoreOutOf20(g.score, g.maxScore), 0) / grades.length
    : null
  const due = payments.filter((p) => p.status !== 'PAID').reduce((sum, p) => sum + p.amount, 0)

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-secondary text-lg font-semibold text-primary">
              {initials(child.firstName, child.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-xl font-semibold">{child.firstName} {child.lastName}</p>
            <p className="text-sm text-muted-foreground">{child.classroomName} · {child.schoolName}</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div><dt className="text-xs text-muted-foreground">{t('Moyenne')}</dt><dd className="font-semibold">{average?.toFixed(2) ?? '—'}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t('Absences')}</dt><dd className="font-semibold">{absences.length}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t('À régler')}</dt><dd className="font-semibold">{formatCurrency(due)}</dd></div>
        </dl>
        <Link to="/students/$studentId" params={{ studentId: child.id }} aria-label={t('Voir le détail de {{name}}', { name: child.firstName })}
          className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/85">
          <ArrowRight className="rtl:-scale-x-100 size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
