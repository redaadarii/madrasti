import { Paperclip } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { t } from '@/i18n'
import { ApiError } from '@/lib/api-client'
import { formatDate } from '@madrasti/shared/format'
import type { Absence } from '@madrasti/shared/features/attendance/api'
import { useSubmitJustification } from '@madrasti/shared/features/attendance/queries'

/** Le parent explique une absence et joint un justificatif (certificat médical, convocation…). */
export function JustifyDialog({ absence, onOpenChange }: { absence: Absence | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!absence} onOpenChange={onOpenChange}>
      {/* Formulaire remonté à chaque ouverture : il repart vide sans effet de réinitialisation. */}
      {absence && <JustifyForm key={absence.id} absence={absence} onClose={() => onOpenChange(false)} />}
    </Dialog>
  )
}

function JustifyForm({ absence, onClose }: { absence: Absence; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File>()
  const submit = useSubmitJustification()

  const send = () => {
    if (!note.trim()) return
    submit.mutate({ id: absence.id, note: note.trim(), file }, {
      onSuccess: () => { toast.success(t('Justificatif envoyé à l\'école')); onClose() },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue')),
    })
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('Justifier l\'absence')}</DialogTitle>
        <DialogDescription>
          {absence.kind === 'LATE' ? t('Retard') : t('Absence')} · {formatDate(absence.day)}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="justification-note">{t('Motif')}</FieldLabel>
          <Textarea id="justification-note" value={note} maxLength={500} rows={3}
            placeholder={t('Ex. : rendez-vous médical, certificat joint')} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="justification-file"><Paperclip className="size-4" /> {t('Justificatif (facultatif)')}</FieldLabel>
          <Input id="justification-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0])} />
          <FieldDescription>{t('PDF ou photo, 10 Mo maximum.')}</FieldDescription>
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
        <Button onClick={send} disabled={!note.trim() || submit.isPending}>{t('Envoyer')}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
