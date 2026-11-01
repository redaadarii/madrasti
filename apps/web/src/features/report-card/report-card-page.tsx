import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { reportCardQueryOptions } from '@madrasti/shared/features/report-card/api'
import { CompetencyReport } from '@/features/competencies/competency-report'
import { t } from '@/i18n'

const TERMS = ['T1', 'T2', 'T3']
const fmt = (value: number | null) => (value == null ? '—' : value.toFixed(2))

/** Bulletin trimestriel, mis en page pour l'impression (Ctrl + P ou bouton « Imprimer »). */
export function ReportCardPage() {
  const { studentId } = useParams({ from: '/app/students/$studentId/report-card' })
  const [term, setTerm] = useState('T1')
  const { data: card, isPending } = useQuery(reportCardQueryOptions(studentId, term))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/students/$studentId" params={{ studentId }} />}>
          <ArrowLeft className="rtl:-scale-x-100" /> {t('Fiche élève')}
        </Button>
        <div className="flex items-center gap-2">
          <Tabs value={term} onValueChange={(v) => setTerm(v as string)}>
            <TabsList>{TERMS.map((term) => <TabsTrigger key={term} value={term}>{t('Trimestre {{n}}', { n: term.slice(1) })}</TabsTrigger>)}</TabsList>
          </Tabs>
          <Button onClick={() => window.print()}><Printer /> {t('Imprimer')}</Button>
        </div>
      </div>

      {isPending || !card ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <article className="rounded-3xl border bg-card p-6 sm:p-10 print:rounded-none print:border-0 print:p-0">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
            <div>
              <Logo />
              <p className="mt-2 text-sm text-muted-foreground">{card.schoolName}</p>
            </div>
            <div className="text-end">
              <h1 className="text-3xl font-semibold">{t('Bulletin')} — {t('Trimestre {{n}}', { n: card.term.slice(1) })}</h1>
              <p className="text-sm text-muted-foreground">{t('Année scolaire {{year}}', { year: '2026-2027' })}</p>
            </div>
          </header>

          <section className="grid gap-4 py-6 sm:grid-cols-4">
            <Info label={t('Élève')} value={card.studentName} />
            <Info label={t('Matricule')} value={card.registrationNumber} />
            <Info label={t('Classe')} value={card.classroomName} />
            <Info label={t('Effectif')} value={t('{{count}} élèves', { count: card.classSize })} />
          </section>

          {card.subjects.length === 0 ? (
            <p className="rounded-xl bg-muted p-6 text-center text-muted-foreground">{t('Aucune note saisie pour ce trimestre.')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Matière')}</TableHead>
                  <TableHead className="text-end">{t('Moyenne')}</TableHead>
                  <TableHead className="text-end">{t('Classe')}</TableHead>
                  <TableHead className="text-end">{t('Min')}</TableHead>
                  <TableHead className="text-end">{t('Max')}</TableHead>
                  <TableHead className="text-end">{t('Notes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {card.subjects.map((line) => (
                  <TableRow key={line.subject}>
                    <TableCell className="font-medium">{line.subject}</TableCell>
                    <TableCell className={cn('text-end font-semibold tabular-nums', line.average < 10 && 'text-destructive')}>{fmt(line.average)}</TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">{fmt(line.classAverage)}</TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">{fmt(line.min)}</TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">{fmt(line.max)}</TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">{line.gradeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <Highlight label={t('Moyenne générale')} value={`${fmt(card.overallAverage)} / 20`} hint={`${t('Classe')} : ${fmt(card.classAverage)}`} />
            <Highlight label={t('Rang')} value={card.rank ? `${card.rank} / ${card.classSize}` : '—'} />
            <Highlight label={t('Assiduité')} value={t('{{absences}} abs. · {{lates}} ret.', { absences: card.absences, lates: card.lates })} hint={t('{{count}} non justifiées', { count: card.unjustified })} />
          </section>

          <CompetencyReport studentId={card.studentId} term={card.term} />

          {(card.councilDecision || card.councilAppreciation) && (
            <section className="mt-6 rounded-2xl border p-4">
              <p className="text-xs text-muted-foreground uppercase">{t('Conseil de classe')}</p>
              {card.councilDecision && <p className="mt-1 font-heading text-lg font-semibold">{card.councilDecision}</p>}
              {card.councilAppreciation && <p className="mt-1 text-sm italic">« {card.councilAppreciation} »</p>}
            </section>
          )}

          {card.mention && (
            <p className="mt-6 rounded-2xl bg-secondary/60 p-4 text-center font-heading text-xl font-semibold text-secondary-foreground">
              {card.mention}
            </p>
          )}

          <footer className="mt-10 grid grid-cols-2 gap-8 text-sm text-muted-foreground">
            <p className="border-t pt-2">{t('Le professeur principal')}</p>
            <p className="border-t pt-2 text-end">{t('La direction')}</p>
          </footer>
        </article>
      )}
    </div>
  )
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div><p className="text-xs text-muted-foreground uppercase">{label}</p><p className="font-semibold">{value}</p></div>
)

const Highlight = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl border p-4 text-center">
    <p className="text-xs text-muted-foreground uppercase">{label}</p>
    <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
)
