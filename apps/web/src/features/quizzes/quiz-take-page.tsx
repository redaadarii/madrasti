import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Check, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { quizQueryOptions, useSubmitQuiz } from '@madrasti/shared/features/quizzes/api'
import { t } from '@/i18n'

export function QuizTakePage() {
  const { quizId } = useParams({ from: '/app/quizzes/$quizId' })
  const { data } = useSuspenseQuery(quizQueryOptions(quizId))
  const submit = useSubmitQuiz(quizId)
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => data.questions.map(() => undefined))
  const corrected = data.quiz.myAttempt != null
  const complete = answers.every((a) => a !== undefined)

  const send = () =>
    submit.mutate(answers as number[], {
      onSuccess: (result) => toast.success(`${t('Résultat')} : ${result.score}/${result.total} 🎉`),
      onError: (error) => toast.error(error.message),
    })

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-4" nativeButton={false} render={<Link to="/quizzes" />}><ArrowLeft className="rtl:-scale-x-100" /> {t('Tous les quiz')}</Button>
      <h1 className="text-3xl font-semibold">{data.quiz.title}</h1>
      <p className="mt-1 text-muted-foreground">{data.quiz.subject} · {t('{{count}} questions', { count: data.questions.length })}</p>

      {corrected && (
        <Card className="mt-6 bg-sidebar text-sidebar-foreground">
          <CardContent className="flex items-center gap-4">
            <Trophy className="size-10 text-sun" />
            <div>
              <p className="font-heading text-3xl font-semibold text-sidebar-accent-foreground">{data.quiz.myAttempt!.score}/{data.quiz.myAttempt!.total}</p>
              <p className="text-sm text-sidebar-foreground/75">{t('Voici la correction détaillée.')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <ol className="mt-6 space-y-4">
        {data.questions.map((question, qi) => (
          <li key={question.id}>
            <Card>
              <CardContent>
                <fieldset>
                  <legend className="font-semibold"><span className="me-2 text-primary">{qi + 1}.</span>{question.prompt}</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {question.choices.map((choice, ci) => {
                      const chosen = corrected ? question.myAnswer === ci : answers[qi] === ci
                      const isRight = corrected && question.correctIndex === ci
                      const isWrong = corrected && chosen && !isRight
                      return (
                        <label key={ci} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors',
                          !corrected && 'hover:bg-muted/60', chosen && !corrected && 'border-primary bg-secondary/60',
                          isRight && 'border-mint bg-mint/20', isWrong && 'border-destructive bg-destructive/10', corrected && 'cursor-default')}>
                          <input type="radio" name={`q-${question.id}`} className="size-4 accent-primary" disabled={corrected} checked={chosen}
                            onChange={() => setAnswers((list) => list.map((a, i) => (i === qi ? ci : a)))} />
                          <span className="flex-1">{choice}</span>
                          {isRight && <Check className="size-4 text-mint-foreground" aria-label={t('Bonne réponse')} />}
                          {isWrong && <X className="size-4 text-destructive" aria-label={t('Mauvaise réponse')} />}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      {!corrected && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
          <p className="text-sm text-muted-foreground">{t('{{done}}/{{total}} réponses', { done: answers.filter((a) => a !== undefined).length, total: answers.length })}</p>
          <Button onClick={send} disabled={!complete || submit.isPending}>{t('Valider mes réponses')}</Button>
        </div>
      )}
    </div>
  )
}
