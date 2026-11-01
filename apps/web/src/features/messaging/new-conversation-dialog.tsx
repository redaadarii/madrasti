import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { toast } from 'sonner'
import { RoleBadge } from '@/components/shared/badges'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Contact } from '@madrasti/shared/features/messaging/api'
import { contactsQueryOptions, useStartConversation } from '@madrasti/shared/features/messaging/queries'
import { t } from '@/i18n'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (conversationId: number) => void
}

export function NewConversationDialog({ open, onOpenChange, onCreated }: NewConversationDialogProps) {
  const [search, setSearch] = useState('')
  const [recipients, setRecipients] = useState<Contact[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const q = useDeferredValue(search)
  const { data: contacts = [] } = useQuery({ ...contactsQueryOptions(q), enabled: open })
  const start = useStartConversation()

  const close = () => {
    onOpenChange(false)
    setSearch('')
    setRecipients([])
    setSubject('')
    setBody('')
  }
  const toggle = (contact: Contact) =>
    setRecipients((list) => list.some((c) => c.id === contact.id) ? list.filter((c) => c.id !== contact.id) : [...list, contact])
  const ready = recipients.length > 0 && subject.trim() && body.trim()

  const send = () =>
    start.mutate({ recipientIds: recipients.map((r) => r.id), subject: subject.trim(), body: body.trim() }, {
      onSuccess: (conversation) => { toast.success(t('Message envoyé')); onCreated(conversation.id); close() },
      onError: (error) => toast.error(error.message),
    })

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Nouveau message')}</DialogTitle>
          <DialogDescription>{t('Écrivez à un ou plusieurs membres de l\'école.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="recipient-search">{t('Destinataires')}</FieldLabel>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recipients.map((r) => (
                  <Badge key={r.id} variant="secondary" className="gap-1">
                    {r.name}
                    <button type="button" aria-label={t('Retirer {{name}}', { name: r.name })} onClick={() => toggle(r)}><X className="size-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="recipient-search" className="ps-9" placeholder={t('Rechercher un nom…')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <ul className="max-h-40 divide-y overflow-y-auto rounded-xl border" aria-label={t('Contacts')}>
              {contacts.map((contact) => {
                const checked = recipients.some((r) => r.id === contact.id)
                return (
                  <li key={contact.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/60">
                      <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={() => toggle(contact)} />
                      <span className="flex-1">{contact.name}</span>
                      <RoleBadge role={contact.role} />
                    </label>
                  </li>
                )
              })}
              {contacts.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t('Aucun contact trouvé')}</li>}
            </ul>
          </Field>
          <Field>
            <FieldLabel htmlFor="conversation-subject">{t('Objet')}</FieldLabel>
            <Input id="conversation-subject" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="conversation-body">{t('Message')}</FieldLabel>
            <Textarea id="conversation-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>{t('Annuler')}</Button>
          <Button onClick={send} disabled={!ready || start.isPending}>{t('Envoyer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
