import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { usersByRoleQueryOptions } from '@madrasti/shared/features/users/queries'
import { handleFormError, optionalId } from '@/lib/form'
import { SUBJECTS } from '@madrasti/shared/subjects'
import { DAYS, useCreateSlot } from '@madrasti/shared/features/timetable/api'
import { t } from '@/i18n'

const schema = z
  .object({
    classroomId: z.preprocess(optionalId, z.number({ error: 'Classe requise' })),
    dayOfWeek: z.coerce.number().int().min(1).max(6),
    startTime: z.string().min(1, 'Heure requise'),
    endTime: z.string().min(1, 'Heure requise'),
    subject: z.string().min(1),
    teacherId: z.preprocess(optionalId, z.number().optional()),
    room: z.string().trim().max(40).optional().transform((v) => v || undefined),
  })
  .refine((v) => v.endTime > v.startTime, { path: ['endTime'], message: 'Après le début' })

interface SlotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classroomId?: number
}

export function SlotDialog({ open, onOpenChange, classroomId }: SlotDialogProps) {
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open })
  const { data: teachers = [] } = useQuery({ ...usersByRoleQueryOptions('TEACHER'), enabled: open })
  const create = useCreateSlot()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ classroomId: classroomId ?? '', dayOfWeek: 1, startTime: '08:30', endTime: '10:00', subject: SUBJECTS[0], teacherId: '', room: '' })
  }, [open, classroomId, reset])

  const onSubmit = handleSubmit((input) =>
    create.mutate(input, {
      onSuccess: () => { toast.success(t('Créneau ajouté')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t('Nouveau créneau')}</DialogTitle></DialogHeader>
        <form id="slot-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <SelectField label={t('Classe')} placeholder={t('Choisir…')} registration={register('classroomId')} error={errors.classroomId}
              options={classrooms.map((c) => ({ value: c.id, label: c.name }))} />
            <SelectField label={t('Jour')} registration={register('dayOfWeek')} options={DAYS.map((d, i) => ({ value: i + 1, label: t(d) }))} />
            <TextField label={t('Début')} type="time" registration={register('startTime')} error={errors.startTime} />
            <TextField label={t('Fin')} type="time" registration={register('endTime')} error={errors.endTime} />
            <SelectField label={t('Matière')} registration={register('subject')} options={SUBJECTS.map((s) => ({ value: s, label: s }))} />
            <SelectField label={t('Enseignant')} placeholder={t('— Non attribué —')} registration={register('teacherId')}
              options={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))} />
            <TextField label={t('Salle')} placeholder="Salle 101" registration={register('room')} error={errors.room} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="slot-form" disabled={create.isPending}>{t('Ajouter')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
