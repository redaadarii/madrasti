import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField, TextAreaField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { handleFormError, optionalId } from '@/lib/form'
import { SUBJECTS } from '@madrasti/shared/subjects'
import { todayIso } from '@madrasti/shared/features/homework/status'
import { useCreateAssignment } from '@madrasti/shared/features/homework/queries'
import { t } from '@/i18n'

const schema = z.object({
  classroomId: z.preprocess(optionalId, z.number({ error: 'Classe requise' })),
  subject: z.string().min(1),
  title: z.string().trim().min(1, 'Titre requis').max(150),
  description: z.string().trim().min(1, 'Consignes requises'),
  dueDate: z.string().min(1, 'Date requise').refine((d) => d >= todayIso(), 'La date limite est passée'),
})

export function AssignmentFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open })
  const create = useCreateAssignment()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ classroomId: '', subject: SUBJECTS[0], title: '', description: '', dueDate: '' })
  }, [open, reset])

  const onSubmit = handleSubmit((input) =>
    create.mutate(input, {
      onSuccess: () => { toast.success(t('Devoir publié dans le cahier de textes')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Nouveau devoir')}</DialogTitle>
          <DialogDescription>{t('Les élèves de la classe le verront immédiatement dans leur espace.')}</DialogDescription>
        </DialogHeader>
        <form id="assignment-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <SelectField label={t('Classe')} placeholder={t('Choisir…')} registration={register('classroomId')} error={errors.classroomId}
              options={classrooms.map((c) => ({ value: c.id, label: c.name }))} />
            <SelectField label={t('Matière')} registration={register('subject')} options={SUBJECTS.map((s) => ({ value: s, label: s }))} />
            <div className="sm:col-span-2"><TextField label={t('Titre')} registration={register('title')} error={errors.title} /></div>
            <div className="sm:col-span-2">
              <TextAreaField label={t('Consignes')} rows={5} registration={register('description')} error={errors.description} />
            </div>
            <TextField label={t('À rendre pour le')} type="date" min={todayIso()} registration={register('dueDate')} error={errors.dueDate} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="assignment-form" disabled={create.isPending}>{t('Publier')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
