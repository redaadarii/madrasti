import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { MessageSquareText, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { t } from '@/i18n'
import { dateFormat } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'
import { SMS_AUDIENCE_LABELS, SMS_STATUS_LABELS, type SmsAudience, type SmsStatus, smsHistoryQueryOptions, smsSegments, useBroadcast } from '@madrasti/shared/features/sms/api'

const STATUS_TONES: Record<SmsStatus, string> = {
  SENT: 'bg-mint/30 text-mint-foreground',
  FAILED: 'bg-destructive/10 text-destructive',
  SKIPPED: 'bg-muted text-muted-foreground',
}
const MAX_LENGTH = 480

export function SmsPage() {
  const { data: history } = useSuspenseQuery(smsHistoryQueryOptions)
  const { data: classrooms = [] } = useQuery(classroomsQueryOptions)
  const broadcast = useBroadcast()
  const [audience, setAudience] = useState<SmsAudience>('CLASS_PARENTS')
  const [classroomId, setClassroomId] = useState('')
  const [message, setMessage] = useState('')
  const ready = message.trim() && (audience !== 'CLASS_PARENTS' || classroomId)
  const when = dateFormat({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const send = () =>
    broadcast.mutate({ audience, classroomId: classroomId ? Number(classroomId) : undefined, message: message.trim() }, {
      onSuccess: (result) => {
        toast.success(t('{{sent}} SMS envoyés, {{skipped}} sans numéro, {{failed}} en échec', { ...result }))
        setMessage('')
      },
      onError: (error) => toast.error(error.message),
    })

  return (
    <>
      <PageHeader title={t('SMS')} description={t('Envoyez une information urgente par SMS. Les absences sont signalées automatiquement aux parents.')} />
      <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><Send className="size-4 text-coral" /> {t('Nouvel envoi')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="sms-audience">{t('Destinataires')}</FieldLabel>
              <NativeSelect id="sms-audience" className="w-full" value={audience} onChange={(e) => setAudience(e.target.value as SmsAudience)}>
                {(Object.keys(SMS_AUDIENCE_LABELS) as SmsAudience[]).map((a) => <NativeSelectOption key={a} value={a}>{t(SMS_AUDIENCE_LABELS[a])}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            {audience === 'CLASS_PARENTS' && (
              <Field>
                <FieldLabel htmlFor="sms-classroom">{t('Classe')}</FieldLabel>
                <NativeSelect id="sms-classroom" className="w-full" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
                  <NativeSelectOption value="">{t('Choisir…')}</NativeSelectOption>
                  {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="sms-message">{t('Message')}</FieldLabel>
              <Textarea id="sms-message" rows={5} maxLength={MAX_LENGTH} value={message} onChange={(e) => setMessage(e.target.value)} />
              <FieldDescription>
                {t('{{length}}/{{max}} caractères · {{count}} SMS par destinataire', { length: message.length, max: MAX_LENGTH, count: smsSegments(message) })}
              </FieldDescription>
            </Field>
            <Button className="w-full" onClick={send} disabled={!ready || broadcast.isPending}><Send /> {t('Envoyer')}</Button>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4"><CardTitle>{t('Historique')}</CardTitle></CardHeader>
          {history.length === 0 ? (
            <div className="p-6"><EmptyState icon={MessageSquareText} title={t('Aucun SMS envoyé')} /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-4">{t('Destinataire')}</TableHead>
                  <TableHead>{t('Message')}</TableHead>
                  <TableHead>{t('Statut')}</TableHead>
                  <TableHead>{t('Date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((sms) => (
                  <TableRow key={sms.id}>
                    <TableCell className="ps-4">
                      <p className="font-medium">{sms.recipientName}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{sms.toPhone ?? '—'}</p>
                    </TableCell>
                    <TableCell className="max-w-sm"><p className="line-clamp-2 text-sm whitespace-normal">{sms.body}</p></TableCell>
                    <TableCell><Badge className={cn('border-0', STATUS_TONES[sms.status])}>{t(SMS_STATUS_LABELS[sms.status])}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{when.format(new Date(sms.createdAt))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
