import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@madrasti/shared/format'
import type { Assignment } from '@madrasti/shared/features/homework/api'
import { useSubmitHomework } from '@madrasti/shared/features/homework/queries'
import { t } from '@/i18n'

export function SubmitDialog({ assignment, onClose }: { assignment: Assignment | null; onClose: () => void }) {
  // Monté avec key={assignment.id} : l'état repart de la copie existante à chaque devoir ouvert.
  const [content, setContent] = useState(assignment?.submission?.content ?? '')
  const submit = useSubmitHomework()

  const send = () => {
    if (!assignment || !content.trim()) return
    submit.mutate({ id: assignment.id, content }, {
      onSuccess: () => { toast.success(t('Devoir rendu 🎉')); onClose() },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Dialog open={!!assignment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{assignment?.title}</DialogTitle>
          <DialogDescription>
            {assignment?.subject} · {assignment && t('à rendre pour le {{date}}', { date: formatDate(assignment.dueDate) })}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-xl bg-muted p-3 text-sm whitespace-pre-line">{assignment?.description}</p>
        <Field>
          <FieldLabel htmlFor="homework-answer">{t('Ma réponse')}</FieldLabel>
          <Textarea id="homework-answer" rows={8} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={t('Rédige ta réponse ici…')} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
          <Button onClick={send} disabled={!content.trim() || submit.isPending}>
            {assignment?.submission ? t('Mettre à jour ma copie') : t('Rendre le devoir')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
