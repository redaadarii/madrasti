import { useQuery } from '@tanstack/react-query'
import { Check, Inbox } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDate } from '@madrasti/shared/format'
import type { Assignment, Submission } from '@madrasti/shared/features/homework/api'
import { submissionsQueryOptions, useReviewSubmission } from '@madrasti/shared/features/homework/queries'
import { t } from '@/i18n'

export function SubmissionsSheet({ assignment, onClose }: { assignment: Assignment | null; onClose: () => void }) {
  const { data: copies = [], isPending } = useQuery({
    ...submissionsQueryOptions(assignment?.id ?? 0),
    enabled: !!assignment,
  })

  return (
    <Sheet open={!!assignment} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t('Copies')} — {assignment?.title}</SheetTitle>
          <SheetDescription>{assignment?.classroomName} · {t('{{count}} copies rendues', { count: copies.length })}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {!isPending && copies.length === 0 && <EmptyState icon={Inbox} title={t('Aucune copie pour le moment')} />}
          {copies.map((copy) => <CopyReview key={copy.id} copy={copy} />)}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CopyReview({ copy }: { copy: Submission }) {
  const [score, setScore] = useState(copy.score?.toString() ?? '')
  const [feedback, setFeedback] = useState(copy.feedback ?? '')
  const review = useReviewSubmission()
  const value = Number(score)
  const valid = score !== '' && value >= 0 && value <= 20

  return (
    <article className="rounded-2xl border p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{copy.studentName}</p>
        <div className="flex gap-2">
          {copy.late && <Badge variant="destructive">{t('En retard')}</Badge>}
          <span className="text-xs text-muted-foreground">{t('rendu le {{date}}', { date: formatDate(copy.submittedAt) })}</span>
        </div>
      </header>
      <p className="mt-3 rounded-xl bg-muted p-3 text-sm whitespace-pre-line">{copy.content}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[6rem_1fr_auto]">
        <Input type="number" min={0} max={20} step={0.5} aria-label={t('Note de {{name}} sur 20', { name: copy.studentName })} placeholder="/20"
          value={score} onChange={(e) => setScore(e.target.value)} />
        <Input aria-label={t('Appréciation pour {{name}}', { name: copy.studentName })} placeholder={t('Appréciation…')} value={feedback}
          onChange={(e) => setFeedback(e.target.value)} />
        <Button disabled={!valid || review.isPending}
          onClick={() => review.mutate({ id: copy.id, score: value, feedback: feedback || undefined }, {
            onSuccess: () => toast.success(t('Copie de {{name}} corrigée', { name: copy.studentName })),
            onError: (error) => toast.error(error.message),
          })}>
          <Check /> {copy.score != null ? t('Mettre à jour') : t('Corriger')}
        </Button>
      </div>
    </article>
  )
}
