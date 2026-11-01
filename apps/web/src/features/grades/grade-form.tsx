import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { handleFormError } from '@/lib/form'
import { SUBJECTS } from '@madrasti/shared/subjects'
import { useCreateGrade } from '@madrasti/shared/features/grades/queries'
import { t } from '@/i18n'

const TERMS = ['T1', 'T2', 'T3']

const schema = z
  .object({
    subject: z.string().min(1, 'Matière requise'),
    title: z.string().trim().min(1, 'Intitulé requis'),
    score: z.coerce.number({ error: 'Note requise' }).min(0, 'Note positive'),
    maxScore: z.coerce.number().positive('Barème invalide'),
    term: z.string(),
  })
  .refine((g) => g.score <= g.maxScore, { path: ['score'], message: 'Dépasse le barème' })

export function GradeForm({ studentId }: { studentId: number }) {
  const create = useCreateGrade()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: { subject: SUBJECTS[0], title: '', score: '', maxScore: 20, term: 'T1' },
    })

  const onSubmit = handleSubmit((values) =>
    create.mutate({ ...values, studentId }, {
      onSuccess: () => { toast.success(t('Note ajoutée')); reset({ ...values, title: '', score: '' }) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-3 rounded-2xl bg-muted/60 p-4 sm:grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr_0.6fr_auto]">
      <SelectField label={t('Matière')} registration={register('subject')} error={errors.subject} options={SUBJECTS.map((s) => ({ value: s, label: s }))} />
      <TextField label={t('Intitulé')} placeholder={t('Contrôle 2')} registration={register('title')} error={errors.title} />
      <TextField label={t('Note')} type="number" step="0.25" registration={register('score')} error={errors.score} />
      <TextField label={t('Sur')} type="number" registration={register('maxScore')} error={errors.maxScore} />
      <SelectField label={t('Trim.')} registration={register('term')} options={TERMS.map((t) => ({ value: t, label: t }))} />
      <Button type="submit" className="mt-6 sm:mt-[1.6rem]" disabled={create.isPending}><Plus /> {t('Ajouter')}</Button>
    </form>
  )
}
