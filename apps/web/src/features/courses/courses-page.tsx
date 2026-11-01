import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Download, ExternalLink, FileText, Link2, Plus, Trash2, Video } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { t } from '@/i18n'
import { downloadFile } from '@/lib/files'
import { formatDate } from '@madrasti/shared/format'
import { SUBJECTS } from '@madrasti/shared/subjects'
import { STAFF_ROLES } from '@madrasti/shared/types'
import { type CourseResource, RESOURCE_KIND_LABELS, type ResourceKind, resourcesQueryOptions, useCreateResource, useDeleteResource } from '@madrasti/shared/features/courses/api'

const KIND_ICONS = { FILE: FileText, VIDEO: Video, LINK: Link2 } as const

export function CoursesPage() {
  const user = useCurrentUser()
  const isStaff = STAFF_ROLES.includes(user.role)
  const { data: resources } = useSuspenseQuery(resourcesQueryOptions)
  const [creating, setCreating] = useState(false)
  const remove = useDeleteResource()
  const subjects = [...new Set(resources.map((r) => r.subject))]

  return (
    <>
      <PageHeader title={t('Cours en ligne')} description={t('Supports de cours, vidéos et liens partagés par les enseignants.')}
        actions={isStaff && <Button onClick={() => setCreating(true)}><Plus /> {t('Nouveau support')}</Button>} />
      {resources.length === 0 && <EmptyState icon={FileText} title={t('Aucun support pour le moment')} />}
      <div className="space-y-8">
        {subjects.map((subject) => (
          <section key={subject}>
            <h2 className="mb-3 text-xl font-semibold">{subject}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resources.filter((r) => r.subject === subject).map((resource) => (
                <ResourceCard key={resource.id} resource={resource}
                  canDelete={isStaff && (user.role !== 'TEACHER' || resource.teacherId === user.id)}
                  onDelete={() => remove.mutate(resource.id, { onSuccess: () => toast.success(t('Support supprimé')) })} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <ResourceDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}

function ResourceCard({ resource, canDelete, onDelete }: { resource: CourseResource; canDelete: boolean; onDelete: () => void }) {
  const Icon = KIND_ICONS[resource.kind]
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Icon className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{resource.title}</p>
            <p className="text-xs text-muted-foreground">{resource.teacherName} · {resource.classroomName} · {formatDate(resource.createdAt)}</p>
          </div>
          <Badge variant="outline">{t(RESOURCE_KIND_LABELS[resource.kind])}</Badge>
        </div>
        {resource.description && <p className="text-sm text-muted-foreground">{resource.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {resource.kind === 'FILE' && resource.fileId ? (
            <Button size="sm" onClick={() => downloadFile(resource.fileId!, resource.fileName ?? resource.title)}><Download /> {t('Télécharger')}</Button>
          ) : (
            <Button size="sm" nativeButton={false} render={<a href={resource.url ?? '#'} target="_blank" rel="noreferrer" />}><ExternalLink /> {t('Ouvrir')}</Button>
          )}
          {canDelete && <Button size="icon-sm" variant="ghost" aria-label={t('Supprimer « {{title}} »', { title: resource.title })} onClick={onDelete}><Trash2 /></Button>}
        </div>
      </CardContent>
    </Card>
  )
}

function ResourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open })
  const create = useCreateResource()
  const [classroomId, setClassroomId] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<ResourceKind>('FILE')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File>()
  const ready = classroomId && title.trim() && (kind === 'FILE' ? !!file : url.startsWith('https://'))

  const submit = () =>
    create.mutate({ classroomId: Number(classroomId), subject, title: title.trim(), description: description.trim() || undefined, kind,
      url: kind === 'FILE' ? undefined : url.trim(), file: kind === 'FILE' ? file : undefined }, {
      onSuccess: () => {
        toast.success(t('Support publié — la classe est prévenue'))
        setTitle('')
        setDescription('')
        setUrl('')
        setFile(undefined)
        onOpenChange(false)
      },
      onError: (error) => toast.error(error.message),
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t('Nouveau support')}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="resource-classroom">{t('Classe')}</FieldLabel>
            <NativeSelect id="resource-classroom" className="w-full" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <NativeSelectOption value="">{t('Choisir…')}</NativeSelectOption>
              {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="resource-subject">{t('Matière')}</FieldLabel>
            <NativeSelect id="resource-subject" className="w-full" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => <NativeSelectOption key={s} value={s}>{s}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field className="sm:col-span-2"><FieldLabel htmlFor="resource-title">{t('Titre')}</FieldLabel><Input id="resource-title" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field className="sm:col-span-2"><FieldLabel htmlFor="resource-description">{t('Description')}</FieldLabel><Input id="resource-description" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Field>
            <FieldLabel htmlFor="resource-kind">{t('Type')}</FieldLabel>
            <NativeSelect id="resource-kind" className="w-full" value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
              {(Object.keys(RESOURCE_KIND_LABELS) as ResourceKind[]).map((k) => <NativeSelectOption key={k} value={k}>{t(RESOURCE_KIND_LABELS[k])}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          {kind === 'FILE' ? (
            <Field>
              <FieldLabel htmlFor="resource-file">{t('Fichier')}</FieldLabel>
              <Input id="resource-file" type="file" accept=".pdf,.docx,.pptx,image/*,audio/mpeg,video/mp4" onChange={(e) => setFile(e.target.files?.[0])} />
              <FieldDescription>{t('PDF, Word, PowerPoint, image, MP3 ou MP4 — 10 Mo maximum')}</FieldDescription>
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="resource-url">{t('Lien')}</FieldLabel>
              <Input id="resource-url" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" />
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button onClick={submit} disabled={!ready || create.isPending}>{t('Publier')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
