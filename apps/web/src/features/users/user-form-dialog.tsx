import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { schoolsQueryOptions } from '@madrasti/shared/features/schools/queries'
import { handleFormError, optionalId } from '@/lib/form'
import { ROLE_LABELS, type Role } from '@madrasti/shared/types'
import type { User } from '@madrasti/shared/features/users/api'
import { useSaveUser } from '@madrasti/shared/features/users/queries'
import { t } from '@/i18n'

const ROLES = Object.keys(ROLE_LABELS) as Role[]

const schema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis'),
  lastName: z.string().trim().min(1, 'Nom requis'),
  email: z.email('Adresse email invalide'),
  phone: z.string().trim().optional(),
  role: z.enum(ROLES as [Role, ...Role[]]),
  schoolId: z.preprocess(optionalId, z.number().optional()),
  password: z.string().optional(),
  active: z.boolean(),
})

type UserForm = z.input<typeof schema>

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user
  const { data: schools = [] } = useQuery({ ...schoolsQueryOptions, enabled: open })
  const save = useSaveUser()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<UserForm, unknown, z.output<typeof schema>>({
    resolver: zodResolver(
      schema.refine((v) => isEdit || (v.password?.length ?? 0) >= 8, { path: ['password'], message: '8 caractères minimum' }),
    ),
  })

  useEffect(() => {
    if (open) {
      reset({
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        role: user?.role ?? 'TEACHER',
        schoolId: user?.schoolId ?? '',
        password: '',
        active: user?.active ?? true,
      })
    }
  }, [open, user, reset])

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      { id: user?.id, input: { ...values, password: isEdit ? undefined : values.password } },
      {
        onSuccess: () => {
          toast.success(isEdit ? t('Compte mis à jour') : t('Compte créé'))
          onOpenChange(false)
        },
        onError: (error) => handleFormError(error, setError),
      },
    ),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Modifier le compte') : t('Nouveau compte')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('Mettez à jour les informations du compte.') : t("L'utilisateur pourra se connecter immédiatement.")}
          </DialogDescription>
        </DialogHeader>
        <form id="user-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField label={t('Prénom')} registration={register('firstName')} error={errors.firstName} />
            <TextField label={t('Nom')} registration={register('lastName')} error={errors.lastName} />
            <div className="sm:col-span-2">
              <TextField label={t('Email')} type="email" registration={register('email')} error={errors.email} />
            </div>
            <TextField label={t('Téléphone')} registration={register('phone')} error={errors.phone} />
            <SelectField label={t('Rôle')} registration={register('role')} error={errors.role}
              options={ROLES.map((role) => ({ value: role, label: t(ROLE_LABELS[role]) }))} />
            <div className="sm:col-span-2">
              <SelectField label={t('École')} placeholder={t('— Aucune (réseau) —')} registration={register('schoolId')}
                error={errors.schoolId} options={schools.map((s) => ({ value: s.id, label: `${s.name} · ${s.city}` }))} />
            </div>
            {!isEdit && (
              <div className="sm:col-span-2">
                <TextField label={t('Mot de passe initial')} type="password" autoComplete="new-password"
                  registration={register('password')} error={errors.password} />
              </div>
            )}
            {isEdit && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="size-4 accent-primary" {...register('active')} /> {t('Compte actif')}
              </label>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="user-form" disabled={save.isPending}>{isEdit ? t('Enregistrer') : t('Créer le compte')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
