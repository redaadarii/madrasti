import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { BookOpenCheck, CalendarClock, Inbox, Plus, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { formatDate } from '@madrasti/shared/format'
import type { Assignment } from '@madrasti/shared/features/homework/api'
import { AssignmentFormDialog } from './assignment-form-dialog'
import { HomeworkStatusBadge } from './homework-status-badge'
import { assignmentsQueryOptions, useDeleteAssignment } from '@madrasti/shared/features/homework/queries'
import { homeworkStatus, todayIso } from '@madrasti/shared/features/homework/status'
import { SubmissionsSheet } from './submissions-sheet'
import { SubmitDialog } from './submit-dialog'
import { t } from '@/i18n'

export function HomeworkPage() {
  const user = useCurrentUser()
  return user.role === 'STUDENT' ? <StudentHomework /> : <TeacherHomework />
}

function AssignmentHeader({ assignment }: { assignment: Assignment }) {
  return (
    <CardHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{assignment.subject}</Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" /> {t('pour le {{date}}', { date: formatDate(assignment.dueDate) })}
        </span>
      </div>
      <CardTitle className="mt-2 text-lg">{assignment.title}</CardTitle>
      <CardDescription className="flex items-center gap-1">
        <UserRound className="size-3.5" /> {assignment.teacherName} · {assignment.classroomName}
      </CardDescription>
    </CardHeader>
  )
}

function StudentHomework() {
  const { data: assignments } = useSuspenseQuery(assignmentsQueryOptions())
  const [tab, setTab] = useState<'todo' | 'done'>('todo')
  const [answering, setAnswering] = useState<Assignment | null>(null)
  const today = todayIso()

  const withStatus = assignments.map((a) => ({ assignment: a, status: homeworkStatus(a, today) }))
  const todo = withStatus.filter(({ status }) => status === 'TODO' || status === 'LATE')
    .sort((a, b) => a.assignment.dueDate.localeCompare(b.assignment.dueDate))
  const done = withStatus.filter(({ status }) => status === 'SUBMITTED' || status === 'REVIEWED')
  const visible = tab === 'todo' ? todo : done

  return (
    <>
      <PageHeader title={t('Mes devoirs')} description={t('Le cahier de textes de ta classe : consignes, rendus et corrections.')} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'todo' | 'done')} className="mb-4">
        <TabsList>
          <TabsTrigger value="todo">{t('À faire')} ({todo.length})</TabsTrigger>
          <TabsTrigger value="done">{t('Rendus')} ({done.length})</TabsTrigger>
        </TabsList>
      </Tabs>
      {visible.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title={tab === 'todo' ? `${t('Tout est rendu, bravo !')} 🎉` : t('Aucun devoir rendu pour le moment')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map(({ assignment, status }) => (
            <Card key={assignment.id}>
              <AssignmentHeader assignment={assignment} />
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-line text-muted-foreground">{assignment.description}</p>
                {assignment.submission?.score != null && (
                  <div className="rounded-xl bg-mint/20 p-3 text-sm">
                    <p className="font-semibold">{t('Note')} : {assignment.submission.score}/20</p>
                    {assignment.submission.feedback && <p className="mt-1">« {assignment.submission.feedback} »</p>}
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between gap-2">
                <HomeworkStatusBadge status={status} />
                {status !== 'REVIEWED' && (
                  <Button size="sm" variant={assignment.submission ? 'outline' : 'default'} onClick={() => setAnswering(assignment)}>
                    {assignment.submission ? t('Modifier ma copie') : t('Rendre le devoir')}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <SubmitDialog key={answering?.id ?? 'closed'} assignment={answering} onClose={() => setAnswering(null)} />
    </>
  )
}

function TeacherHomework() {
  const user = useCurrentUser()
  const [classroomId, setClassroomId] = useState<number>()
  const { data: classrooms = [] } = useQuery(classroomsQueryOptions)
  const { data: assignments = [] } = useQuery(assignmentsQueryOptions({ classroomId }))
  const [creating, setCreating] = useState(false)
  const [reviewing, setReviewing] = useState<Assignment | null>(null)
  const remove = useDeleteAssignment()

  return (
    <>
      <PageHeader title={t('Cahier de textes')} description={t('Publiez les devoirs, consultez et corrigez les copies rendues.')}
        actions={<Button onClick={() => setCreating(true)}><Plus /> {t('Nouveau devoir')}</Button>} />
      <NativeSelect aria-label={t('Filtrer par classe')} className="mb-4" value={classroomId ?? ''}
        onChange={(e) => setClassroomId(e.target.value ? Number(e.target.value) : undefined)}>
        <NativeSelectOption value="">{t('Toutes les classes')}</NativeSelectOption>
        {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
      </NativeSelect>
      {assignments.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title={t('Aucun devoir publié')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <AssignmentHeader assignment={assignment} />
              <CardContent><p className="line-clamp-3 text-sm text-muted-foreground">{assignment.description}</p></CardContent>
              <CardFooter className="justify-between gap-2">
                <Button size="sm" variant="outline" onClick={() => setReviewing(assignment)}>
                  <Inbox /> {t('{{count}} copies', { count: assignment.submissionCount })}
                </Button>
                {(user.role !== 'TEACHER' || assignment.teacherId === user.id) && (
                  <Button size="icon-sm" variant="ghost" aria-label={t('Supprimer « {{title}} »', { title: assignment.title })}
                    onClick={() => remove.mutate(assignment.id, { onSuccess: () => toast.success(t('Devoir supprimé')) })}>
                    <Trash2 />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <AssignmentFormDialog open={creating} onOpenChange={setCreating} />
      <SubmissionsSheet assignment={reviewing} onClose={() => setReviewing(null)} />
    </>
  )
}
