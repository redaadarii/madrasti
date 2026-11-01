import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { studentsQueryOptions } from '@madrasti/shared/features/students/queries'
import { handleFormError, optionalId } from '@/lib/form'
import { useRecordAbsence } from '@madrasti/shared/features/attendance/queries'
import { t } from '@/i18n'

const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  studentId: z.preprocess(optionalId, z.number({ error: 'Élève requis' })),
  day: z.string().min(1, 'Date requise').refine((d) => d <= today(), 'Date future interdite'),
  kind: z.enum(['ABSENCE', 'LATE']),
  reason: z.string().trim().optional().transform((v) => v || undefined),
})

interface RecordAbsenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Élève imposé (depuis sa fiche) ; sinon choix par classe puis élève. */
  studentId?: number
}

export function RecordAbsenceDialog({ open, onOpenChange, studentId }: RecordAbsenceDialogProps) {
  const [classroomId, setClassroomId] = useState<number>()
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open && !studentId })
  const { data: students } = useQuery({
    ...studentsQueryOptions({ classroomId, page: 0, size: 200 }),
    enabled: open && !studentId && !!classroomId,
  })
  const record = useRecordAbsence()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ studentId: studentId ?? '', day: today(), kind: 'ABSENCE', reason: '' })
  }, [open, studentId, reset])

  const onSubmit = handleSubmit((input) =>
    record.mutate(input, {
      onSuccess: () => { toast.success(t('Absence enregistrée')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('Signaler une absence')}</DialogTitle></DialogHeader>
        <form id="absence-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {!studentId && (
              <>
                <Field>
                  <FieldLabel htmlFor="absence-classroom">{t('Classe')}</FieldLabel>
                  <NativeSelect id="absence-classroom" className="w-full" value={classroomId ?? ''}
                    onChange={(e) => setClassroomId(e.target.value ? Number(e.target.value) : undefined)}>
                    <NativeSelectOption value="">{t('Choisir…')}</NativeSelectOption>
                    {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
                  </NativeSelect>
                </Field>
                <SelectField label={t('Élève')} placeholder={t('Choisir…')} registration={register('studentId')} error={errors.studentId}
                  options={(students?.content ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))} />
              </>
            )}
            <TextField label={t('Date')} type="date" max={today()} registration={register('day')} error={errors.day} />
            <SelectField label={t('Type')} registration={register('kind')}
              options={[{ value: 'ABSENCE', label: t('Absence') }, { value: 'LATE', label: t('Retard') }]} />
            <div className="sm:col-span-2"><TextField label={t('Motif (optionnel)')} registration={register('reason')} /></div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="absence-form" disabled={record.isPending}>{t('Enregistrer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
