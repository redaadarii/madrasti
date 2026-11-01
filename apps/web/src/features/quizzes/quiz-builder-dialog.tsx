import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { todayIso } from '@madrasti/shared/features/homework/status'
import { SUBJECTS } from '@madrasti/shared/subjects'
import { useCreateQuiz } from '@madrasti/shared/features/quizzes/api'
import { type DraftQuestion, emptyQuestion, quizDraftError } from './draft'
import { t } from '@/i18n'

export function QuizBuilderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open })
  const create = useCreateQuiz()
  const [classroomId, setClassroomId] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()])

  const update = (index: number, change: Partial<DraftQuestion>) =>
    setQuestions((list) => list.map((q, i) => (i === index ? { ...q, ...change } : q)))

  const publish = () => {
    const error = !classroomId ? t('Choisissez une classe') : !title.trim() ? t('Titre requis') : !dueDate ? t('Date limite requise') : quizDraftError(questions)
    if (error) {
      toast.error(error)
      return
    }
    create.mutate(
      { classroomId: Number(classroomId), subject, title: title.trim(), dueDate, questions: questions.map((q) => ({ ...q, prompt: q.prompt.trim(), choices: q.choices.map((c) => c.trim()) })) },
      {
        onSuccess: () => {
          toast.success(t('Quiz publié pour la classe'))
          setTitle('')
          setQuestions([emptyQuestion()])
          onOpenChange(false)
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Nouveau quiz')}</DialogTitle>
          <DialogDescription>{t('QCM corrigé automatiquement : cochez la bonne réponse de chaque question.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="quiz-classroom">{t('Classe')}</FieldLabel>
            <NativeSelect id="quiz-classroom" className="w-full" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <NativeSelectOption value="">{t('Choisir…')}</NativeSelectOption>
              {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="quiz-subject">{t('Matière')}</FieldLabel>
            <NativeSelect id="quiz-subject" className="w-full" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => <NativeSelectOption key={s} value={s}>{s}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field><FieldLabel htmlFor="quiz-title">{t('Titre')}</FieldLabel><Input id="quiz-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field><FieldLabel htmlFor="quiz-due">{t('À faire avant le')}</FieldLabel><Input id="quiz-due" type="date" min={todayIso()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        </div>

        <ol className="space-y-4">
          {questions.map((question, qi) => (
            <li key={qi} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{qi + 1}</span>
                <Input aria-label={t('Énoncé de la question {{n}}', { n: qi + 1 })} placeholder={t('Énoncé de la question')} value={question.prompt}
                  onChange={(e) => update(qi, { prompt: e.target.value })} />
                {questions.length > 1 && (
                  <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer la question {{n}}', { n: qi + 1 })}
                    onClick={() => setQuestions((list) => list.filter((_, i) => i !== qi))}><Trash2 /></Button>
                )}
              </div>
              <div className="mt-3 space-y-2 ps-9">
                {question.choices.map((choice, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qi}`} className="size-4 accent-primary" checked={question.correctIndex === ci}
                      aria-label={t('Bonne réponse : choix {{n}}', { n: ci + 1 })} onChange={() => update(qi, { correctIndex: ci })} />
                    <Input aria-label={t('Question {{q}}, choix {{c}}', { q: qi + 1, c: ci + 1 })} placeholder={t('Choix {{n}}', { n: ci + 1 })} value={choice}
                      onChange={(e) => update(qi, { choices: question.choices.map((c, i) => (i === ci ? e.target.value : c)) })} />
                    {question.choices.length > 2 && (
                      <Button variant="ghost" size="icon-xs" aria-label={t('Retirer le choix {{n}}', { n: ci + 1 })}
                        onClick={() => update(qi, {
                          choices: question.choices.filter((_, i) => i !== ci),
                          correctIndex: question.correctIndex >= ci && question.correctIndex > 0 ? question.correctIndex - 1 : question.correctIndex,
                        })}><Trash2 /></Button>
                    )}
                  </div>
                ))}
                {question.choices.length < 6 && (
                  <Button variant="link" size="sm" className="px-0" onClick={() => update(qi, { choices: [...question.choices, ''] })}>
                    <Plus /> {t('Ajouter un choix')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
        <Button variant="outline" onClick={() => setQuestions((list) => [...list, emptyQuestion()])} disabled={questions.length >= 30}>
          <Plus /> {t('Ajouter une question')}
        </Button>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button onClick={publish} disabled={create.isPending}>{t('Publier le quiz')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
