import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, BookOpenCheck, CalendarX2, CreditCard, FileBadge, FileText, Pencil, Send, Sparkles, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PaymentStatusBadge } from '@/components/shared/badges'
import { EmptyState } from '@/components/shared/empty-state'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AbsenceStatusBadge } from '@/features/attendance/absence-status-badge'
import type { Absence } from '@madrasti/shared/features/attendance/api'
import { JustifyDialog } from '@/features/attendance/justify-dialog'
import { RecordAbsenceDialog } from '@/features/attendance/record-absence-dialog'
import { BehaviorTimeline } from '@/features/behavior/behavior-timeline'
import { absencesQueryOptions } from '@madrasti/shared/features/attendance/queries'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { GradeForm } from '@/features/grades/grade-form'
import { HomeworkStatusBadge } from '@/features/homework/homework-status-badge'
import { assignmentsQueryOptions } from '@madrasti/shared/features/homework/queries'
import { homeworkStatus, todayIso } from '@madrasti/shared/features/homework/status'
import { studentGradesQueryOptions, useDeleteGrade } from '@madrasti/shared/features/grades/queries'
import { PAYMENT_METHOD_LABELS } from '@madrasti/shared/features/payments/api'
import { useStartCheckout } from '@/features/payments/checkout'
import { studentPaymentsQueryOptions } from '@madrasti/shared/features/payments/queries'
import { ApiError, apiBlob } from '@/lib/api-client'
import { saveBlob } from '@/lib/files'
import { formatCurrency, formatDate, initials, scoreOutOf20 } from '@madrasti/shared/format'
import { MANAGER_ROLES, STAFF_ROLES } from '@madrasti/shared/types'
import { studentQueryOptions } from '@madrasti/shared/features/students/queries'
import { StudentFormDialog } from './student-form-dialog'
import { t } from '@/i18n'

export function StudentDetailPage() {
  const { studentId } = useParams({ from: '/app/students/$studentId' })
  const user = useCurrentUser()
  const isStaff = STAFF_ROLES.includes(user.role)
  const { data: student } = useSuspenseQuery(studentQueryOptions(studentId))
  const [editing, setEditing] = useState(false)

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4" nativeButton={false}
        render={<Link to={isStaff ? '/students' : '/dashboard'} />}>
        <ArrowLeft className="rtl:-scale-x-100" /> {t('Retour')}
      </Button>

      <Card className="mb-6 overflow-hidden py-0">
        <div className="h-20 bg-gradient-to-r from-primary via-primary/80 to-coral" />
        <CardContent className="-mt-10 flex flex-col gap-4 pb-6 sm:flex-row sm:items-end">
          <Avatar className="size-20 ring-4 ring-card">
            <AvatarFallback className="bg-secondary text-2xl font-semibold text-primary">{initials(student.firstName, student.lastName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold">{student.firstName} {student.lastName}</h1>
            <p className="text-muted-foreground">
              {student.classroomName} · {student.schoolName} · Matricule {student.registrationNumber}
            </p>
            {isStaff && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('Espace élève')} : {student.accountEmail ?? t('aucun compte rattaché')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" nativeButton={false} render={<Link to="/students/$studentId/report-card" params={{ studentId }} />}>
              <FileText /> {t('Bulletin')}
            </Button>
            <Button variant="outline" onClick={() => downloadCertificate(studentId, student.lastName)}>
              <FileBadge /> {t('Attestation de scolarité')}
            </Button>
            {MANAGER_ROLES.includes(user.role) && (
              <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> {t('Modifier')}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades"><BookOpen /> {t('Notes')}</TabsTrigger>
          <TabsTrigger value="homework"><BookOpenCheck /> {t('Devoirs')}</TabsTrigger>
          <TabsTrigger value="absences"><CalendarX2 /> {t('Absences')}</TabsTrigger>
          <TabsTrigger value="behavior"><Sparkles /> {t('Comportement')}</TabsTrigger>
          <TabsTrigger value="payments"><Wallet /> {t('Paiements')}</TabsTrigger>
        </TabsList>
        <TabsContent value="grades" className="mt-4 space-y-4">
          {isStaff && <GradeForm studentId={studentId} />}
          <GradesTable studentId={studentId} canDelete={isStaff} />
        </TabsContent>
        <TabsContent value="homework" className="mt-4">
          <HomeworkList studentId={studentId} />
        </TabsContent>
        <TabsContent value="absences" className="mt-4">
          <AbsencesList studentId={studentId} canRecord={isStaff} canJustify={user.role === 'PARENT'} />
        </TabsContent>
        <TabsContent value="behavior" className="mt-4">
          <BehaviorTimeline studentId={studentId} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <PaymentsList studentId={studentId} canPayOnline={user.role === 'PARENT'} />
        </TabsContent>
      </Tabs>

      <StudentFormDialog open={editing} onOpenChange={setEditing} student={student} />
    </>
  )
}

function GradesTable({ studentId, canDelete }: { studentId: number; canDelete: boolean }) {
  const { data: grades = [] } = useQuery(studentGradesQueryOptions(studentId))
  const deleteGrade = useDeleteGrade(studentId)

  if (grades.length === 0) return <EmptyState icon={BookOpen} title={t('Aucune note pour le moment')} />

  const average = grades.reduce((sum, g) => sum + scoreOutOf20(g.score, g.maxScore), 0) / grades.length
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm text-muted-foreground">{t('{{count}} évaluations', { count: grades.length })}</span>
        <span className="text-sm">{t('Moyenne')} <strong className="font-heading text-lg">{average.toFixed(2)}</strong>/20</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="ps-4">{t('Matière')}</TableHead>
            <TableHead>{t('Évaluation')}</TableHead>
            <TableHead>{t('Trim.')}</TableHead>
            <TableHead className="text-end">{t('Note')}</TableHead>
            {canDelete && <TableHead className="w-10"><span className="sr-only">{t('Actions')}</span></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((grade) => {
            const on20 = scoreOutOf20(grade.score, grade.maxScore)
            return (
              <TableRow key={grade.id}>
                <TableCell className="ps-4 font-medium">{grade.subject}</TableCell>
                <TableCell className="text-muted-foreground">{grade.title}</TableCell>
                <TableCell>{grade.term}</TableCell>
                <TableCell className="text-end tabular-nums">
                  <span className={on20 < 10 ? 'font-semibold text-destructive' : 'font-semibold'}>{grade.score}</span>
                  <span className="text-muted-foreground">/{grade.maxScore}</span>
                </TableCell>
                {canDelete && (
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer la note')}
                      onClick={() => deleteGrade.mutate(grade.id, { onSuccess: () => toast.success(t('Note supprimée')) })}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

function HomeworkList({ studentId }: { studentId: number }) {
  const { data: assignments = [] } = useQuery(assignmentsQueryOptions({ studentId }))
  if (assignments.length === 0) return <EmptyState icon={BookOpenCheck} title={t('Aucun devoir')} />
  const today = todayIso()
  return (
    <Card className="py-2">
      <ul className="divide-y">
        {assignments.map((assignment) => (
          <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{assignment.title}</p>
              <p className="text-xs text-muted-foreground">{assignment.subject} · {t('pour le {{date}}', { date: formatDate(assignment.dueDate) })}</p>
            </div>
            <div className="flex items-center gap-3">
              {assignment.submission?.score != null && <span className="font-semibold">{assignment.submission.score}/20</span>}
              <HomeworkStatusBadge status={homeworkStatus(assignment, today)} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

async function downloadCertificate(studentId: number, lastName: string) {
  try {
    saveBlob(await apiBlob(`/students/${studentId}/certificate`), `attestation-scolarite-${lastName.toLowerCase()}.pdf`)
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue'))
  }
}

function AbsencesList({ studentId, canRecord, canJustify }: { studentId: number; canRecord: boolean; canJustify: boolean }) {
  const { data: absences = [] } = useQuery(absencesQueryOptions(studentId))
  const [recording, setRecording] = useState(false)
  const [justifying, setJustifying] = useState<Absence | null>(null)

  return (
    <div className="space-y-4">
      {canRecord && <Button onClick={() => setRecording(true)}>{t('Signaler une absence')}</Button>}
      {absences.length === 0 ? (
        <EmptyState icon={CalendarX2} title={t('Aucune absence 🎉')} />
      ) : (
        <Card className="py-2">
          <ul className="divide-y">
            {absences.map((absence) => (
              <li key={absence.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium">{formatDate(absence.day)}</span>
                <span className="text-muted-foreground">{absence.reason ?? absence.justificationNote ?? t('Sans motif')}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{absence.kind === 'LATE' ? t('Retard') : t('Absence')}</Badge>
                  <AbsenceStatusBadge absence={absence} />
                  {canJustify && !absence.justified && absence.justificationStatus !== 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => setJustifying(absence)}><Send /> {t('Justifier')}</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <RecordAbsenceDialog open={recording} onOpenChange={setRecording} studentId={studentId} />
      <JustifyDialog absence={justifying} onOpenChange={(open) => !open && setJustifying(null)} />
    </div>
  )
}

function PaymentsList({ studentId, canPayOnline }: { studentId: number; canPayOnline: boolean }) {
  const { data: payments = [] } = useQuery(studentPaymentsQueryOptions(studentId))
  const checkout = useStartCheckout()
  if (payments.length === 0) return <EmptyState icon={Wallet} title={t('Aucun paiement')} />
  return (
    <Card className="py-2">
      <ul className="divide-y">
        {payments.map((payment) => (
          <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{payment.label}</p>
              <p className="text-xs text-muted-foreground">
                {t('Échéance {{date}}', { date: formatDate(payment.dueDate) })}
                {payment.paidAt && ` · ${t('réglé le {{date}}', { date: formatDate(payment.paidAt) })} (${t(PAYMENT_METHOD_LABELS[payment.method!])})`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold tabular-nums">{formatCurrency(payment.amount)}</span>
              <PaymentStatusBadge status={payment.status} />
              {canPayOnline && payment.status !== 'PAID' && (
                <Button size="sm" disabled={checkout.isPending}
                  onClick={() => checkout.mutate(payment.id, { onError: (error) => toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue')) })}>
                  <CreditCard /> {t('Payer en ligne')}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
