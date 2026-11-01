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
import type { Student } from '@madrasti/shared/features/students/api'
import { useSaveStudent } from '@madrasti/shared/features/students/queries'
import { t } from '@/i18n'

const schema = z.object({
  registrationNumber: z.string().trim().min(1, 'Matricule requis'),
  firstName: z.string().trim().min(1, 'Prénom requis'),
  lastName: z.string().trim().min(1, 'Nom requis'),
  birthDate: z.string().optional().transform((v) => v || undefined),
  massarCode: z.string().trim().toUpperCase().optional().transform((v) => v || undefined)
    .refine((v) => !v || /^[A-Z]\d{9}$/.test(v), 'Code Massar : une lettre et 9 chiffres'),
  classroomId: z.preprocess(optionalId, z.number({ error: 'Classe requise' })),
  parentId: z.preprocess(optionalId, z.number().optional()),
  accountId: z.preprocess(optionalId, z.number().optional()),
})

interface StudentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student
}

export function StudentFormDialog({ open, onOpenChange, student }: StudentFormDialogProps) {
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open })
  const { data: parents = [] } = useQuery({ ...usersByRoleQueryOptions('PARENT'), enabled: open })
  const { data: accounts = [] } = useQuery({ ...usersByRoleQueryOptions('STUDENT'), enabled: open })
  const save = useSaveStudent()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset({
        registrationNumber: student?.registrationNumber ?? `SC-${new Date().getFullYear()}-`,
        firstName: student?.firstName ?? '',
        lastName: student?.lastName ?? '',
        birthDate: student?.birthDate ?? '',
        massarCode: student?.massarCode ?? '',
        classroomId: student?.classroomId ?? '',
        parentId: student?.parentId ?? '',
        accountId: student?.accountId ?? '',
      })
    }
  }, [open, student, reset])

  const onSubmit = handleSubmit((input) =>
    save.mutate({ id: student?.id, input }, {
      onSuccess: () => { toast.success(student ? t('Élève mis à jour') : t('Élève inscrit')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{student ? t("Modifier l'élève") : t('Nouvelle inscription')}</DialogTitle></DialogHeader>
        <form id="student-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField label={t('Prénom')} registration={register('firstName')} error={errors.firstName} />
            <TextField label={t('Nom')} registration={register('lastName')} error={errors.lastName} />
            <TextField label={t('Matricule')} registration={register('registrationNumber')} error={errors.registrationNumber} />
            <TextField label={t('Date de naissance')} type="date" registration={register('birthDate')} error={errors.birthDate} />
            <TextField label={t('Code Massar')} placeholder="G123456789" registration={register('massarCode')} error={errors.massarCode} />
            <SelectField label={t('Classe')} placeholder={t('Choisir…')} registration={register('classroomId')} error={errors.classroomId}
              options={classrooms.map((c) => ({ value: c.id, label: `${c.name} · ${c.level}` }))} />
            <SelectField label={t('Parent')} placeholder={t('— Aucun —')} registration={register('parentId')} error={errors.parentId}
              options={parents.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))} />
            <div className="sm:col-span-2">
              <SelectField label={t('Compte élève (espace élève)')} placeholder={t('— Aucun —')} registration={register('accountId')}
                error={errors.accountId} options={accounts.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName} · ${a.email}` }))} />
            </div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="student-form" disabled={save.isPending}>{t('Enregistrer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
