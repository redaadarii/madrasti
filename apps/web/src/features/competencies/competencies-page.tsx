import { useQuery } from '@tanstack/react-query'
import { Plus, Target } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { t } from '@/i18n'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { gridQueryOptions, MASTERY_LEVELS, masteryInfo, nextMastery, useAssess, useCreateCompetency } from '@madrasti/shared/features/competencies/api'

const TERMS = ['T1', 'T2', 'T3']

export function CompetenciesPage() {
  const { data: classrooms = [] } = useQuery(classroomsQueryOptions)
  const [classroomId, setClassroomId] = useState<number>()
  const [term, setTerm] = useState('T1')
  const [subject, setSubject] = useState<string>()
  const [creating, setCreating] = useState(false)
  const selected = classroomId ?? classrooms[0]?.id
  const { data: grid } = useQuery({ ...gridQueryOptions(selected ?? 0, term), enabled: !!selected })
  const assess = useAssess(selected ?? 0, term)

  const subjects = [...new Set(grid?.competencies.map((c) => c.subject))]
  const currentSubject = subject && subjects.includes(subject) ? subject : subjects[0]
  const columns = grid?.competencies.filter((c) => c.subject === currentSubject) ?? []

  return (
    <>
      <PageHeader title={t('Compétences')}
        description={t('Livret par compétences : cliquez sur une case pour faire défiler les niveaux.')}
        actions={
          <div className="flex flex-wrap gap-2">
            <NativeSelect aria-label={t('Classe')} value={selected ?? ''} onChange={(e) => setClassroomId(Number(e.target.value))}>
              {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
            </NativeSelect>
            <Button variant="outline" onClick={() => setCreating(true)}><Plus /> {t('Nouvelle compétence')}</Button>
          </div>
        } />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={term} onValueChange={(v) => setTerm(v as string)}>
          <TabsList>{TERMS.map((tm) => <TabsTrigger key={tm} value={tm}>{t('Trimestre {{n}}', { n: tm.slice(1) })}</TabsTrigger>)}</TabsList>
        </Tabs>
        <ul className="flex flex-wrap gap-2 text-xs" aria-label={t('Légende')}>
          {MASTERY_LEVELS.map((m) => (
            <li key={m.value} className={cn('rounded-md px-2 py-1 font-semibold', m.className)}>{m.short} · {t(m.label)}</li>
          ))}
        </ul>
      </div>

      {subjects.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t('Matière')}>
          {subjects.map((s) => (
            <Button key={s} role="tab" aria-selected={s === currentSubject} size="sm" variant={s === currentSubject ? 'default' : 'outline'}
              onClick={() => setSubject(s)}>{s}</Button>
          ))}
        </div>
      )}

      {grid && columns.length === 0 ? (
        <EmptyState icon={Target} title={t('Aucune compétence pour ce niveau')} />
      ) : grid && (
        <Card className="overflow-x-auto py-0">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th scope="col" className="sticky start-0 bg-card px-4 py-3 text-start font-medium">{t('Élève')}</th>
                {columns.map((c) => (
                  <th key={c.id} scope="col" className="max-w-40 px-2 py-3 text-center align-bottom text-xs font-medium text-muted-foreground">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.students.map((student) => (
                <tr key={student.studentId} className="border-b last:border-0">
                  <th scope="row" className="sticky start-0 bg-card px-4 py-2 text-start font-medium whitespace-nowrap">{student.studentName}</th>
                  {columns.map((c) => {
                    const mastery = student.levels[c.id]
                    const info = mastery && masteryInfo(mastery)
                    return (
                      <td key={c.id} className="px-2 py-1.5 text-center">
                        <button type="button"
                          aria-label={t('{{student}} — {{competency}} : {{level}}', { student: student.studentName, competency: c.label, level: info ? t(info.label) : t('non évalué') })}
                          onClick={() => assess.mutate({ studentId: student.studentId, competencyId: c.id, mastery: nextMastery(mastery) }, {
                            onError: (error) => toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue')),
                          })}
                          className={cn('h-8 w-12 rounded-md border text-xs font-semibold transition hover:ring-2 hover:ring-primary/40',
                            info ? cn('border-transparent', info.className) : 'border-dashed text-muted-foreground')}>
                          {info?.short ?? '·'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        {creating && <CompetencyForm defaultSubject={currentSubject} onClose={() => setCreating(false)} />}
      </Dialog>
    </>
  )
}

function CompetencyForm({ defaultSubject, onClose }: { defaultSubject?: string; onClose: () => void }) {
  const [subject, setSubject] = useState(defaultSubject ?? '')
  const [label, setLabel] = useState('')
  const [level, setLevel] = useState('')
  const create = useCreateCompetency()
  const save = () =>
    create.mutate({ subject: subject.trim(), label: label.trim(), level: level.trim() || undefined }, {
      onSuccess: () => { toast.success(t('Compétence ajoutée')); onClose() },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue')),
    })
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{t('Nouvelle compétence')}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="competency-subject">{t('Matière')}</FieldLabel>
          <Input id="competency-subject" value={subject} maxLength={60} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="competency-label">{t('Intitulé')}</FieldLabel>
          <Input id="competency-label" value={label} maxLength={200} placeholder={t('Ex. : Résoudre un problème en plusieurs étapes')} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="competency-level">{t('Niveau (optionnel)')}</FieldLabel>
          <Input id="competency-level" value={level} maxLength={40} placeholder={t('Vide = tous les niveaux')} onChange={(e) => setLevel(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
        <Button onClick={save} disabled={!subject.trim() || !label.trim() || create.isPending}>{t('Enregistrer')}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
