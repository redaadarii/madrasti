import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { HeartHandshake } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { t } from '@/i18n'
import { api } from '@/lib/api-client'
import { dateFormat, formatCurrency } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'

interface Stats {
  subjects: { subject: string; average: number }[]
  distribution: { range: string; students: number }[]
  absences: { month: string; value: number }[]
  collections: { month: string; value: number }[]
  atRisk: { studentId: number; studentName: string; classroomName: string; subject: string; average: number }[]
}

const statsQueryOptions = queryOptions({ queryKey: ['stats'], queryFn: () => api<Stats>('/stats') })
const monthLabel = (ym: string) => dateFormat({ month: 'short' }).format(new Date(`${ym}-01T12:00:00`))

function Bars({ items, format = String, tone = 'bg-primary' }: { items: { label: string; value: number }[]; format?: (v: number) => string; tone?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="flex h-44 items-end gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[0.65rem] font-semibold tabular-nums">{format(item.value)}</span>
          {/* Zone de hauteur fixe : la barre y prend un pourcentage de la hauteur disponible. */}
          <div className="flex w-full flex-1 items-end">
            <div className={cn('w-full rounded-t', tone)} style={{ height: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
          <span className="w-full truncate text-center text-[0.65rem] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export function StatsPage() {
  const { data: stats } = useSuspenseQuery(statsQueryOptions)
  return (
    <>
      <PageHeader title={t('Statistiques')} description={t('Résultats, assiduité et recouvrement en un coup d\'œil.')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('Moyenne par matière')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.subjects.map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm"><span>{s.subject}</span><span className="font-semibold tabular-nums">{s.average.toFixed(2)}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn('h-full rounded-full', s.average < 10 ? 'bg-coral' : 'bg-primary')} style={{ width: `${(s.average / 20) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('Répartition des moyennes générales')}</CardTitle></CardHeader>
          <CardContent><Bars items={stats.distribution.map((d) => ({ label: d.range, value: d.students }))} tone="bg-mint" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('Absences et retards (6 mois)')}</CardTitle></CardHeader>
          <CardContent><Bars items={stats.absences.map((m) => ({ label: monthLabel(m.month), value: m.value }))} tone="bg-coral" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('Encaissements (6 mois)')}</CardTitle></CardHeader>
          <CardContent><Bars items={stats.collections.map((m) => ({ label: monthLabel(m.month), value: m.value }))} format={(v) => (v ? formatCurrency(v) : '0')} /></CardContent>
        </Card>
      </div>
      <Card className="mt-6 gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2"><HeartHandshake className="size-4 text-coral" /> {t('Élèves à accompagner')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('Moyennes inférieures à 10 : pistes de remédiation ciblée (devoirs, quiz, soutien).')}</p>
        </CardHeader>
        {stats.atRisk.length === 0 ? <div className="p-6"><EmptyState icon={HeartHandshake} title={t('Aucun élève sous la moyenne 🎉')} /></div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('Élève')}</TableHead>
                <TableHead>{t('Classe')}</TableHead>
                <TableHead>{t('Matière')}</TableHead>
                <TableHead className="text-end">{t('Moyenne')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.atRisk.map((row) => (
                <TableRow key={`${row.studentId}-${row.subject}`}>
                  <TableCell className="ps-4">
                    <Link to="/students/$studentId" params={{ studentId: row.studentId }} className="font-medium hover:underline">{row.studentName}</Link>
                  </TableCell>
                  <TableCell>{row.classroomName}</TableCell>
                  <TableCell><Badge variant="outline">{row.subject}</Badge></TableCell>
                  <TableCell className="text-end font-semibold text-destructive tabular-nums">{row.average.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
