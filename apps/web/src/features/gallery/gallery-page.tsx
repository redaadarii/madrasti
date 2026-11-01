import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ImagePlus, Images, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AuthImage } from '@/components/shared/auth-image'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { t } from '@/i18n'
import { formatDate } from '@madrasti/shared/format'
import { MANAGER_ROLES, STAFF_ROLES } from '@madrasti/shared/types'
import { type Album, albumsQueryOptions, useCreateAlbum, useDeleteAlbum, useDeletePhoto, useUploadPhotos } from '@madrasti/shared/features/gallery/api'

export function GalleryPage() {
  const user = useCurrentUser()
  const canEdit = STAFF_ROLES.includes(user.role)
  const { data: albums } = useSuspenseQuery(albumsQueryOptions)
  const [openId, setOpenId] = useState<number>()
  const [creating, setCreating] = useState(false)
  const open = albums.find((a) => a.id === openId)

  return (
    <>
      <PageHeader title={t('Galerie photo')} description={t('Les moments forts de l\'école et des classes.')}
        actions={canEdit && <Button onClick={() => setCreating(true)}><Plus /> {t('Nouvel album')}</Button>} />
      {albums.length === 0 ? <EmptyState icon={Images} title={t('Aucun album')} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {albums.map((album) => (
            <Card key={album.id} className="group gap-0 overflow-hidden py-0">
              <button type="button" className="relative block aspect-[4/3] w-full overflow-hidden bg-muted" onClick={() => setOpenId(album.id)}
                aria-label={t('Ouvrir l\'album {{title}}', { title: album.title })}>
                {album.photos[0]
                  ? <AuthImage fileId={album.photos[0].fileId} alt="" className="size-full object-cover transition group-hover:scale-105" />
                  : <span className="grid size-full place-items-center text-muted-foreground"><Images className="size-10" /></span>}
                <Badge className="absolute end-3 top-3 border-0 bg-black/60 text-white">{t('{{count}} photos', { count: album.photos.length })}</Badge>
              </button>
              <CardContent className="py-4">
                <p className="font-heading text-lg font-semibold">{album.title}</p>
                <p className="text-xs text-muted-foreground">
                  {album.classroomName ? t('Classe {{name}}', { name: album.classroomName }) : t('Toute l\'école')} · {formatDate(album.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {open && <AlbumSheet album={open} canEdit={canEdit} canDelete={MANAGER_ROLES.includes(user.role)} onClose={() => setOpenId(undefined)} />}
      <NewAlbumDialog open={creating} onOpenChange={setCreating} onCreated={setOpenId} />
    </>
  )
}

function AlbumSheet({ album, canEdit, canDelete, onClose }: { album: Album; canEdit: boolean; canDelete: boolean; onClose: () => void }) {
  const upload = useUploadPhotos()
  const deletePhoto = useDeletePhoto()
  const deleteAlbum = useDeleteAlbum()
  const input = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState<number>()

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return
    upload.mutate({ albumId: album.id, files: [...files] }, {
      onSuccess: () => toast.success(t('{{count}} photos ajoutées', { count: files.length })),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Sheet open onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{album.title}</SheetTitle>
          <SheetDescription>{album.description ?? album.authorName}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden
                onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
              <Button onClick={() => input.current?.click()} disabled={upload.isPending}><ImagePlus /> {t('Ajouter des photos')}</Button>
              {canDelete && (
                <Button variant="outline" onClick={() => deleteAlbum.mutate(album.id, { onSuccess: () => { toast.success(t('Album supprimé')); onClose() } })}>
                  <Trash2 /> {t('Supprimer l\'album')}
                </Button>
              )}
            </div>
          )}
          {album.photos.length === 0 && <EmptyState icon={Images} title={t('Album vide')} />}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {album.photos.map((photo, index) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                <button type="button" className="size-full" onClick={() => setViewing(index)} aria-label={t('Agrandir la photo {{n}}', { n: index + 1 })}>
                  <AuthImage fileId={photo.fileId} alt={photo.caption ?? ''} className="size-full object-cover" />
                </button>
                {canEdit && (
                  <Button variant="secondary" size="icon-xs" className="absolute end-1.5 top-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={t('Supprimer la photo {{n}}', { n: index + 1 })} onClick={() => deletePhoto.mutate(photo.id)}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        {viewing !== undefined && album.photos[viewing] && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-4" role="dialog" aria-label={t('Visionneuse')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setViewing(undefined)
              if (e.key === 'ArrowRight') setViewing((v) => Math.min((v ?? 0) + 1, album.photos.length - 1))
              if (e.key === 'ArrowLeft') setViewing((v) => Math.max((v ?? 0) - 1, 0))
            }} tabIndex={-1} ref={(el) => el?.focus()}>
            <AuthImage fileId={album.photos[viewing].fileId} alt={album.photos[viewing].caption ?? ''} className="max-h-[85svh] max-w-full rounded-lg object-contain" />
            {album.photos[viewing].caption && <p className="mt-3 text-center text-sm text-white/80">{album.photos[viewing].caption}</p>}
            <Button variant="secondary" size="icon" className="absolute end-4 top-4" aria-label={t('Fermer')} onClick={() => setViewing(undefined)}><X /></Button>
            <Button variant="secondary" size="icon" className="absolute start-4 top-1/2" aria-label={t('Photo précédente')} disabled={viewing === 0}
              onClick={() => setViewing(viewing - 1)}><ChevronLeft className="rtl:-scale-x-100" /></Button>
            <Button variant="secondary" size="icon" className="absolute end-4 top-1/2" aria-label={t('Photo suivante')} disabled={viewing === album.photos.length - 1}
              onClick={() => setViewing(viewing + 1)}><ChevronRight className="rtl:-scale-x-100" /></Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function NewAlbumDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: number) => void }) {
  const { data: classrooms = [] } = useQuery({ ...classroomsQueryOptions, enabled: open })
  const create = useCreateAlbum()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [classroomId, setClassroomId] = useState('')

  const submit = () =>
    create.mutate({ title: title.trim(), description: description.trim() || undefined, classroomId: classroomId ? Number(classroomId) : undefined }, {
      onSuccess: (album) => {
        toast.success(t('Album créé'))
        setTitle('')
        setDescription('')
        onOpenChange(false)
        onCreated(album.id)
      },
      onError: (error) => toast.error(error.message),
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Nouvel album')}</DialogTitle>
          <DialogDescription>{t('Les familles concernées seront prévenues à l\'ajout des photos.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field><FieldLabel htmlFor="album-title">{t('Titre')}</FieldLabel><Input id="album-title" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field><FieldLabel htmlFor="album-description">{t('Description')}</FieldLabel><Input id="album-description" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Field>
            <FieldLabel htmlFor="album-classroom">{t('Concerne')}</FieldLabel>
            <NativeSelect id="album-classroom" className="w-full" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <NativeSelectOption value="">{t('Toute l\'école')}</NativeSelectOption>
              {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{t('Classe {{name}}', { name: c.name })}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button onClick={submit} disabled={!title.trim() || create.isPending}>{t('Créer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
