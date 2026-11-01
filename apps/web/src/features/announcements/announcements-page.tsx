import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Megaphone, Pin, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { EmptyState } from '@/components/shared/empty-state'
import { SelectField, TextAreaField, TextField } from '@/components/shared/form-fields'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { TranslateButton } from '@/features/translation/translate-button'
import { formatDate } from '@madrasti/shared/format'
import { handleFormError } from '@/lib/form'
import { STAFF_ROLES } from '@madrasti/shared/types'
import { type Audience, AUDIENCE_LABELS } from '@madrasti/shared/features/announcements/api'
import { announcementsQueryOptions, useDeleteAnnouncement, usePublishAnnouncement } from '@madrasti/shared/features/announcements/queries'
import { t } from '@/i18n'

const schema = z.object({
  title: z.string().trim().min(1, 'Titre requis').max(150),
  content: z.string().trim().min(1, 'Message requis'),
  audience: z.enum(['ALL', 'PARENTS', 'TEACHERS', 'STUDENTS']),
  pinned: z.boolean(),
})

export function AnnouncementsPage() {
  const user = useCurrentUser()
  const canPublish = STAFF_ROLES.includes(user.role)
  const { data: announcements } = useSuspenseQuery(announcementsQueryOptions())
  const remove = useDeleteAnnouncement()

  return (
    <>
      <PageHeader title={t('Annonces')} description={t('Les actualités de l\'école, ciblées par public.')} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {announcements.length === 0 && <EmptyState icon={Megaphone} title={t('Aucune annonce')} />}
          {announcements.map((a) => (
            <Card key={a.id} className={a.pinned ? 'ring-2 ring-coral/40' : undefined}>
              <CardHeader className="flex flex-row items-start gap-3">
                <Avatar><AvatarFallback className="bg-secondary text-primary">{a.authorName.split(' ').map((p) => p[0]).join('').slice(0, 2)}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {a.pinned && <Pin className="size-4 text-coral" aria-label={t('Épinglée')} />} {a.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{a.authorName} · {formatDate(a.createdAt)}</p>
                </div>
                <Badge variant="outline">{t(AUDIENCE_LABELS[a.audience])}</Badge>
                {canPublish && (user.role !== 'TEACHER' || a.authorId === user.id) && (
                  <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer « {{title}} »', { title: a.title })}
                    onClick={() => remove.mutate(a.id, { onSuccess: () => toast.success(t('Annonce supprimée')) })}>
                    <Trash2 />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed">{a.content}</p>
                <TranslateButton text={`${a.title}\n\n${a.content}`} className="mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
        {canPublish && <PublishCard />}
      </div>
    </>
  )
}

function PublishCard() {
  const publish = usePublishAnnouncement()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', content: '', audience: 'ALL', pinned: false },
  })

  const onSubmit = handleSubmit((input) =>
    publish.mutate(input, {
      onSuccess: () => { toast.success(t('Annonce publiée')); reset() },
      onError: (error) => handleFormError(error, setError),
    }),
  )

  return (
    <Card className="h-fit lg:sticky lg:top-24">
      <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="size-4 text-coral" /> {t('Nouvelle annonce')}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup className="gap-4">
            <TextField label={t('Titre')} registration={register('title')} error={errors.title} />
            <TextAreaField label={t('Message')} rows={5} registration={register('content')} error={errors.content} />
            <SelectField label={t('Destinataires')} registration={register('audience')}
              options={(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => ({ value: a, label: t(AUDIENCE_LABELS[a]) }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...register('pinned')} /> {t('Épingler en haut')}
            </label>
            <Button type="submit" disabled={publish.isPending}>{t('Publier')}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
