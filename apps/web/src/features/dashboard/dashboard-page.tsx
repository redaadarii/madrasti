import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Banknote, BookMarked, CalendarX2, ClipboardList, GraduationCap, MessageSquareWarning, Pin, Sparkles, TrendingUp, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AUDIENCE_LABELS } from '@madrasti/shared/features/announcements/api'
import { announcementsQueryOptions } from '@madrasti/shared/features/announcements/queries'
import { absencesQueryOptions } from '@madrasti/shared/features/attendance/queries'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { FamilyDashboard } from './family-dashboard'
import { StudentDashboard } from './student-dashboard'
import { dashboardQueryOptions } from '@madrasti/shared/features/dashboard/api'
import { formatCurrency, formatDate } from '@madrasti/shared/format'
import { STAFF_ROLES } from '@madrasti/shared/types'
import { t } from '@/i18n'

export function DashboardPage() {
  const user = useCurrentUser()
  if (user.role === 'STUDENT') return <StudentDashboard />
  return STAFF_ROLES.includes(user.role) ? <StaffDashboard /> : <FamilyDashboard />
}

function StaffDashboard() {
  const { data: stats } = useQuery(dashboardQueryOptions)

  return (
    <>
      <PageHeader title={t('Tableau de bord')} description={t("Vue d'ensemble de l'établissement en temps réel.")} />
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('Élèves inscrits')} value={stats.students} icon={GraduationCap} hint={t('{{count}} classes', { count: stats.classrooms })} />
          <StatCard label={t('Équipe & familles')} value={stats.teachers + stats.parents} icon={Users} tone="mint"
            hint={`${t('{{count}} enseignants', { count: stats.teachers })} · ${t('{{count}} parents', { count: stats.parents })}`} />
          <StatCard label={t('Absences (30 j)')} value={stats.absencesLast30Days} icon={CalendarX2} tone="coral"
            hint={t('{{count}} non justifiées', { count: stats.unjustifiedAbsences })} />
          <StatCard label={t('Moyenne générale')} value={stats.averageGrade?.toFixed(2) ?? '—'} icon={TrendingUp} tone="sun" hint={t('sur 20')} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      )}

      {stats && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <QuickLink to="/admissions" icon={ClipboardList} label={t('Pré-inscriptions en attente')} value={stats.pendingPreRegistrations} />
          <QuickLink to="/complaints" icon={MessageSquareWarning} label={t('Réclamations à traiter')} value={stats.openComplaints} />
          <QuickLink to="/library" icon={BookMarked} label={t('Livres empruntés')} value={stats.activeLoans} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {stats && <FinanceCard collected={stats.collected} outstanding={stats.outstanding} />}
        <RecentAbsencesCard />
        <AnnouncementsCard />
      </div>
    </>
  )
}

function QuickLink({ to, icon: Icon, label, value }: { to: '/admissions' | '/complaints' | '/library'; icon: typeof Users; label: string; value: number }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors hover:bg-muted/60">
      <Icon className="size-5 text-primary" />
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className="font-heading text-xl font-semibold tabular-nums">{value}</span>
    </Link>
  )
}

function FinanceCard({ collected, outstanding }: { collected: number; outstanding: number }) {
  const rate = collected + outstanding === 0 ? 0 : Math.round((collected / (collected + outstanding)) * 100)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Banknote className="size-4 text-primary" /> {t('Recouvrement')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-heading text-4xl font-semibold">{rate}%</p>
        <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={rate} aria-label={t('Taux de recouvrement')}>
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-coral" style={{ width: `${rate}%` }} />
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-muted-foreground">{t('Encaissé')}</dt><dd className="font-semibold">{formatCurrency(collected)}</dd></div>
          <div><dt className="text-muted-foreground">{t('Reste à percevoir')}</dt><dd className="font-semibold">{formatCurrency(outstanding)}</dd></div>
        </dl>
      </CardContent>
    </Card>
  )
}

function RecentAbsencesCard() {
  const { data: absences = [] } = useQuery(absencesQueryOptions())
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-coral" /> {t('Dernières absences')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {absences.slice(0, 5).map((absence) => (
            <li key={absence.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <Link to="/students/$studentId" params={{ studentId: absence.studentId }} className="font-medium hover:underline">
                {absence.studentName}
              </Link>
              <span className="text-muted-foreground">{formatDate(absence.day)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function AnnouncementsCard() {
  const { data: announcements } = useSuspenseQuery(announcementsQueryOptions(4))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> {t('Actualités')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.map((announcement) => (
          <article key={announcement.id}>
            <div className="flex items-center gap-2">
              {announcement.pinned && <Pin className="size-3.5 text-coral" aria-label={t('Épinglée')} />}
              <h3 className="font-sans text-sm font-semibold">{announcement.title}</h3>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{announcement.content}</p>
            <Badge variant="outline" className="mt-2">{t(AUDIENCE_LABELS[announcement.audience])}</Badge>
          </article>
        ))}
      </CardContent>
    </Card>
  )
}
