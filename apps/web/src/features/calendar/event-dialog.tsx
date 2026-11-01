import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField, TextAreaField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { handleFormError, optionalId } from '@/lib/form'
import { EVENT_KIND_LABELS, type EventKind, useCreateEvent } from '@madrasti/shared/features/calendar/api'
import { t } from '@/i18n'

const schema = z
  .object({
    title: z.string().trim().min(1, 'Titre requis').max(150),
    kind: z.enum(['EVENT', 'EXAM', 'MEETING', 'HOLIDAY']),
    startsAt: z.string().min(1, 'Date requise'),
    endsAt: z.string().optional(),
    classroomId: z.preprocess(optionalId, z.number().optional()),
    description: z.string().trim().optional(),
  })
  .refine((v) => !v.endsAt || v.endsAt > v.startsAt, { path: ['endsAt'], message: 'Après le début' })

const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

export function EventDialog({ open, onOpenChange, day }: { open: boolean; onOpenChange: (open: boolean) => void; day?: Date }) {
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open })
  const create = useCreateEvent()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    const start = new Date(day ?? new Date())
    start.setHours(9, 0, 0, 0)
    reset({ title: '', kind: 'EVENT', startsAt: localInput(start), endsAt: '', classroomId: '', description: '' })
  }, [open, day, reset])

  const onSubmit = handleSubmit(({ startsAt, endsAt, description, ...input }) =>
    create.mutate(
      { ...input, description: description || undefined, startsAt: new Date(startsAt).toISOString(), endsAt: endsAt ? new Date(endsAt).toISOString() : undefined },
      {
        onSuccess: () => { toast.success(t("Ajouté à l'agenda")); onOpenChange(false) },
        onError: (error) => handleFormError(error, setError),
      },
    ),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t('Nouvel événement')}</DialogTitle></DialogHeader>
        <form id="event-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><TextField label={t('Titre')} registration={register('title')} error={errors.title} /></div>
            <SelectField label={t('Type')} registration={register('kind')}
              options={(Object.keys(EVENT_KIND_LABELS) as EventKind[]).map((k) => ({ value: k, label: t(EVENT_KIND_LABELS[k]) }))} />
            <SelectField label={t('Concerne')} placeholder={t('Toute l\'école')} registration={register('classroomId')}
              options={classrooms.map((c) => ({ value: c.id, label: t('Classe {{name}}', { name: c.name }) }))} />
            <TextField label={t('Début')} type="datetime-local" registration={register('startsAt')} error={errors.startsAt} />
            <TextField label={t('Fin (optionnel)')} type="datetime-local" registration={register('endsAt')} error={errors.endsAt} />
            <div className="sm:col-span-2"><TextAreaField label={t('Détails')} rows={3} registration={register('description')} /></div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="event-form" disabled={create.isPending}>{t('Ajouter')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
