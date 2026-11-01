import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { schoolsQueryOptions } from '@madrasti/shared/features/schools/queries'
import { usersByRoleQueryOptions } from '@madrasti/shared/features/users/queries'
import { handleFormError, optionalId } from '@/lib/form'
import { MANAGER_ROLES } from '@madrasti/shared/types'
import type { Classroom } from '@madrasti/shared/features/classrooms/api'
import { classroomsQueryOptions, useDeleteClassroom, useSaveClassroom } from '@madrasti/shared/features/classrooms/queries'
import { t } from '@/i18n'

const schema = z.object({
  schoolId: z.preprocess(optionalId, z.number({ error: 'École requise' })),
  name: z.string().trim().min(1, 'Nom requis'),
  level: z.string().trim().min(1, 'Niveau requis'),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2026-2027'),
  mainTeacherId: z.preprocess(optionalId, z.number().optional()),
})

export function ClassroomsPage() {
  const user = useCurrentUser()
  const canManage = MANAGER_ROLES.includes(user.role)
  const { data: classrooms } = useSuspenseQuery(classroomsQueryOptions)
  const [editing, setEditing] = useState<{ open: boolean; classroom?: Classroom }>({ open: false })
  const [deleting, setDeleting] = useState<Classroom | null>(null)
  const deleteClassroom = useDeleteClassroom()

  return (
    <>
      <PageHeader title={t('Classes')} description={t('Répartition des classes et professeurs principaux.')}
        actions={canManage && <Button onClick={() => setEditing({ open: true })}><Plus /> {t('Nouvelle classe')}</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {classrooms.map((classroom) => (
          <Card key={classroom.id}>
            <CardHeader>
              <CardTitle className="font-heading text-2xl">{classroom.name}</CardTitle>
              <CardDescription>{classroom.level} · {classroom.academicYear}</CardDescription>
              {canManage && (
                <CardAction className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label={t('Modifier {{name}}', { name: classroom.name })} onClick={() => setEditing({ open: true, classroom })}><Pencil /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer {{name}}', { name: classroom.name })} onClick={() => setDeleting(classroom)}><Trash2 /></Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{classroom.mainTeacherName ?? t('Sans professeur principal')}</span>
              <Badge variant="secondary" render={<Link to="/students" search={{ classroomId: classroom.id }} />}>
                <Users /> {t('{{count}} élèves', { count: classroom.studentCount })}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <ClassroomDialog state={editing} onOpenChange={(open) => setEditing((s) => ({ ...s, open }))} />
      <ConfirmDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}
        title={t('Supprimer la classe {{name}} ?', { name: deleting?.name ?? '' })} description={t('Impossible si des élèves y sont inscrits.')}
        onConfirm={() => deleting && deleteClassroom.mutate(deleting.id, {
          onSuccess: () => toast.success(t('Classe supprimée')),
          onError: () => toast.error(t('Suppression impossible : des élèves sont inscrits dans cette classe')),
        })} />
    </>
  )
}

function ClassroomDialog({ state, onOpenChange }: { state: { open: boolean; classroom?: Classroom }; onOpenChange: (open: boolean) => void }) {
  const { data: schools = [] } = useQuery({ ...schoolsQueryOptions, enabled: state.open })
  const { data: teachers = [] } = useQuery({ ...usersByRoleQueryOptions('TEACHER'), enabled: state.open })
  const save = useSaveClassroom()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (state.open) {
      const c = state.classroom
      reset({ schoolId: c?.schoolId ?? '', name: c?.name ?? '', level: c?.level ?? '', academicYear: c?.academicYear ?? '2026-2027', mainTeacherId: c?.mainTeacherId ?? '' })
    }
  }, [state, reset])

  const onSubmit = handleSubmit((input) =>
    save.mutate({ id: state.classroom?.id, input }, {
      onSuccess: () => { toast.success(t('Classe enregistrée')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{state.classroom ? t('Modifier la classe') : t('Nouvelle classe')}</DialogTitle></DialogHeader>
        <form id="classroom-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <SelectField label={t('École')} placeholder={t('Choisir…')} registration={register('schoolId')} error={errors.schoolId}
                options={schools.map((s) => ({ value: s.id, label: s.name }))} />
            </div>
            <TextField label={t('Nom')} placeholder="CE2-A" registration={register('name')} error={errors.name} />
            <TextField label={t('Niveau')} placeholder="Primaire" registration={register('level')} error={errors.level} />
            <TextField label={t('Année scolaire')} registration={register('academicYear')} error={errors.academicYear} />
            <SelectField label={t('Professeur principal')} placeholder={t('— Aucun —')} registration={register('mainTeacherId')}
              error={errors.mainTeacherId} options={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="classroom-form" disabled={save.isPending}>{t('Enregistrer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
