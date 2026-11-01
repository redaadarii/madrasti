import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MessagesSquare, PenSquare, Send } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { TranslateButton } from '@/features/translation/translate-button'
import { dateFormat } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@madrasti/shared/features/messaging/api'
import { NewConversationDialog } from './new-conversation-dialog'
import { inboxQueryOptions, messagingKeys, threadQueryOptions, useReply } from '@madrasti/shared/features/messaging/queries'
import { t } from '@/i18n'

const when = () => dateFormat({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const initialsOf = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

export function MessagesPage() {
  const { data: inbox = [] } = useQuery(inboxQueryOptions)
  const [selectedId, setSelectedId] = useState<number>()
  const [composing, setComposing] = useState(false)
  const selected = inbox.find((c) => c.id === selectedId)

  return (
    <>
      <PageHeader title={t('Messagerie')} description={t('Échangez avec l\'équipe pédagogique et les familles.')}
        actions={<Button onClick={() => setComposing(true)}><PenSquare /> {t('Nouveau message')}</Button>} />
      <Card className="grid h-[calc(100svh-15rem)] min-h-[28rem] gap-0 overflow-hidden py-0 lg:grid-cols-[22rem_1fr]">
        <ul aria-label={t('Conversations')} className={cn('divide-y overflow-y-auto border-e', selected && 'hidden lg:block')}>
          {inbox.length === 0 && <li className="p-6"><EmptyState icon={MessagesSquare} title={t('Aucune conversation')} /></li>}
          {inbox.map((conversation) => (
            <li key={conversation.id}>
              <button type="button" onClick={() => setSelectedId(conversation.id)}
                className={cn('flex w-full gap-3 p-4 text-start transition-colors hover:bg-muted/60', conversation.id === selectedId && 'bg-secondary/60')}>
                <Avatar><AvatarFallback className="bg-secondary text-primary">{initialsOf(conversation.participants[0]?.name ?? '?')}</AvatarFallback></Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-sm', conversation.unread ? 'font-bold' : 'font-medium')}>
                      {conversation.participants.map((p) => p.name).join(', ')}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{when().format(new Date(conversation.lastMessageAt))}</span>
                  </span>
                  <span className={cn('block truncate text-sm', conversation.unread ? 'font-semibold' : 'text-muted-foreground')}>{conversation.subject}</span>
                  <span className="block truncate text-xs text-muted-foreground">{conversation.lastMessagePreview}</span>
                </span>
                {conversation.unread && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-coral" aria-label={t('Non lu')} />}
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <Thread key={selected.id} conversation={selected} onBack={() => setSelectedId(undefined)} />
        ) : (
          <div className="hidden place-items-center p-6 lg:grid">
            <EmptyState icon={MessagesSquare} title={t('Sélectionnez une conversation')} />
          </div>
        )}
      </Card>
      <NewConversationDialog open={composing} onOpenChange={setComposing} onCreated={setSelectedId} />
    </>
  )
}

function Thread({ conversation, onBack }: { conversation: ConversationSummary; onBack: () => void }) {
  const queryClient = useQueryClient()
  const { data: messages = [], isSuccess } = useQuery(threadQueryOptions(conversation.id))
  const reply = useReply(conversation.id)
  const [body, setBody] = useState('')
  const bottom = useRef<HTMLDivElement>(null)

  // L'ouverture du fil le marque lu côté serveur : on resynchronise compteur et boîte de réception.
  useEffect(() => {
    if (isSuccess && conversation.unread) queryClient.invalidateQueries({ queryKey: messagingKeys.all })
  }, [isSuccess, conversation.unread, queryClient])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = (event?: FormEvent) => {
    event?.preventDefault()
    if (!body.trim()) return
    reply.mutate(body.trim(), { onSuccess: () => setBody(''), onError: (error) => toast.error(error.message) })
  }

  return (
    <section className="flex min-h-0 flex-col" aria-label={conversation.subject}>
      <header className="flex items-center gap-3 border-b p-4">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t('Retour aux conversations')} onClick={onBack}><ArrowLeft className="rtl:-scale-x-100" /></Button>
        <div className="min-w-0">
          <h2 className="truncate font-sans text-base font-semibold">{conversation.subject}</h2>
          <p className="truncate text-xs text-muted-foreground">{conversation.participants.map((p) => p.name).join(', ')}</p>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
        {messages.map((message) => (
          <div key={message.id} className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-xs',
              message.mine ? 'rounded-ee-md bg-primary text-primary-foreground' : 'rounded-es-md bg-card')}>
              {!message.mine && <p className="mb-0.5 text-xs font-semibold text-primary">{message.senderName}</p>}
              <p className="whitespace-pre-line">{message.body}</p>
              {!message.mine && <TranslateButton text={message.body} className="mt-1" />}
              <p className={cn('mt-1 text-end text-[0.68rem]', message.mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                {when().format(new Date(message.createdAt))}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
        <Textarea aria-label={t('Votre réponse')} rows={2} className="min-h-0 resize-none" placeholder={t('Écrire une réponse… (Ctrl + Entrée pour envoyer)')}
          value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send() }} />
        <Button type="submit" size="icon" aria-label={t('Envoyer')} disabled={!body.trim() || reply.isPending}><Send /></Button>
      </form>
    </section>
  )
}
