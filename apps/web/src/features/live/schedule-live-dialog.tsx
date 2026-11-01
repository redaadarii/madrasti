import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { handleFormError, optionalId } from '@/lib/form'
import { SUBJECTS } from '@madrasti/shared/subjects'
import { useScheduleLive } from '@madrasti/shared/features/live/queries'
import { t } from '@/i18n'

const schema = z
  .object({
    classroomId: z.preprocess(optionalId, z.number({ error: 'Classe requise' })),
    subject: z.string().min(1),
    title: z.string().trim().min(1, 'Titre requis').max(150),
    startsAt: z.string().min(1, 'Date et heure requises')
      .refine((v) => new Date(v).getTime() > Date.now(), 'Choisissez une heure à venir'),
    durationMinutes: z.coerce.number().int().min(15, '15 min minimum').max(240, '4 h maximum'),
    provider: z.enum(['JITSI', 'EXTERNAL']),
    meetingUrl: z.string().trim().optional(),
  })
  .refine((v) => v.provider === 'JITSI' || /^https:\/\/.+/.test(v.meetingUrl ?? ''), {
    path: ['meetingUrl'],
    message: 'Collez le lien https:// de la réunion',
  })

/** Valeur par défaut d'un <input type="datetime-local"> : la prochaine heure pleine, en heure locale. */
function nextFullHour() {
  const date = new Date()
  date.setHours(date.getHours() + 1, 0, 0, 0)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function ScheduleLiveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open })
  const schedule = useScheduleLive()
  const { register, handleSubmit, reset, setError, control, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })
  const provider = useWatch({ control, name: 'provider' })

  useEffect(() => {
    if (open) {
      reset({ classroomId: '', subject: SUBJECTS[0], title: '', startsAt: nextFullHour(), durationMinutes: 60, provider: 'JITSI', meetingUrl: '' })
    }
  }, [open, reset])

  const onSubmit = handleSubmit(({ startsAt, meetingUrl, ...input }) =>
    schedule.mutate(
      { ...input, startsAt: new Date(startsAt).toISOString(), meetingUrl: input.provider === 'EXTERNAL' ? meetingUrl : undefined },
      {
        onSuccess: () => { toast.success(t('Cours planifié — la classe est prévenue dans son espace')); onOpenChange(false) },
        onError: (error) => handleFormError(error, setError),
      },
    ),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Planifier un cours en direct')}</DialogTitle>
          <DialogDescription>{t('Salle Jitsi générée automatiquement, ou votre propre lien Zoom / Meet / Teams.')}</DialogDescription>
        </DialogHeader>
        <form id="live-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <SelectField label={t('Classe')} placeholder={t('Choisir…')} registration={register('classroomId')} error={errors.classroomId}
              options={classrooms.map((c) => ({ value: c.id, label: c.name }))} />
            <SelectField label={t('Matière')} registration={register('subject')} options={SUBJECTS.map((s) => ({ value: s, label: s }))} />
            <div className="sm:col-span-2"><TextField label={t('Titre du cours')} registration={register('title')} error={errors.title} /></div>
            <TextField label={t('Début')} type="datetime-local" registration={register('startsAt')} error={errors.startsAt} />
            <TextField label={t('Durée (min)')} type="number" step={15} registration={register('durationMinutes')} error={errors.durationMinutes} />
            <div className="sm:col-span-2">
              <SelectField label={t('Visioconférence')} registration={register('provider')} options={[
                { value: 'JITSI', label: t('Salle Madrasti (Jitsi, intégrée)') },
                { value: 'EXTERNAL', label: t('Lien externe (Zoom, Google Meet, Teams…)') },
              ]} />
            </div>
            {provider === 'EXTERNAL' && (
              <div className="sm:col-span-2">
                <TextField label={t('Lien de la réunion')} placeholder="https://zoom.us/j/…" registration={register('meetingUrl')} error={errors.meetingUrl} />
              </div>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="live-form" disabled={schedule.isPending}>{t('Planifier')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
