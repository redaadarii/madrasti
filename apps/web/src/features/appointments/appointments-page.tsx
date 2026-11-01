import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { CalendarClock, MapPin, Phone, Plus, Trash2, Users, Video, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { myChildrenQueryOptions } from '@madrasti/shared/features/students/queries'
import { t } from '@/i18n'
import { ApiError } from '@/lib/api-client'
import { dateFormat } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'
import {
  type AppointmentMode,
  groupByDay,
  MODE_LABELS,
  type Slot,
  slotsQueryOptions,
  useBookSlot,
  useCancelSlot,
  useDeleteSlot,
  usePublishSlots,
} from '@madrasti/shared/features/appointments/api'

const MODE_ICONS = { IN_PERSON: MapPin, VISIO: Video, PHONE: Phone } as const
const errorToast = (error: Error) => toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue'))
const time = (iso: string) => iso.slice(11, 16)
const dayLabel = (day: string) => {
  const label = dateFormat({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day}T12:00:00`))
  return label.charAt(0).toLocaleUpperCase() + label.slice(1)
}

export function AppointmentsPage() {
  const user = useCurrentUser()
  return user.role === 'PARENT' ? <ParentAppointments /> : <TeacherAppointments />
}

function ModeBadge({ slot }: { slot: Pick<Slot, 'mode' | 'location'> }) {
  const Icon = MODE_ICONS[slot.mode]
  return (
    <Badge variant="outline"><Icon /> {t(MODE_LABELS[slot.mode])}{slot.location && ` · ${slot.location}`}</Badge>
  )
}

/* ------------------------------------------------------------------ Enseignant / direction */

function TeacherAppointments() {
  const { data: slots } = useSuspenseQuery(slotsQueryOptions)
  const [publishing, setPublishing] = useState(false)
  const cancel = useCancelSlot()
  const remove = useDeleteSlot()
  const booked = slots.filter((s) => s.booked).length

  return (
    <>
      <PageHeader title={t('Rendez-vous parents')}
        description={t('{{booked}} rendez-vous réservés sur {{total}} créneaux à venir.', { booked, total: slots.length })}
        actions={<Button onClick={() => setPublishing(true)}><Plus /> {t('Ouvrir des créneaux')}</Button>} />
      {slots.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t('Aucun créneau à venir')}>{t('Ouvrez une série de créneaux : les familles les réservent depuis leur espace.')}</EmptyState>
      ) : (
        <div className="space-y-6">
          {groupByDay(slots).map(([day, list]) => (
            <Card key={day} className="gap-0 py-0">
              <CardHeader className="border-b py-3"><CardTitle>{dayLabel(day)}</CardTitle></CardHeader>
              <CardContent className="divide-y p-0">
                {list.map((slot) => (
                  <div key={slot.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="w-24 font-heading font-semibold tabular-nums">{time(slot.startsAt)} · {slot.durationMinutes}′</span>
                    <ModeBadge slot={slot} />
                    <div className="min-w-48 flex-1">
                      {slot.booked ? (
                        <>
                          <p className="font-medium">{slot.parentName} <span className="font-normal text-muted-foreground">· {slot.studentName} ({slot.classroomName})</span></p>
                          {slot.topic && <p className="text-muted-foreground">« {slot.topic} »</p>}
                        </>
                      ) : <span className="text-muted-foreground">{t('Libre')}</span>}
                    </div>
                    {slot.booked ? (
                      <Button variant="outline" size="sm" onClick={() => cancel.mutate(slot.id, { onSuccess: () => toast.success(t('Rendez-vous annulé, la famille est prévenue')) })}>
                        <X /> {t('Annuler le rendez-vous')}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer le créneau')}
                        onClick={() => remove.mutate(slot.id, { onError: errorToast })}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <PublishSlotsDialog open={publishing} onOpenChange={setPublishing} />
    </>
  )
}

function PublishSlotsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PublishSlotsForm onClose={() => onOpenChange(false)} />}
    </Dialog>
  )
}

const tomorrowIso = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

function PublishSlotsForm({ onClose }: { onClose: () => void }) {
  const [tomorrow] = useState(tomorrowIso)
  const [form, setForm] = useState({ date: tomorrow, startTime: '16:30', count: 6, durationMinutes: 15, mode: 'IN_PERSON' as AppointmentMode, location: '' })
  const publish = usePublishSlots()

  const end = (() => {
    const [h, m] = form.startTime.split(':').map(Number)
    const minutes = h * 60 + m + form.count * form.durationMinutes
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  })()

  const save = () =>
    publish.mutate({ ...form, location: form.location.trim() || undefined }, {
      onSuccess: (created) => { toast.success(t('{{count}} créneaux ouverts', { count: created.length })); onClose() },
      onError: errorToast,
    })

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('Ouvrir des créneaux')}</DialogTitle>
        <DialogDescription>{t('De {{start}} à {{end}}', { start: form.startTime, end })}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="slot-date">{t('Date')}</FieldLabel>
          <Input id="slot-date" type="date" min={tomorrow} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="slot-start">{t('Début')}</FieldLabel>
          <Input id="slot-start" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="slot-count">{t('Nombre de créneaux')}</FieldLabel>
          <Input id="slot-count" type="number" min={1} max={16} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="slot-duration">{t('Durée (minutes)')}</FieldLabel>
          <NativeSelect id="slot-duration" className="w-full" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}>
            {[10, 15, 20, 30, 45].map((d) => <NativeSelectOption key={d} value={d}>{d}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="slot-mode">{t('Modalité')}</FieldLabel>
          <NativeSelect id="slot-mode" className="w-full" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as AppointmentMode })}>
            {(Object.keys(MODE_LABELS) as AppointmentMode[]).map((m) => <NativeSelectOption key={m} value={m}>{t(MODE_LABELS[m])}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="slot-location">{t('Lieu (optionnel)')}</FieldLabel>
          <Input id="slot-location" value={form.location} maxLength={150} placeholder={t('Ex. : salle 12')} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
        <Button onClick={save} disabled={publish.isPending || form.count < 1}>{t('Publier')}</Button>
      </DialogFooter>
    </DialogContent>
  )
}

/* ------------------------------------------------------------------ Parent */

function ParentAppointments() {
  const { data: slots } = useSuspenseQuery(slotsQueryOptions)
  const [booking, setBooking] = useState<Slot>()
  const cancel = useCancelSlot()
  const mine = slots.filter((s) => s.mine)
  const free = slots.filter((s) => !s.booked)
  const teachers = [...new Map(free.map((s) => [s.teacherId, s.teacherName])).entries()]
  const [teacherId, setTeacherId] = useState<number>()
  const selectedTeacher = teacherId ?? teachers[0]?.[0]

  return (
    <>
      <PageHeader title={t('Rendez-vous')} description={t('Rencontrez les enseignants de vos enfants, sur place ou à distance.')} />
      {mine.length > 0 && (
        <Card className="mb-6 gap-0 border-primary/40 py-0">
          <CardHeader className="border-b py-3"><CardTitle>{t('Mes rendez-vous')}</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {mine.map((slot) => (
              <div key={slot.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-40 font-medium">{dayLabel(slot.startsAt.slice(0, 10))} · {time(slot.startsAt)}</span>
                <span className="flex-1">{slot.teacherName} <span className="text-muted-foreground">· {slot.studentName}</span></span>
                <ModeBadge slot={slot} />
                <Button variant="outline" size="sm" onClick={() => cancel.mutate(slot.id, { onSuccess: () => toast.success(t('Rendez-vous annulé')) })}>
                  <X /> {t('Annuler')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {teachers.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t('Aucun créneau disponible')}>{t('Les enseignants n\'ont pas encore ouvert de créneaux.')}</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t('Enseignant')}>
            {teachers.map(([id, name]) => (
              <Button key={id} role="tab" aria-selected={selectedTeacher === id} variant={selectedTeacher === id ? 'default' : 'outline'} size="sm"
                onClick={() => setTeacherId(id)}>
                <Users /> {name}
              </Button>
            ))}
          </div>
          <div className="space-y-4">
            {groupByDay(free.filter((s) => s.teacherId === selectedTeacher)).map(([day, list]) => (
              <Card key={day}>
                <CardHeader><CardTitle>{dayLabel(day)}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ModeBadge slot={list[0]} />
                  <div className="flex flex-wrap gap-2">
                    {list.map((slot) => (
                      <Button key={slot.id} variant="outline" className={cn('tabular-nums')} onClick={() => setBooking(slot)}>
                        {time(slot.startsAt)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      <BookDialog slot={booking} onClose={() => setBooking(undefined)} />
    </>
  )
}

function BookDialog({ slot, onClose }: { slot?: Slot; onClose: () => void }) {
  return (
    <Dialog open={!!slot} onOpenChange={(open) => !open && onClose()}>
      {slot && <BookForm key={slot.id} slot={slot} onClose={onClose} />}
    </Dialog>
  )
}

function BookForm({ slot, onClose }: { slot: Slot; onClose: () => void }) {
  const { data: children = [] } = useQuery(myChildrenQueryOptions)
  const [studentId, setStudentId] = useState<number>()
  const [topic, setTopic] = useState('')
  const book = useBookSlot()
  const child = studentId ?? children[0]?.id

  const confirm = () => {
    if (!child) return
    book.mutate({ id: slot.id, studentId: child, topic: topic.trim() || undefined }, {
      onSuccess: () => { toast.success(t('Rendez-vous confirmé')); onClose() },
      onError: (error) => { errorToast(error); onClose() },
    })
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('Réserver ce créneau')}</DialogTitle>
        <DialogDescription>
          {slot.teacherName} · {dayLabel(slot.startsAt.slice(0, 10))} · {time(slot.startsAt)} ({slot.durationMinutes} min)
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        {children.length > 1 && (
          <Field>
            <FieldLabel htmlFor="book-child">{t('Enfant concerné')}</FieldLabel>
            <NativeSelect id="book-child" className="w-full" value={child ?? ''} onChange={(e) => setStudentId(Number(e.target.value))}>
              {children.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.firstName} · {c.classroomName}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="book-topic">{t('Sujet (optionnel)')}</FieldLabel>
          <Input id="book-topic" value={topic} maxLength={300} placeholder={t('Ex. : progrès en mathématiques')} onChange={(e) => setTopic(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
        <Button onClick={confirm} disabled={!child || book.isPending}>{t('Confirmer')}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
