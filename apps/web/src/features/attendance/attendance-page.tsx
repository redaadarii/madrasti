import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, FileCheck2, Paperclip, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@madrasti/shared/format'
import { downloadFile } from '@/lib/files'
import { AbsenceStatusBadge } from './absence-status-badge'
import { absencesQueryOptions, pendingJustificationsQueryOptions, useDeleteAbsence, useJustifyAbsence, useReviewJustification } from '@madrasti/shared/features/attendance/queries'
import { RecordAbsenceDialog } from './record-absence-dialog'
import { t } from '@/i18n'

export function AttendancePage() {
  const { data: absences } = useSuspenseQuery(absencesQueryOptions())
  const [recording, setRecording] = useState(false)
  const justify = useJustifyAbsence()
  const remove = useDeleteAbsence()

  return (
    <>
      <PageHeader title={t('Absences & retards')} description={t('Les 100 derniers signalements, toutes classes confondues.')}
        actions={<Button onClick={() => setRecording(true)}><Plus /> {t('Signaler')}</Button>} />
      <PendingJustifications />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="ps-4">{t('Élève')}</TableHead>
              <TableHead>{t('Classe')}</TableHead>
              <TableHead>{t('Date')}</TableHead>
              <TableHead>{t('Type')}</TableHead>
              <TableHead>{t('Statut')}</TableHead>
              <TableHead className="w-24"><span className="sr-only">{t('Actions')}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {absences.map((absence) => (
              <TableRow key={absence.id}>
                <TableCell className="ps-4">
                  <Link to="/students/$studentId" params={{ studentId: absence.studentId }} className="font-medium hover:underline">
                    {absence.studentName}
                  </Link>
                </TableCell>
                <TableCell>{absence.classroomName}</TableCell>
                <TableCell>{formatDate(absence.day)}</TableCell>
                <TableCell><Badge variant="outline">{absence.kind === 'LATE' ? t('Retard') : t('Absence')}</Badge></TableCell>
                <TableCell>
                  <AbsenceStatusBadge absence={absence} />
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  {!absence.justified && (
                    <Button variant="ghost" size="icon-sm" aria-label={t("Justifier l'absence de {{name}}", { name: absence.studentName })}
                      onClick={() => justify.mutate({ id: absence.id, reason: t('Justificatif reçu') }, { onSuccess: () => toast.success(t('Absence justifiée')) })}>
                      <Check />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" aria-label={t("Supprimer l'absence de {{name}}", { name: absence.studentName })}
                    onClick={() => remove.mutate(absence.id, { onSuccess: () => toast.success(t('Signalement supprimé')) })}>
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <RecordAbsenceDialog open={recording} onOpenChange={setRecording} />
    </>
  )
}

/** Justificatifs envoyés par les familles : l'école les accepte (absence justifiée) ou les refuse. */
function PendingJustifications() {
  const { data: pending = [] } = useQuery(pendingJustificationsQueryOptions)
  const review = useReviewJustification()
  if (pending.length === 0) return null

  const decide = (id: number, accepted: boolean) =>
    review.mutate({ id, accepted }, { onSuccess: () => toast.success(accepted ? t('Justificatif accepté') : t('Justificatif refusé')) })

  return (
    <Card className="mb-6 gap-0 border-sun/60 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-sun-foreground" /> {t('Justificatifs à valider')}
          <Badge className="border-0 bg-sun/40 text-sun-foreground">{pending.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {pending.map((absence) => (
          <div key={absence.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="min-w-48 flex-1">
              <p className="font-medium">{absence.studentName} <span className="font-normal text-muted-foreground">· {absence.classroomName}</span></p>
              <p className="text-xs text-muted-foreground">
                {absence.kind === 'LATE' ? t('Retard') : t('Absence')} · {formatDate(absence.day)}
              </p>
            </div>
            <p className="min-w-48 flex-[2] italic">« {absence.justificationNote} »</p>
            {absence.justificationFileId && (
              <Button variant="outline" size="sm" onClick={() => downloadFile(absence.justificationFileId!, absence.justificationFileName ?? 'justificatif')}>
                <Paperclip /> {absence.justificationFileName}
              </Button>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide(absence.id, true)} disabled={review.isPending}><Check /> {t('Accepter')}</Button>
              <Button size="sm" variant="outline" onClick={() => decide(absence.id, false)} disabled={review.isPending}><X /> {t('Refuser')}</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
