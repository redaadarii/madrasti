import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FileSpreadsheet, Gavel, Save, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { t } from '@/i18n'
import { SUBJECTS } from '@madrasti/shared/subjects'
import { COUNCIL_DECISION_LABELS, type CouncilDecision, councilQueryOptions, type CouncilRow, massarExport, useSaveDecision } from '@madrasti/shared/features/council/api'
import { saveBlob } from '@/lib/files'

const TERMS = ['T1', 'T2', 'T3']

export function CouncilPage() {
  const { data: classrooms = [] } = useQuery(classroomsQueryOptions)
  const [classroomId, setClassroomId] = useState<number>()
  const [term, setTerm] = useState('T1')
  const classroom = classrooms.find((c) => c.id === classroomId) ?? classrooms[0]
  const { data: rows, isPending } = useQuery({ ...councilQueryOptions(classroom?.id ?? 0, term), enabled: !!classroom })

  return (
    <>
      <PageHeader title={t('Conseil de classe')} description={t('Bilan trimestriel : moyennes, rangs, décisions et appréciations reportées sur les bulletins.')}
        actions={
          <NativeSelect aria-label={t('Classe')} value={classroom?.id ?? ''} onChange={(e) => setClassroomId(Number(e.target.value))}>
            {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{t('Classe {{name}}', { name: c.name })}</NativeSelectOption>)}
          </NativeSelect>
        } />
      <Tabs value={term} onValueChange={(v) => setTerm(v as string)} className="mb-4">
        <TabsList>{TERMS.map((tm) => <TabsTrigger key={tm} value={tm}>{t('Trimestre {{n}}', { n: tm.slice(1) })}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
        <Card className="py-0">
          {isPending ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : !rows?.length ? <div className="p-6"><EmptyState icon={Gavel} title={t('Aucun élève dans cette classe')} /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="ps-4">{t('Rang')}</TableHead>
                    <TableHead>{t('Élève')}</TableHead>
                    <TableHead className="text-end">{t('Moyenne')}</TableHead>
                    <TableHead className="text-end">{t('Absences')}</TableHead>
                    <TableHead>{t('Décision')}</TableHead>
                    <TableHead>{t('Appréciation')}</TableHead>
                    <TableHead className="w-12"><span className="sr-only">{t('Enregistrer')}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => <DecisionRow key={`${row.studentId}-${term}`} row={row} term={term} />)}
                </TableBody>
              </Table>
            )}
        </Card>
        {classroom && <MassarCard classroomId={classroom.id} classroomName={classroom.name} term={term} />}
      </div>
    </>
  )
}

function DecisionRow({ row, term }: { row: CouncilRow; term: string }) {
  const save = useSaveDecision()
  const [decision, setDecision] = useState<CouncilDecision | ''>(row.decision ?? row.suggested ?? '')
  const [appreciation, setAppreciation] = useState(row.appreciation ?? '')
  const dirty = decision !== (row.decision ?? '') || appreciation !== (row.appreciation ?? '')

  return (
    <TableRow>
      <TableCell className="ps-4 font-semibold tabular-nums">{row.rank ?? '—'}</TableCell>
      <TableCell>
        <Link to="/students/$studentId" params={{ studentId: row.studentId }} className="font-medium hover:underline">{row.studentName}</Link>
      </TableCell>
      <TableCell className="text-end font-semibold tabular-nums">{row.average?.toFixed(2) ?? '—'}</TableCell>
      <TableCell className="text-end tabular-nums">{row.absences}</TableCell>
      <TableCell>
        <NativeSelect aria-label={t('Décision pour {{name}}', { name: row.studentName })} size="sm" value={decision}
          onChange={(e) => setDecision(e.target.value as CouncilDecision)}>
          <NativeSelectOption value="">—</NativeSelectOption>
          {(Object.keys(COUNCIL_DECISION_LABELS) as CouncilDecision[]).map((d) => (
            <NativeSelectOption key={d} value={d}>{t(COUNCIL_DECISION_LABELS[d])}{d === row.suggested && !row.decision ? ' ✦' : ''}</NativeSelectOption>
          ))}
        </NativeSelect>
      </TableCell>
      <TableCell className="min-w-56">
        <Input aria-label={t('Appréciation pour {{name}}', { name: row.studentName })} value={appreciation} maxLength={500}
          onChange={(e) => setAppreciation(e.target.value)} placeholder={t('Appréciation…')} />
      </TableCell>
      <TableCell>
        <Button size="icon-sm" variant={dirty ? 'default' : 'ghost'} disabled={!decision || !dirty || save.isPending}
          aria-label={t('Enregistrer la décision de {{name}}', { name: row.studentName })}
          onClick={() => save.mutate({ studentId: row.studentId, term, decision: decision as CouncilDecision, appreciation: appreciation.trim() || undefined }, {
            onSuccess: () => toast.success(t('Décision enregistrée pour {{name}}', { name: row.studentName })),
            onError: (error) => toast.error(error.message),
          })}>
          <Save />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function MassarCard({ classroomId, classroomName, term }: { classroomId: number; classroomName: string; term: string }) {
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [busy, setBusy] = useState(false)
  return (
    <Card className="h-fit">
      <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-mint-foreground" /> {t('Export MASSAR')}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('Moyennes de la matière au format colonnes MASSAR (code, nom, prénom, note), à coller dans le modèle d\'import.')}
        </p>
        <NativeSelect aria-label={t('Matière')} className="w-full" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {SUBJECTS.map((s) => <NativeSelectOption key={s} value={s}>{s}</NativeSelectOption>)}
        </NativeSelect>
        <Button className="w-full" variant="outline" disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              saveBlob(await massarExport(classroomId, term, subject), `massar-${classroomName}-${term}-${subject}.csv`)
            } catch (error) {
              toast.error((error as Error).message)
            } finally {
              setBusy(false)
            }
          }}>
          <FileSpreadsheet /> {t('Télécharger le CSV')}
        </Button>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><Sparkles className="mt-0.5 size-3 shrink-0" /> {t('✦ = décision proposée d\'après la moyenne')}</p>
      </CardContent>
    </Card>
  )
}
