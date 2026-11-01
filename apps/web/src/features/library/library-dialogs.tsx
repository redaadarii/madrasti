import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { studentsQueryOptions } from '@madrasti/shared/features/students/queries'
import { handleFormError } from '@/lib/form'
import { type Book, useLend, useSaveBook } from '@madrasti/shared/features/library/api'
import { t } from '@/i18n'

const bookSchema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(200),
  author: z.string().trim().min(1, 'Auteur requis').max(150),
  isbn: z.string().trim().max(20).optional().transform((v) => v || undefined),
  category: z.string().trim().min(1, 'Catégorie requise').max(60),
  copies: z.coerce.number().int().min(1, '1 exemplaire minimum').max(500),
})

export function BookDialog({ state, onOpenChange }: { state: { open: boolean; book?: Book }; onOpenChange: (open: boolean) => void }) {
  const save = useSaveBook()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof bookSchema>, unknown, z.output<typeof bookSchema>>({ resolver: zodResolver(bookSchema) })

  useEffect(() => {
    if (!state.open) return
    const b = state.book
    reset({ title: b?.title ?? '', author: b?.author ?? '', isbn: b?.isbn ?? '', category: b?.category ?? '', copies: b?.copies ?? 1 })
  }, [state, reset])

  const onSubmit = handleSubmit((input) =>
    save.mutate({ id: state.book?.id, input }, {
      onSuccess: () => { toast.success(t('Livre enregistré')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{state.book ? t('Modifier le livre') : t('Ajouter un livre')}</DialogTitle></DialogHeader>
        <form id="book-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><TextField label={t('Titre')} registration={register('title')} error={errors.title} /></div>
            <TextField label={t('Auteur')} registration={register('author')} error={errors.author} />
            <TextField label={t('Catégorie')} placeholder={t('Roman, Jeunesse…')} registration={register('category')} error={errors.category} />
            <TextField label={t('ISBN')} registration={register('isbn')} error={errors.isbn} />
            <TextField label={t('Exemplaires')} type="number" min={1} registration={register('copies')} error={errors.copies} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="book-form" disabled={save.isPending}>{t('Enregistrer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LendDialog({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const [classroomId, setClassroomId] = useState<number>()
  const [studentId, setStudentId] = useState('')
  const [days, setDays] = useState(14)
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: !!book })
  const { data: students } = useQuery({ ...studentsQueryOptions({ classroomId, page: 0, size: 200 }), enabled: !!classroomId })
  const lend = useLend()

  const submit = () => {
    if (!book || !studentId) return
    lend.mutate({ bookId: book.id, studentId: Number(studentId), days }, {
      onSuccess: () => { toast.success(t('Prêt enregistré')); onClose() },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Dialog open={!!book} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Prêter « {{title}} »', { title: book?.title })}</DialogTitle>
          <DialogDescription>{t('{{count}} exemplaires disponibles', { count: book?.available ?? 0 })}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="lend-classroom">{t('Classe')}</FieldLabel>
            <NativeSelect id="lend-classroom" className="w-full" value={classroomId ?? ''}
              onChange={(e) => { setClassroomId(e.target.value ? Number(e.target.value) : undefined); setStudentId('') }}>
              <NativeSelectOption value="">{t('Choisir…')}</NativeSelectOption>
              {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="lend-student">{t('Élève')}</FieldLabel>
            <NativeSelect id="lend-student" className="w-full" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <NativeSelectOption value="">{t('Choisir…')}</NativeSelectOption>
              {(students?.content ?? []).map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.firstName} {s.lastName}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="lend-days">{t('Durée (jours)')}</FieldLabel>
            <Input id="lend-days" type="number" min={1} max={60} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
          <Button onClick={submit} disabled={!studentId || days < 1 || lend.isPending}>{t('Prêter')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
