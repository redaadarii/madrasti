import { useSuspenseQuery } from '@tanstack/react-query'
import { Check, Lock, Plus, Trash2, Vote, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { type Audience, AUDIENCE_LABELS } from '@madrasti/shared/features/announcements/api'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { t } from '@/i18n'
import { ApiError } from '@/lib/api-client'
import { formatDate } from '@madrasti/shared/format'
import { STAFF_ROLES } from '@madrasti/shared/types'
import { cn } from '@/lib/utils'
import { type Poll, pollsQueryOptions, useClosePoll, useCreatePoll, useDeletePoll, useVote } from '@madrasti/shared/features/polls/api'

const errorToast = (error: Error) => toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue'))

export function PollsPage() {
  const user = useCurrentUser()
  const { data: polls } = useSuspenseQuery(pollsQueryOptions)
  const [creating, setCreating] = useState(false)
  const canCreate = STAFF_ROLES.includes(user.role)

  return (
    <>
      <PageHeader title={t('Sondages')} description={t('Recueillez l\'avis des familles, des élèves et des équipes en un clic.')}
        actions={canCreate && <Button onClick={() => setCreating(true)}><Plus /> {t('Nouveau sondage')}</Button>} />
      {polls.length === 0
        ? <EmptyState icon={Vote} title={t('Aucun sondage pour le moment')} />
        : <div className="grid gap-4 lg:grid-cols-2">{polls.map((poll) => <PollCard key={poll.id} poll={poll} />)}</div>}
      {canCreate && <CreatePollDialog open={creating} onOpenChange={setCreating} />}
    </>
  )
}

function PollCard({ poll }: { poll: Poll }) {
  const vote = useVote()
  const close = useClosePoll()
  const remove = useDeletePoll()
  const showResults = poll.totalVotes !== null
  const canVote = poll.open && poll.myChoice === null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{t(AUDIENCE_LABELS[poll.audience])}</Badge>
          {poll.open
            ? poll.closesOn && <Badge className="border-0 bg-sun/40 text-sun-foreground">{t('Jusqu\'au {{date}}', { date: formatDate(poll.closesOn) })}</Badge>
            : <Badge variant="secondary"><Lock /> {t('Clôturé')}</Badge>}
          {poll.myChoice !== null && <Badge className="border-0 bg-mint/30 text-mint-foreground"><Check /> {t('Répondu')}</Badge>}
        </div>
        <CardTitle className="text-lg">{poll.question}</CardTitle>
        {poll.authorName && <p className="text-xs text-muted-foreground">{t('Par {{name}}', { name: poll.authorName })}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {poll.options.map((option) => {
          const share = showResults && poll.totalVotes ? Math.round(((option.votes ?? 0) / poll.totalVotes) * 100) : 0
          const chosen = poll.myChoice === option.id
          return canVote ? (
            <Button key={option.id} variant="outline" className="w-full justify-start" disabled={vote.isPending}
              onClick={() => vote.mutate({ pollId: poll.id, optionId: option.id }, { onSuccess: () => toast.success(t('Merci pour votre réponse !')), onError: errorToast })}>
              {option.label}
            </Button>
          ) : (
            <div key={option.id} className={cn('relative overflow-hidden rounded-lg border px-3 py-2 text-sm', chosen && 'border-primary')}>
              <div className="absolute inset-y-0 start-0 bg-primary/10 transition-all" style={{ width: `${share}%` }} />
              <div className="relative flex justify-between gap-2">
                <span className={cn(chosen && 'font-semibold')}>{chosen && <Check className="me-1 inline size-4 text-primary" />}{option.label}</span>
                {showResults && <span className="tabular-nums text-muted-foreground">{share}% · {option.votes}</span>}
              </div>
            </div>
          )
        })}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{showResults ? t('{{count}} réponses', { count: poll.totalVotes ?? 0 }) : t('Résultats visibles après votre réponse')}</span>
        {poll.canManage && (
          <div className="flex gap-1">
            {poll.open && (
              <Button variant="ghost" size="sm" onClick={() => close.mutate(poll.id, { onSuccess: () => toast.success(t('Sondage clôturé')) })}>
                <X /> {t('Clôturer')}
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer le sondage')}
              onClick={() => remove.mutate(poll.id, { onSuccess: () => toast.success(t('Sondage supprimé')) })}>
              <Trash2 />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

function CreatePollDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CreatePollForm onClose={() => onOpenChange(false)} />}
    </Dialog>
  )
}

function CreatePollForm({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState('')
  const [audience, setAudience] = useState<Audience>('PARENTS')
  const [closesOn, setClosesOn] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const create = useCreatePoll()

  const filled = options.map((o) => o.trim()).filter(Boolean)
  const valid = question.trim() && new Set(filled).size >= 2

  const save = () =>
    create.mutate({ question: question.trim(), audience, closesOn: closesOn || undefined, options: filled }, {
      onSuccess: () => { toast.success(t('Sondage publié')); onClose() },
      onError: errorToast,
    })

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{t('Nouveau sondage')}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="poll-question">{t('Question')}</FieldLabel>
          <Input id="poll-question" value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="poll-audience">{t('Destinataires')}</FieldLabel>
            <NativeSelect id="poll-audience" className="w-full" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => <NativeSelectOption key={a} value={a}>{t(AUDIENCE_LABELS[a])}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="poll-closes">{t('Clôture (optionnel)')}</FieldLabel>
            <Input id="poll-closes" type="date" min={today} value={closesOn} onChange={(e) => setClosesOn(e.target.value)} />
          </Field>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{t('Réponses possibles')}</legend>
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input aria-label={t('Réponse {{n}}', { n: index + 1 })} value={option} maxLength={150}
                onChange={(e) => setOptions(options.map((o, i) => (i === index ? e.target.value : o)))} />
              {options.length > 2 && (
                <Button variant="ghost" size="icon" aria-label={t('Retirer la réponse {{n}}', { n: index + 1 })}
                  onClick={() => setOptions(options.filter((_, i) => i !== index))}>
                  <X />
                </Button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button variant="outline" size="sm" onClick={() => setOptions([...options, ''])}><Plus /> {t('Ajouter une réponse')}</Button>
          )}
        </fieldset>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
        <Button onClick={save} disabled={!valid || create.isPending}>{t('Publier')}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
