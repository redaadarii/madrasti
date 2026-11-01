import { useQuery } from '@tanstack/react-query'
import { Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { useFamilyStudent } from '@/features/students/child-picker'
import { t } from '@/i18n'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import {
  BEHAVIOR_CATEGORIES,
  type BehaviorCategory,
  classroomBehaviorQueryOptions,
  type Sanction,
  SANCTION_LABELS,
  useDeleteBehavior,
  useRecordBehavior,
} from '@madrasti/shared/features/behavior/api'
import { BehaviorItem, BehaviorTimeline } from './behavior-timeline'

export function BehaviorPage() {
  const { isFamily } = useFamilyStudent()
  return isFamily ? <FamilyBehavior /> : <ClassroomBehavior />
}

function FamilyBehavior() {
  const { student, picker } = useFamilyStudent()
  return (
    <>
      <PageHeader title={t('Comportement')} description={t('Encouragements et remarques de l\'équipe pédagogique.')} actions={picker} />
      {student && <BehaviorTimeline studentId={student.id} />}
    </>
  )
}

/** Vue enseignant façon « tableau de classe » : un clic sur un élève pour l'encourager ou signaler un incident. */
function ClassroomBehavior() {
  const user = useCurrentUser()
  const { data: classrooms = [] } = useQuery(classroomsQueryOptions)
  const [classroomId, setClassroomId] = useState<number>()
  const [target, setTarget] = useState<{ id: number; name: string }>()
  const selected = classroomId ?? classrooms[0]?.id
  const { data } = useQuery({ ...classroomBehaviorQueryOptions(selected ?? 0), enabled: !!selected })
  const remove = useDeleteBehavior()
  const canDeleteAll = user.role !== 'TEACHER'
  const myName = `${user.firstName} ${user.lastName}`

  return (
    <>
      <PageHeader title={t('Comportement')} description={t('Valorisez les réussites et suivez les incidents de vie scolaire.')}
        actions={
          <NativeSelect aria-label={t('Classe')} value={selected ?? ''} onChange={(e) => setClassroomId(Number(e.target.value))}>
            {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
          </NativeSelect>
        } />
      {data && (
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.students.map((s) => (
              <button key={s.studentId} type="button" onClick={() => setTarget({ id: s.studentId, name: s.studentName })}
                className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-secondary font-semibold text-primary">
                    {s.studentName.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="line-clamp-1 text-sm font-medium">{s.studentName}</span>
                <span className={cn('rounded-full px-2.5 py-0.5 font-heading text-sm font-semibold tabular-nums',
                  s.balance > 0 ? 'bg-mint/30 text-mint-foreground dark:text-mint' : s.balance < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
                  {s.balance > 0 ? `+${s.balance}` : s.balance}
                </span>
              </button>
            ))}
          </div>
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-4"><CardTitle>{t('Dernières observations')}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.recent.length === 0
                ? <div className="p-6"><EmptyState icon={Sparkles} title={t('Aucune observation pour le moment')} /></div>
                : (
                  <ul className="divide-y">
                    {data.recent.map((r) => (
                      <BehaviorItem key={r.id} record={r} showStudent action={(canDeleteAll || r.authorName === myName) && (
                        <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer')}
                          onClick={() => remove.mutate(r.id, { onSuccess: () => toast.success(t('Observation supprimée')) })}>
                          <Trash2 />
                        </Button>
                      )} />
                    ))}
                  </ul>
                )}
            </CardContent>
          </Card>
        </div>
      )}
      <RecordBehaviorDialog student={target} onClose={() => setTarget(undefined)} />
    </>
  )
}

function RecordBehaviorDialog({ student, onClose }: { student?: { id: number; name: string }; onClose: () => void }) {
  return (
    <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
      {student && <RecordBehaviorForm key={student.id} student={student} onClose={onClose} />}
    </Dialog>
  )
}

function RecordBehaviorForm({ student, onClose }: { student: { id: number; name: string }; onClose: () => void }) {
  const [category, setCategory] = useState<BehaviorCategory>()
  const [sanction, setSanction] = useState<Sanction | ''>('')
  const [note, setNote] = useState('')
  const record = useRecordBehavior()
  const positive = category && BEHAVIOR_CATEGORIES.find((c) => c.value === category)!.points > 0

  const save = () => {
    if (!category) return
    record.mutate({ studentId: student.id, category, sanction: positive || !sanction ? undefined : sanction, note: note.trim() || undefined }, {
      onSuccess: () => { toast.success(t('Observation enregistrée pour {{name}}', { name: student.name })); onClose() },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue')),
    })
  }

  const chip = (c: (typeof BEHAVIOR_CATEGORIES)[number]) => (
    <button key={c.value} type="button" aria-pressed={category === c.value} onClick={() => setCategory(c.value)}
      className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-start text-sm transition',
        category === c.value ? (c.points > 0 ? 'border-mint bg-mint/20' : 'border-destructive bg-destructive/10') : 'hover:bg-muted')}>
      <span aria-hidden>{c.emoji}</span>
      <span className="flex-1">{t(c.label)}</span>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{c.points > 0 ? `+${c.points}` : c.points}</span>
    </button>
  )

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>{student.name}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-mint-foreground">{t('Encourager')}</p>
          <div className="grid gap-2 sm:grid-cols-2">{BEHAVIOR_CATEGORIES.filter((c) => c.points > 0).map(chip)}</div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-destructive">{t('Signaler un incident')}</p>
          <div className="grid gap-2 sm:grid-cols-2">{BEHAVIOR_CATEGORIES.filter((c) => c.points < 0).map(chip)}</div>
        </div>
        {category && !positive && (
          <Field>
            <FieldLabel htmlFor="behavior-sanction">{t('Sanction')}</FieldLabel>
            <NativeSelect id="behavior-sanction" className="w-full" value={sanction} onChange={(e) => setSanction(e.target.value as Sanction | '')}>
              <NativeSelectOption value="">{t('Aucune')}</NativeSelectOption>
              {(Object.keys(SANCTION_LABELS) as Sanction[]).map((s) => <NativeSelectOption key={s} value={s}>{t(SANCTION_LABELS[s])}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="behavior-note">{t('Commentaire (optionnel)')}</FieldLabel>
          <Input id="behavior-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
        <Button onClick={save} disabled={!category || record.isPending}>{t('Enregistrer')}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
