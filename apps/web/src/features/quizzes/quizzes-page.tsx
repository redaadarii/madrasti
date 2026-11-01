import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BarChart3, CalendarClock, Plus, Puzzle, Trash2, Trophy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { todayIso } from '@madrasti/shared/features/homework/status'
import { formatDate } from '@madrasti/shared/format'
import { type QuizSummary, quizResultsQueryOptions, quizzesQueryOptions, useDeleteQuiz } from '@madrasti/shared/features/quizzes/api'
import { QuizBuilderDialog } from './quiz-builder-dialog'
import { t } from '@/i18n'

export function QuizzesPage() {
  const user = useCurrentUser()
  const isStudent = user.role === 'STUDENT'
  const { data: quizzes } = useSuspenseQuery(quizzesQueryOptions())
  const [creating, setCreating] = useState(false)
  const [results, setResults] = useState<QuizSummary | null>(null)
  const remove = useDeleteQuiz()
  const today = todayIso()

  return (
    <>
      <PageHeader title={t('Quiz en ligne')}
        description={isStudent ? t('Entraîne-toi et obtiens ta note instantanément.') : t('QCM auto-corrigés : publiez, puis suivez les résultats de la classe.')}
        actions={!isStudent && <Button onClick={() => setCreating(true)}><Plus /> {t('Nouveau quiz')}</Button>} />
      {quizzes.length === 0 ? (
        <EmptyState icon={Puzzle} title={t('Aucun quiz pour le moment')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => {
            const closed = quiz.dueDate < today
            const percent = quiz.myAttempt && Math.round((quiz.myAttempt.score / quiz.myAttempt.total) * 100)
            return (
              <Card key={quiz.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{quiz.subject}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="size-3.5" /> {formatDate(quiz.dueDate)}</span>
                  </div>
                  <CardTitle className="mt-2 text-lg">{quiz.title}</CardTitle>
                  <CardDescription>{t('{{count}} questions', { count: quiz.questionCount })} · {quiz.teacherName} · {quiz.classroomName}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isStudent ? (
                    quiz.myAttempt ? (
                      <p className="flex items-center gap-2 font-heading text-2xl font-semibold">
                        <Trophy className="size-5 text-sun-foreground" /> {quiz.myAttempt.score}/{quiz.myAttempt.total}
                        <span className="text-sm font-normal text-muted-foreground">({percent} %)</span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{closed ? t('Quiz clôturé') : t('Pas encore fait')}</p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('{{count}} participations', { count: quiz.attemptCount })}
                      {quiz.averagePercent != null && ` · ${t('moyenne {{percent}} %', { percent: Math.round(quiz.averagePercent) })}`}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="justify-between gap-2">
                  {isStudent ? (
                    <Button size="sm" variant={quiz.myAttempt ? 'outline' : 'default'} disabled={!quiz.myAttempt && closed}
                      nativeButton={false} render={<Link to="/quizzes/$quizId" params={{ quizId: quiz.id }} />}>
                      {quiz.myAttempt ? t('Voir la correction') : t('Commencer')}
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setResults(quiz)}><BarChart3 /> {t('Résultats')}</Button>
                      {(user.role !== 'TEACHER' || quiz.teacherId === user.id) && (
                        <Button size="icon-sm" variant="ghost" aria-label={t('Supprimer « {{title}} »', { title: quiz.title })}
                          onClick={() => remove.mutate(quiz.id, { onSuccess: () => toast.success(t('Quiz supprimé')) })}><Trash2 /></Button>
                      )}
                    </>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
      <QuizBuilderDialog open={creating} onOpenChange={setCreating} />
      <ResultsSheet quiz={results} onClose={() => setResults(null)} />
    </>
  )
}

function ResultsSheet({ quiz, onClose }: { quiz: QuizSummary | null; onClose: () => void }) {
  const { data: attempts = [] } = useQuery({ ...quizResultsQueryOptions(quiz?.id ?? 0), enabled: !!quiz })
  return (
    <Sheet open={!!quiz} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('Résultats')} — {quiz?.title}</SheetTitle>
          <SheetDescription>{t('{{count}} élèves ont répondu', { count: attempts.length })}</SheetDescription>
        </SheetHeader>
        <ol className="space-y-2 px-4">
          {attempts.map((a, i) => (
            <li key={a.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
              <span><span className="me-2 text-muted-foreground tabular-nums">{i + 1}.</span>{a.studentName}</span>
              <span className="font-semibold tabular-nums">{a.score}/{a.total}</span>
            </li>
          ))}
          {attempts.length === 0 && <EmptyState icon={BarChart3} title={t('Aucune participation')} />}
        </ol>
      </SheetContent>
    </Sheet>
  )
}
