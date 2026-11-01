import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { handleFormError } from '@/lib/form'
import { type CampusService, SERVICE_KIND_LABELS, type ServiceKind, useSaveService } from '@madrasti/shared/features/services/api'
import { t } from '@/i18n'

const schema = z.object({
  kind: z.enum(['TRANSPORT', 'CANTEEN', 'ACTIVITY']),
  name: z.string().trim().min(1, 'Nom requis').max(120),
  description: z.string().trim().max(500).optional().transform((v) => v || undefined),
  schedule: z.string().trim().max(120).optional().transform((v) => v || undefined),
  monthlyFee: z.coerce.number({ error: 'Tarif requis' }).min(0),
  capacity: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  active: z.boolean(),
})

interface ServiceDialogProps {
  state: { open: boolean; service?: CampusService }
  onOpenChange: (open: boolean) => void
}

export function ServiceDialog({ state, onOpenChange }: ServiceDialogProps) {
  const save = useSaveService()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!state.open) return
    const s = state.service
    reset({ kind: s?.kind ?? 'ACTIVITY', name: s?.name ?? '', description: s?.description ?? '', schedule: s?.schedule ?? '',
      monthlyFee: s?.monthlyFee ?? '', capacity: s?.capacity ?? '', active: s?.active ?? true })
  }, [state, reset])

  const onSubmit = handleSubmit((input) =>
    save.mutate({ id: state.service?.id, input }, {
      onSuccess: () => { toast.success(t('Service enregistré')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{state.service ? t('Modifier le service') : t('Nouveau service')}</DialogTitle></DialogHeader>
        <form id="service-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <SelectField label={t('Type')} registration={register('kind')}
              options={(Object.keys(SERVICE_KIND_LABELS) as ServiceKind[]).map((k) => ({ value: k, label: t(SERVICE_KIND_LABELS[k]) }))} />
            <TextField label={t('Nom')} registration={register('name')} error={errors.name} />
            <div className="sm:col-span-2"><TextField label={t('Description')} registration={register('description')} error={errors.description} /></div>
            <TextField label={t('Horaires')} placeholder={t('Mercredi 14h – 16h')} registration={register('schedule')} error={errors.schedule} />
            <TextField label={t('Tarif mensuel (MAD)')} type="number" min={0} registration={register('monthlyFee')} error={errors.monthlyFee} />
            <TextField label={t('Places (vide = illimité)')} type="number" min={1} registration={register('capacity')} error={errors.capacity} />
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...register('active')} /> {t('Inscriptions ouvertes')}
            </label>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="service-form" disabled={save.isPending}>{t('Enregistrer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
