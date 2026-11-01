import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Mail, MapPin, Pencil, Phone, Plus, School as SchoolIcon, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { TextField } from '@/components/shared/form-fields'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { handleFormError } from '@/lib/form'
import type { School } from '@madrasti/shared/features/schools/api'
import { schoolsQueryOptions, useDeleteSchool, useSaveSchool } from '@madrasti/shared/features/schools/queries'
import { t } from '@/i18n'

const schema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  city: z.string().trim().min(1, 'Ville requise'),
  address: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.literal(''), z.email('Adresse email invalide')]),
})
type SchoolForm = z.infer<typeof schema>

export function SchoolsPage() {
  const { data: schools } = useSuspenseQuery(schoolsQueryOptions)
  const [editing, setEditing] = useState<{ open: boolean; school?: School }>({ open: false })
  const [deleting, setDeleting] = useState<School | null>(null)
  const deleteSchool = useDeleteSchool()

  return (
    <>
      <PageHeader title={t('Écoles')} description={t('Gestion multi-établissements du réseau.')}
        actions={<Button onClick={() => setEditing({ open: true })}><Plus /> {t('Nouvelle école')}</Button>} />
      {schools.length === 0 ? (
        <EmptyState icon={SchoolIcon} title={t('Aucune école')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {schools.map((school) => (
            <Card key={school.id}>
              <CardHeader>
                <CardTitle className="text-lg">{school.name}</CardTitle>
                <CardAction className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label={t('Modifier {{name}}', { name: school.name })} onClick={() => setEditing({ open: true, school })}><Pencil /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer {{name}}', { name: school.name })} onClick={() => setDeleting(school)}><Trash2 /></Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><MapPin className="size-4" /> {[school.address, school.city].filter(Boolean).join(', ')}</p>
                {school.phone && <p className="flex items-center gap-2"><Phone className="size-4" /> {school.phone}</p>}
                {school.email && <p className="flex items-center gap-2"><Mail className="size-4" /> {school.email}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <SchoolDialog state={editing} onOpenChange={(open) => setEditing((s) => ({ ...s, open }))} />
      <ConfirmDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}
        title={t('Supprimer cette école ?')} description={t('Impossible si des classes ou des comptes y sont rattachés.')}
        onConfirm={() => deleting && deleteSchool.mutate(deleting.id, {
          onSuccess: () => toast.success(t('École supprimée')),
          onError: () => toast.error(t('Suppression impossible : des données sont rattachées à cette école')),
        })} />
    </>
  )
}

function SchoolDialog({ state, onOpenChange }: { state: { open: boolean; school?: School }; onOpenChange: (open: boolean) => void }) {
  const save = useSaveSchool()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<SchoolForm>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (state.open) {
      const s = state.school
      reset({ name: s?.name ?? '', city: s?.city ?? '', address: s?.address ?? '', phone: s?.phone ?? '', email: s?.email ?? '' })
    }
  }, [state, reset])

  const onSubmit = handleSubmit((values) =>
    save.mutate({ id: state.school?.id, input: { ...values, email: values.email || null } }, {
      onSuccess: () => { toast.success(t('École enregistrée')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{state.school ? t("Modifier l'école") : t('Nouvelle école')}</DialogTitle></DialogHeader>
        <form id="school-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><TextField label={t('Nom')} registration={register('name')} error={errors.name} /></div>
            <TextField label={t('Ville')} registration={register('city')} error={errors.city} />
            <TextField label={t('Téléphone')} registration={register('phone')} error={errors.phone} />
            <div className="sm:col-span-2"><TextField label={t('Adresse')} registration={register('address')} error={errors.address} /></div>
            <div className="sm:col-span-2"><TextField label={t('Email')} type="email" registration={register('email')} error={errors.email} /></div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="school-form" disabled={save.isPending}>{t('Enregistrer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
