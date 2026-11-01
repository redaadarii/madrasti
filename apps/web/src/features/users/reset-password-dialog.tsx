import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { User } from '@madrasti/shared/features/users/api'
import { useResetPassword } from '@madrasti/shared/features/users/queries'
import { t } from '@/i18n'

export function ResetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const reset = useResetPassword()
  const tooShort = password.length > 0 && password.length < 8

  const submit = () => {
    if (!user || password.length < 8) return
    reset.mutate({ id: user.id, password }, {
      onSuccess: () => {
        toast.success(t('Mot de passe de {{name}} réinitialisé', { name: user.firstName }))
        setPassword('')
        onClose()
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Réinitialiser le mot de passe')}</DialogTitle>
          <DialogDescription>{user?.firstName} {user?.lastName} — {user?.email}</DialogDescription>
        </DialogHeader>
        <Field data-invalid={tooShort}>
          <FieldLabel htmlFor="new-password">{t('Nouveau mot de passe')}</FieldLabel>
          <Input id="new-password" type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} aria-invalid={tooShort} />
          {tooShort && <FieldError>{t('8 caractères minimum')}</FieldError>}
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
          <Button onClick={submit} disabled={password.length < 8 || reset.isPending}>{t('Réinitialiser')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
