import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { MessageSquareWarning, Plus, Reply } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { myChildrenQueryOptions } from '@madrasti/shared/features/students/queries'
import { formatDate } from '@madrasti/shared/format'
import { MANAGER_ROLES } from '@madrasti/shared/types'
import { cn } from '@/lib/utils'
import {
  CATEGORY_LABELS,
  type Complaint,
  type ComplaintCategory,
  type ComplaintStatus,
  complaintsQueryOptions,
  STATUS_LABELS,
  useCreateComplaint,
  useHandleComplaint,
} from '@madrasti/shared/features/complaints/api'
import { t } from '@/i18n'

const STATUS_TONES: Record<ComplaintStatus, string> = {
  OPEN: 'bg-coral/15 text-coral',
  IN_PROGRESS: 'bg-sun/40 text-sun-foreground',
  RESOLVED: 'bg-mint/30 text-mint-foreground',
}

export function ComplaintsPage() {
  const user = useCurrentUser()
  const isManager = MANAGER_ROLES.includes(user.role)
  const { data: complaints } = useSuspenseQuery(complaintsQueryOptions)
  const [filter, setFilter] = useState<ComplaintStatus | 'ALL'>('ALL')
  const [creating, setCreating] = useState(false)
  const [handling, setHandling] = useState<Complaint | null>(null)
  const visible = filter === 'ALL' ? complaints : complaints.filter((c) => c.status === filter)

  return (
    <>
      <PageHeader title={t('Réclamations')}
        description={isManager ? t('Suivez et répondez aux demandes des familles.') : t("Signalez un problème à l'administration et suivez son traitement.")}
        actions={!isManager && <Button onClick={() => setCreating(true)}><Plus /> {t('Nouvelle réclamation')}</Button>} />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as ComplaintStatus | 'ALL')} className="mb-4">
        <TabsList>
          <TabsTrigger value="ALL">{t('Toutes')}</TabsTrigger>
          {(Object.keys(STATUS_LABELS) as ComplaintStatus[]).map((s) => (
            <TabsTrigger key={s} value={s}>{t(STATUS_LABELS[s])} ({complaints.filter((c) => c.status === s).length})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {visible.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title={t('Aucune réclamation')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((complaint) => (
            <Card key={complaint.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border-0', STATUS_TONES[complaint.status])}>{t(STATUS_LABELS[complaint.status])}</Badge>
                  <Badge variant="outline">{t(CATEGORY_LABELS[complaint.category])}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(complaint.createdAt)}</span>
                </div>
                <CardTitle className="mt-2 text-lg">{complaint.subject}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {complaint.authorName}{complaint.studentName && ` · ${t('concernant {{name}}', { name: complaint.studentName })}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-line">{complaint.body}</p>
                {complaint.response && (
                  <div className="rounded-xl bg-secondary/60 p-3 text-sm">
                    <p className="text-xs font-semibold text-secondary-foreground">{t('Réponse de l\'administration')}</p>
                    <p className="mt-1 whitespace-pre-line">{complaint.response}</p>
                  </div>
                )}
                {isManager && (
                  <Button size="sm" variant="outline" onClick={() => setHandling(complaint)}><Reply /> {t('Traiter')}</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <NewComplaintDialog open={creating} onOpenChange={setCreating} />
      <HandleDialog key={handling?.id ?? 'none'} complaint={handling} onClose={() => setHandling(null)} />
    </>
  )
}

function NewComplaintDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const user = useCurrentUser()
  const { data: children = [] } = useQuery({ ...myChildrenQueryOptions, enabled: open && user.role === 'PARENT' })
  const create = useCreateComplaint()
  const [category, setCategory] = useState<ComplaintCategory>('PEDAGOGY')
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const submit = () =>
    create.mutate({ category, subject: subject.trim(), body: body.trim(), studentId: studentId ? Number(studentId) : undefined }, {
      onSuccess: () => {
        toast.success(t("Réclamation envoyée à l'administration"))
        setSubject('')
        setBody('')
        onOpenChange(false)
      },
      onError: (error) => toast.error(error.message),
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('Nouvelle réclamation')}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="complaint-category">{t('Catégorie')}</FieldLabel>
            <NativeSelect id="complaint-category" className="w-full" value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}>
              {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((c) => <NativeSelectOption key={c} value={c}>{t(CATEGORY_LABELS[c])}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          {children.length > 0 && (
            <Field>
              <FieldLabel htmlFor="complaint-student">{t('Enfant concerné')}</FieldLabel>
              <NativeSelect id="complaint-student" className="w-full" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <NativeSelectOption value="">{t('— Aucun en particulier —')}</NativeSelectOption>
                {children.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.firstName}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          )}
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="complaint-subject">{t('Objet')}</FieldLabel>
            <Input id="complaint-subject" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="complaint-body">{t('Description')}</FieldLabel>
            <Textarea id="complaint-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button onClick={submit} disabled={!subject.trim() || !body.trim() || create.isPending}>{t('Envoyer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HandleDialog({ complaint, onClose }: { complaint: Complaint | null; onClose: () => void }) {
  const handle = useHandleComplaint()
  const [status, setStatus] = useState<ComplaintStatus>(complaint?.status === 'OPEN' ? 'IN_PROGRESS' : complaint?.status ?? 'IN_PROGRESS')
  const [response, setResponse] = useState(complaint?.response ?? '')

  const save = () => {
    if (!complaint) return
    handle.mutate({ id: complaint.id, status, response: response.trim() || undefined }, {
      onSuccess: () => { toast.success(t('Réclamation mise à jour')); onClose() },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Dialog open={!!complaint} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{complaint?.subject}</DialogTitle></DialogHeader>
        <p className="rounded-xl bg-muted p-3 text-sm whitespace-pre-line">{complaint?.body}</p>
        <Field>
          <FieldLabel htmlFor="complaint-status">{t('Statut')}</FieldLabel>
          <NativeSelect id="complaint-status" className="w-full" value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus)}>
            {(Object.keys(STATUS_LABELS) as ComplaintStatus[]).map((s) => <NativeSelectOption key={s} value={s}>{t(STATUS_LABELS[s])}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="complaint-response">{t('Réponse à la famille')}</FieldLabel>
          <Textarea id="complaint-response" rows={4} value={response} onChange={(e) => setResponse(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
          <Button onClick={save} disabled={handle.isPending}>{t('Enregistrer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
